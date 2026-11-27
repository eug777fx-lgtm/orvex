#!/usr/bin/env node
// Lithos Ultra — PreToolUse safety guard.
//
// Contract: this hook can only make Claude Code MORE careful. It never returns
// an approving decision, so it can never skip a permission prompt or bypass a
// permission rule.
//   - "deny" : catastrophic, never-legitimate commands (e.g. rm -rf / or ~)
//   - "ask"  : outward-facing / irreversible / secret-touching actions → user must confirm
//   - silent : everything else falls through to the normal permission system
// Patterns are heuristics; they reduce risk, they are not a sandbox.
//
// How Bash commands are checked:
//   1. The command is lexed shell-style (quotes, escapes, comments, heredocs) and
//      split into segments on ; && || | & newlines and ( ). The contents of
//      $(...), <(...) and backticks become extra segments; `bash -c '...'`,
//      `eval ...` and `env -S '...'` are checked recursively.
//   2. Per segment, leading VAR=value assignments and wrappers (sudo, env,
//      nohup, timeout, xargs, npx, pnpm dlx, ...) are skipped to find the real
//      binary; global options between the binary and its verb are skipped
//      (git -C dir push, kubectl --context x apply, helm -n ns upgrade, ...).
//   3. Structural rules (push/publish/deploy/...) look at whole tokens, so a
//      quoted string like `git commit -m "fix git push docs"` never matches.
//   4. Content rules (SQL, production targets, messaging hosts) look at the raw
//      text, including quoted arguments, because that is where SQL lives.

import fs from 'node:fs';

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (!input || typeof input !== 'object') process.exit(0);
const tool = String(input.tool_name || '');
const ti = (input.tool_input && typeof input.tool_input === 'object') ? input.tool_input : {};

const ASK = new Set();
const DENY = new Set();
const MAX_DEPTH = 6;

// ---------------------------------------------------------------- lexer
// Returns segments: { raw, words: string[], redirs: [{op, target}], heredocs: string[] }
function lex(src, depth, extra) {
  const segs = [];
  let seg = { start: 0, words: [], redirs: [], heredocs: [] };
  let tok = null;
  let pendingRedir = null;
  let pendingHeredocs = [];
  let i = 0;
  const n = src.length;

  const add = (s) => { if (tok === null) tok = ''; tok += s; };
  const pushTok = () => {
    if (tok === null) return;
    if (pendingRedir) {
      seg.redirs.push({ op: pendingRedir, target: tok });
      if (pendingRedir === '<<' || pendingRedir === '<<-') pendingHeredocs.push({ delim: tok, strip: pendingRedir === '<<-', seg });
      pendingRedir = null;
    } else seg.words.push(tok);
    tok = null;
  };
  const endSeg = (end) => {
    pushTok();
    seg.raw = src.slice(seg.start, end);
    if (seg.words.length || seg.redirs.length) segs.push(seg);
    seg = { start: end, words: [], redirs: [], heredocs: [] };
  };
  // Find the index of the matching close paren for an opener at `from` (src[from-1] === '(').
  const matchParen = (from) => {
    let d = 1, j = from;
    while (j < n) {
      const c = src[j];
      if (c === '\\') { j += 2; continue; }
      if (c === "'") { const k = src.indexOf("'", j + 1); j = k < 0 ? n : k + 1; continue; }
      if (c === '"') { j++; while (j < n && src[j] !== '"') { if (src[j] === '\\') j++; j++; } j++; continue; }
      if (c === '(') d++;
      else if (c === ')') { d--; if (d === 0) return j; }
      j++;
    }
    return n;
  };
  const subst = (inner) => { if (depth < MAX_DEPTH) extra.push(inner); };

  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r') { pushTok(); i++; continue; }
    if (c === '\n') {
      endSeg(i);
      i++;
      // Skip heredoc bodies, attaching them to the segment that opened them.
      for (const h of pendingHeredocs) {
        const lines = [];
        while (i < n) {
          let e = src.indexOf('\n', i); if (e < 0) e = n;
          const line = src.slice(i, e);
          i = Math.min(e + 1, n);
          if ((h.strip ? line.replace(/^\t+/, '') : line) === h.delim) break;
          lines.push(line);
        }
        h.seg.heredocs.push(lines.join('\n'));
      }
      pendingHeredocs = [];
      seg.start = i;
      continue;
    }
    if (c === ';' || c === '|' || c === '&' || c === '(' || c === ')') {
      if (c === '&' && src[i + 1] === '>') { // &> / &>> redirect
        pushTok(); i += src[i + 2] === '>' ? 3 : 2; pendingRedir = '>'; continue;
      }
      endSeg(i);
      i += ((c === '&' || c === '|' || c === ';') && (src[i + 1] === c || (c === '|' && src[i + 1] === '&'))) ? 2 : 1;
      seg.start = i;
      continue;
    }
    if (c === '<' || c === '>') {
      if (src[i + 1] === '(') { // process substitution
        const e = matchParen(i + 2); subst(src.slice(i + 2, e)); add(''); i = e + 1; continue;
      }
      if (tok !== null && /^\d+$/.test(tok)) tok = null; else pushTok();
      let op = c; i++;
      if (c === '<' && src[i] === '<') { op = '<<'; i++; if (src[i] === '<') { op = '<<<'; i++; } else if (src[i] === '-') { op = '<<-'; i++; } }
      else if (c === '>' && (src[i] === '>' || src[i] === '|')) i++;
      else if (c === '<' && src[i] === '>') i++;
      if (c === '>' && src[i] === '&') { i++; while (i < n && /[\d-]/.test(src[i])) i++; continue; }
      if (c === '<' && src[i] === '&') { i++; while (i < n && /[\d-]/.test(src[i])) i++; continue; }
      pendingRedir = op === '<<' || op === '<<-' ? op : (op === '<<<' ? '<<<' : c);
      continue;
    }
    if (c === '#' && tok === null) { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\\') {
      if (src[i + 1] === '\n') { i += 2; continue; }
      if (i + 1 < n) add(src[i + 1]);
      i += 2; continue;
    }
    if (c === "'") {
      const e = src.indexOf("'", i + 1);
      const end = e < 0 ? n : e;
      add(src.slice(i + 1, end)); i = end + 1; continue;
    }
    if (c === '"') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '"') {
        const d = src[j];
        if (d === '\\' && j + 1 < n) { const nx = src[j + 1]; s += '"\\$`\n'.includes(nx) ? (nx === '\n' ? '' : nx) : d + nx; j += 2; continue; }
        if (d === '$' && src[j + 1] === '(') { const e = matchParen(j + 2); subst(src.slice(j + 2, e)); j = e + 1; continue; }
        if (d === '`') { let k = j + 1; while (k < n && src[k] !== '`') { if (src[k] === '\\') k++; k++; } subst(src.slice(j + 1, k)); j = k + 1; continue; }
        s += d; j++;
      }
      add(s); i = j + 1; continue;
    }
    if (c === '$' && src[i + 1] === '(') { const e = matchParen(i + 2); subst(src.slice(i + 2, e)); add(''); i = e + 1; continue; }
    if (c === '$' && src[i + 1] === "'") { // ANSI-C quoting
      let j = i + 2, s = '';
      while (j < n && src[j] !== "'") { if (src[j] === '\\' && j + 1 < n) { s += src[j + 1]; j += 2; continue; } s += src[j]; j++; }
      add(s); i = j + 1; continue;
    }
    if (c === '`') {
      let k = i + 1; while (k < n && src[k] !== '`') { if (src[k] === '\\') k++; k++; }
      subst(src.slice(i + 1, k)); add(''); i = k + 1; continue;
    }
    add(c); i++;
  }
  endSeg(n);
  return segs;
}

// ---------------------------------------------------------------- helpers
const base = (t) => String(t).replace(/^.*\//, '') || String(t);
const ASSIGN = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'fish']);
const TEXT_ONLY = new Set(['echo', 'printf', 'git', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'ls', 'cat', 'bat', 'less', 'more', 'man', 'head', 'tail', 'wc', 'sort', 'uniq', 'sed', 'awk', 'tr', 'cut', 'diff', 'find', 'fd', 'true', ':']);
const SQL_BINS = new Set(['psql', 'mysql', 'mariadb', 'sqlite3', 'sqlcmd', 'clickhouse-client', 'clickhouse', 'duckdb', 'cockroach', 'cqlsh', 'snowsql', 'pgcli', 'mycli', 'litecli', 'usql']);
const DB_BINS = new Set([...SQL_BINS, 'mongosh', 'mongo', 'redis-cli', 'prisma', 'knex', 'drizzle-kit', 'drizzle', 'sqlx', 'migrate', 'pg_dump', 'pg_restore', 'pg_dumpall', 'mysqldump', 'mongodump', 'mongorestore', 'sequelize', 'sequelize-cli', 'alembic', 'atlas', 'flyway', 'liquibase', 'dbmate', 'goose', 'typeorm', 'mikro-orm']);
const PROD = /(^|[^a-z0-9])(prod|production|live)([^a-z0-9]|$)/i;
const LIVE_HOSTS = /(graph\.facebook\.com|api\.whatsapp\.com|api\.twilio\.com|api\.stripe\.com|api\.sendgrid\.com|api\.mailgun\.net|hooks\.slack\.com|slack\.com\/api|discord(app)?\.com\/api\/webhooks|api\.resend\.com|api\.postmarkapp\.com|api\.telegram\.org|api(-m)?\.paypal\.com)/i;

// Secret-bearing file names, matched as a whole final path component (or known dir/file pair).
const SECRET_PATH = /(^|\/)(\.env(\.[\w.-]+)?|\.envrc|[^/]+\.(key|pem|p12|pfx)|id_(rsa|ed25519|ecdsa|dsa)|\.aws\/credentials|\.netrc|\.git-credentials|\.docker\/config\.json|\.kube\/config|credentials\.json|secrets?\.(json|ya?ml|toml)|\.npmrc|\.pypirc|proc\/[^/]+\/environ)$/;
const SAFE_ENV_TEMPLATE = /(^|\/)\.env(\.[\w.-]+)?\.(example|sample|template)$/;
const isSecretPath = (p) => { const s = String(p || ''); return SECRET_PATH.test(s) && !SAFE_ENV_TEMPLATE.test(s); };

const READERS = new Set(['cat', 'less', 'more', 'head', 'tail', 'bat', 'batcat', 'grep', 'egrep', 'fgrep', 'rg', 'ag', 'sed', 'awk', 'gawk', 'cp', 'scp', 'rsync', 'base64', 'xxd', 'od', 'hexdump', 'strings', 'tac', 'nl', 'source', '.', 'node', 'python', 'python3', 'ruby', 'perl', 'deno', 'bun', 'jq', 'yq', 'diff', 'curl', 'wget', 'http', 'https', 'xh', 'nc', 'openssl', 'gpg', 'zip', 'tar', 'vi', 'vim', 'nvim', 'nano', 'code', 'view']);
const GREP_VAL = new Set(['-A', '-B', '-C', '-m', '-d', '-D', '--context', '--max-count', '-g', '--glob', '-t', '--type', '-T', '--type-not', '-M', '-j', '--max-depth']);

const GLOBAL_VAL = {
  git: ['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--super-prefix', '--config-env'],
  kubectl: ['-n', '--namespace', '--context', '--kubeconfig', '--cluster', '--user', '-s', '--server', '--token', '--as', '--as-group', '--certificate-authority', '--client-certificate', '--client-key', '--request-timeout'],
  helm: ['-n', '--namespace', '--kube-context', '--kubeconfig', '--kube-apiserver', '--kube-token', '--kube-as-user', '--registry-config', '--repository-config', '--repository-cache'],
  npm: ['--workspace', '-w', '--prefix', '--registry', '--userconfig', '--loglevel', '--cache'],
  pnpm: ['--filter', '-F', '-C', '--dir', '--workspace-dir', '--loglevel'],
  yarn: ['--cwd'],
  bun: ['--cwd', '-c', '--config'],
  docker: ['-H', '--host', '--context', '-c', '--config', '-l', '--log-level', '--tlscacert', '--tlscert', '--tlskey'],
  podman: ['--connection', '-c', '--url', '--root', '--runroot'],
  gh: ['-R', '--repo'],
  aws: ['--profile', '--region', '--output', '--endpoint-url', '--query', '--cli-read-timeout', '--cli-connect-timeout', '--color', '--ca-bundle'],
  gcloud: ['--project', '--account', '--configuration', '--verbosity', '--format', '--impersonate-service-account', '--billing-project'],
  az: ['--subscription', '--output', '-o', '--query'],
  doctl: ['--context', '-t', '--access-token', '-o', '--output', '--config', '-c'],
  vercel: ['--token', '-t', '--scope', '-S', '--cwd', '-A', '--local-config', '-Q', '--global-config'],
  netlify: ['--auth', '--cwd'],
  wrangler: ['-c', '--config', '-e', '--env'],
  firebase: ['-P', '--project', '--token', '--config'],
  fly: ['-a', '--app', '-c', '--config', '-t', '--access-token'],
  heroku: [],
  terraform: [], tofu: [], pulumi: ['-C', '--cwd', '-s', '--stack'],
  supabase: ['--workdir', '--profile'],
};
GLOBAL_VAL.flyctl = GLOBAL_VAL.fly;
GLOBAL_VAL['netlify-cli'] = GLOBAL_VAL.netlify;

function afterGlobals(bin, args) {
  const vals = GLOBAL_VAL[bin] || [];
  let i = 0;
  while (i < args.length && args[i].startsWith('-') && args[i] !== '-') {
    const t = args[i];
    if (t === '--') { i++; break; }
    i += (!t.includes('=') && vals.includes(t)) ? 2 : 1;
  }
  if (bin === 'cargo') while (i < args.length && args[i].startsWith('+')) i++;
  return args.slice(i);
}

// Skip assignments and wrapper commands to find the real command.
// Returns { words } or { envDump: true } or null.
function stripPrefix(w, depth) {
  let i = 0;
  for (let guard = 0; guard < 30; guard++) {
    while (i < w.length && ASSIGN.test(w[i])) i++;
    if (i >= w.length) return null;
    const b = base(w[i]);
    const skipOpts = (valRe) => { while (i < w.length && w[i].startsWith('-') && w[i] !== '-') { if (w[i] === '--') { i++; break; } if (valRe && valRe.test(w[i])) i++; i++; } };
    if (b === 'sudo' || b === 'doas') { i++; skipOpts(/^(-[ugCDhpRrTU]|--user|--group|--chdir|--prompt)$/); continue; }
    if (['command', 'builtin', 'exec', 'nohup', 'time', 'stdbuf', 'unbuffer', 'chronic', 'caffeinate', 'nocorrect', 'noglob'].includes(b)) { i++; skipOpts(/^-a$/); continue; }
    if (b === 'nice' || b === 'ionice' || b === 'chrt' || b === 'taskset') { i++; skipOpts(/^-(n|c)$/); continue; }
    if (b === 'timeout' || b === 'gtimeout') { i++; skipOpts(/^(-s|-k|--signal|--kill-after)$/); i++; continue; }
    if (b === 'xargs') { i++; skipOpts(/^-[IdEeLnPsa]$/); continue; }
    if (b === 'watch') { i++; skipOpts(/^-(n|d)$/); continue; }
    if (b === 'env') {
      i++;
      while (i < w.length) {
        const t = w[i];
        if (t === '--') { i++; continue; }
        if (t === '-S' || t === '--split-string') { if (w[i + 1]) checkCommand(w[i + 1], depth + 1); i += 2; continue; }
        if (/^(-u|-C|--unset|--chdir)$/.test(t)) { i += 2; continue; }
        if (t.startsWith('-') || ASSIGN.test(t)) { i++; continue; }
        break;
      }
      if (i >= w.length) return { envDump: true };
      continue;
    }
    if (b === 'cross-env' || b === 'cross-env-shell') { i++; continue; }
    if (b === 'dotenv' || b === 'dotenvx') { i++; if (w[i] === 'run') i++; skipOpts(/^(-e|-c|-v|-f|--env-file)$/); continue; }
    if (b === 'npx' || b === 'bunx' || b === 'uvx' || b === 'pipx') { i++; if (b === 'pipx' && w[i] === 'run') i++; skipOpts(/^(-p|--package|-c|--call)$/); continue; }
    if (['pnpm', 'yarn', 'npm', 'bun'].includes(b) && ['dlx', 'exec', 'x'].includes(w[i + 1])) { i += 2; skipOpts(/^(-p|--package|-c|--call)$/); continue; }
    if ((b === 'uv' || b === 'poetry' || b === 'pdm' || b === 'pipenv') && w[i + 1] === 'run') { i += 2; skipOpts(/^(--with|-p|--python|--project|--directory)$/); continue; }
    if (b === 'bundle' && w[i + 1] === 'exec') { i += 2; continue; }
    return { words: w.slice(i) };
  }
  return null;
}

// ---------------------------------------------------------------- rules
const READ_ONLY_VERB = /^(describe|list|get|show|ls|help|version)(-|$)/;
const SECRET_READ_VERB = /^(get-secret-value|get-parameters?|get-parameters-by-path|get-login-password|get-session-token|get-authorization-token|get-access-key-info)$/;
const MUTATING_VERB = /^(create|delete|deploy|update|set|unset|rm|cp|mv|add|remove|start|stop|restart|apply|run|ssh|scp|sync|put|import|export|patch|reset|resize|attach|detach|enable|disable|login|logout|activate|revoke|submit|upload|purge|destroy|scale|exec|invoke|call|publish|access|print-access-token|print-identity-token|replace|promote|rollback)(-|$)/;

function cloudReadOnly(bin, pos) {
  if (pos.length === 0) return true; // only flags, e.g. aws --version / --help
  if (pos[0] === 'help' || pos[0] === 'version') return true;
  const isRO = (t) => READ_ONLY_VERB.test(t) && !SECRET_READ_VERB.test(t);
  if (bin === 'aws') return pos[1] !== undefined && isRO(pos[1]);
  for (let k = 1; k <= 3 && k < pos.length; k++) {
    if (isRO(pos[k])) return true;
    if (MUTATING_VERB.test(pos[k])) return false;
  }
  return false;
}

function secretCandidates(bin, args) {
  let list = args;
  if (['grep', 'egrep', 'fgrep', 'rg', 'ag'].includes(bin)) {
    const hasE = args.some((a) => /^(-e|-f|--regexp|--file)(=|$)/.test(a) || /^-e./.test(a));
    const out = []; let droppedPattern = hasE;
    for (let k = 0; k < args.length; k++) {
      const a = args[k];
      if (a === '-e' || a === '--regexp') { k++; continue; }
      if (GREP_VAL.has(a)) { k++; continue; }
      if (a.startsWith('-')) continue;
      if (!droppedPattern) { droppedPattern = true; continue; }
      out.push(a);
    }
    list = out;
  }
  const pieces = [];
  for (const a of list) for (const p of String(a).split(/[\s"'=<>|;&(),@:`]+/)) if (p) pieces.push(p);
  return pieces;
}

function checkSegment(seg, depth) {
  // Input redirection from a secret file, whatever the command.
  for (const r of seg.redirs) if (r.op === '<' && isSecretPath(r.target)) ASK.add('Reads a secret-bearing file');

  const sp = stripPrefix(seg.words, depth);
  if (!sp) return;
  if (sp.envDump) { ASK.add('Dumps environment variables (may contain secrets)'); return; }
  const words = sp.words;
  const bin = base(words[0]);
  const args = words.slice(1);
  const rest = afterGlobals(bin, args);
  const verb = rest[0] || '';
  const pos = rest.filter((t) => !t.startsWith('-'));
  const has = (...flags) => args.some((a) => flags.includes(a) || flags.some((f) => f.startsWith('--') && a.startsWith(f + '=')));
  const raw = seg.raw || '';

  // nested shells
  if (SHELLS.has(bin)) {
    const ci = args.findIndex((a) => /^-[a-zA-Z]*c[a-zA-Z]*$/.test(a));
    if (ci >= 0 && args[ci + 1] !== undefined) checkCommand(args[ci + 1], depth + 1);
    else if (args.length === 0 || args.every((a) => a.startsWith('-'))) {
      for (const h of seg.heredocs) checkCommand(h, depth + 1);
      for (const r of seg.redirs) if (r.op === '<<<') checkCommand(r.target, depth + 1);
    }
  }
  if (bin === 'eval') checkCommand(args.join(' '), depth + 1);

  // catastrophic deletes
  if (bin === 'rm') {
    let flagged = false; const targets = []; let endOpts = false;
    for (const a of args) {
      if (!endOpts && a === '--') { endOpts = true; continue; }
      if (!endOpts && a.startsWith('-') && a !== '-') {
        if (/^-[a-zA-Z]*[rRf]/.test(a) || ['--recursive', '--force', '--no-preserve-root'].includes(a)) flagged = true;
        continue;
      }
      targets.push(a.replace(/\/{2,}/g, '/'));
    }
    const DANGER = new Set(['/', '/*', '/.', '~', '~/', '~/*', '~/.', '$HOME', '${HOME}', '$HOME/', '${HOME}/', '$HOME/*', '${HOME}/*', '$HOME/.', '${HOME}/.']);
    if (flagged && targets.some((t) => DANGER.has(t))) DENY.add('Recursive delete of / or home directory');
  }

  // env dumps
  if (bin === 'printenv') {
    const names = args.filter((a) => !a.startsWith('-'));
    if (names.length === 0 || names.some((a) => /KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL/i.test(a))) ASK.add('Dumps environment variables (may contain secrets)');
  }
  if (bin === 'export' && (args.length === 0 || (args.length === 1 && args[0] === '-p'))) ASK.add('Dumps environment variables (may contain secrets)');

  // git
  if (bin === 'git') {
    if (verb === 'push') ASK.add('git push sends code to a remote');
    if (verb === 'remote' && ['add', 'set-url'].includes(pos[1])) ASK.add('Changes git remotes');
    if (verb === 'reset' && has('--hard')) ASK.add('Discards work irreversibly');
    if (verb === 'clean' && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === '--force')) ASK.add('Discards work irreversibly');
    if (args.some((a) => /core\.hookspath/i.test(a))) ASK.add('Skips or rewires git hooks');
    if (args.some((a) => /http\.sslverify(=|$)/i.test(a)) && args.some((a) => /(^|=)(false|0|no|off)$/i.test(a))) ASK.add('Disables TLS verification');
  }
  if ((bin === 'git' || !TEXT_ONLY.has(bin)) && args.includes('--no-verify')) ASK.add('Skips or rewires git hooks');

  // GitHub
  if (bin === 'gh') {
    const [a0, a1] = pos;
    const GH = { pr: ['create', 'merge', 'comment', 'review', 'close', 'reopen', 'edit'], release: ['create', 'upload', 'delete', 'edit', 'delete-asset'], repo: ['create', 'delete', 'edit', 'rename', 'archive', 'fork'], secret: ['set', 'delete', 'remove'], variable: ['set', 'delete'], workflow: ['run', 'enable', 'disable'], issue: ['create', 'comment', 'close', 'edit', 'delete', 'transfer'], gist: ['create', 'edit', 'delete'] };
    if (GH[a0] && GH[a0].includes(a1)) ASK.add('Outward-facing GitHub action');
    if (a0 === 'api') {
      let mutating = false;
      for (let k = 0; k < args.length; k++) {
        const a = args[k];
        let m = null;
        if (a === '-X' || a === '--method') m = args[k + 1];
        else if (/^-X./.test(a)) m = a.slice(2);
        else if (a.startsWith('--method=')) m = a.slice(9);
        if (m && /^(POST|PUT|PATCH|DELETE)$/i.test(m)) mutating = true;
        if (/^(-f|-F|--field|--raw-field|--input)(=|$)/.test(a) || /^-[fF]./.test(a)) mutating = true;
      }
      if (mutating) ASK.add('Outward-facing GitHub API write');
    }
  }

  // package publishing (--dry-run is exempt)
  if (!has('--dry-run')) {
    if (['npm', 'pnpm', 'yarn', 'bun'].includes(bin) && (['publish', 'unpublish'].includes(verb) || (bin === 'yarn' && verb === 'npm' && pos[1] === 'publish'))) ASK.add('Publishes a package');
    if ((bin === 'cargo' && verb === 'publish') || (bin === 'gem' && verb === 'push') || (bin === 'twine' && verb === 'upload') || (['poetry', 'uv', 'flit', 'hatch'].includes(bin) && verb === 'publish') || (bin === 'dotnet' && verb === 'nuget' && pos[1] === 'push')) ASK.add('Publishes a package');
  }

  // containers
  if (bin === 'docker' || bin === 'podman') {
    if (verb === 'push' || verb === 'login' || (verb === 'image' && pos[1] === 'push')) ASK.add('Pushes a container image / registry login');
    if ((verb === 'build' || verb === 'buildx') && args.some((a) => a === '--push' || a.startsWith('--push=') || /(^|,)push=true/.test(a))) ASK.add('Pushes a container image / registry login');
    if (verb === 'compose' && pos.includes('push')) ASK.add('Pushes a container image / registry login');
  }
  if (bin === 'docker-compose' && pos.includes('push')) ASK.add('Pushes a container image / registry login');

  // deployment & infrastructure
  if (bin === 'vercel' && (pos.length === 0 || ['deploy', 'promote', 'alias', 'rollback', 'redeploy', 'remove', 'rm'].includes(pos[0]) || has('--prod', '-p'))) ASK.add('Deployment CLI');
  if ((bin === 'netlify' || bin === 'netlify-cli') && (pos.length === 0 || ['deploy', 'rollback'].includes(pos[0]) || has('--prod'))) ASK.add('Deployment CLI');
  if (['firebase', 'fly', 'flyctl', 'railway', 'heroku', 'serverless', 'sls', 'sam', 'cdk', 'amplify', 'eb'].includes(bin) && (/^(deploy|up|publish|release|destroy)$/.test(verb) || /:deploy$/.test(verb))) ASK.add('Deploys to a cloud provider');
  if (bin === 'heroku' && /:(set|unset|rollback|destroy|remove|add)$/.test(verb)) ASK.add('Changes a live Heroku app');
  if (bin === 'wrangler' && (pos.slice(0, 3).some((t) => t === 'deploy' || t === 'publish') || (pos[0] === 'secret' && ['put', 'delete', 'bulk'].includes(pos[1])) || pos[0] === 'delete' || (pos[1] === 'execute' && has('--remote')))) ASK.add('Deploys to a cloud provider');
  if (bin === 'supabase' && ((pos[0] === 'functions' && ['deploy', 'delete'].includes(pos[1])) || (pos[0] === 'secrets' && ['set', 'unset'].includes(pos[1])))) ASK.add('Deploys to a cloud provider');
  if ((bin === 'terraform' || bin === 'tofu') && (['apply', 'destroy', 'import', 'taint'].includes(verb) || (verb === 'state' && ['rm', 'mv', 'push', 'replace-provider'].includes(pos[1])))) ASK.add('Changes real infrastructure');
  if (bin === 'pulumi' && ['up', 'destroy', 'update', 'import'].includes(verb)) ASK.add('Changes real infrastructure');
  if (bin === 'kubectl' && ['apply', 'create', 'delete', 'replace', 'patch', 'rollout', 'scale', 'drain', 'edit', 'set', 'cordon', 'taint', 'label', 'annotate', 'autoscale'].includes(verb)) ASK.add('Changes a Kubernetes cluster');
  if (bin === 'helm' && ['install', 'upgrade', 'uninstall', 'rollback', 'delete'].includes(verb)) ASK.add('Changes a Kubernetes cluster');
  if (['aws', 'gcloud', 'az', 'doctl'].includes(bin) && !cloudReadOnly(bin, pos)) ASK.add('Cloud provider CLI call');

  // migrations
  const norm = [bin, ...rest].join(' ');
  if (/^((pnpm|yarn|bun) )?(prisma migrate (deploy|reset)|prisma db (push|execute)|drizzle-kit (push|migrate)|knex migrate:(latest|up|rollback)|sequelize(-cli)? db:migrate|alembic (upgrade|downgrade)|(rails|rake) db:(migrate|drop|reset|rollback)|supabase db (push|reset))\b/.test(norm)) ASK.add('Applies a database migration (confirm the target is NOT production)');

  // payments
  if (bin === 'stripe' && ((/^(charges|payment_intents|subscriptions|payouts|transfers|refunds|invoices|customers|checkout|payment_links|prices|products)$/.test(pos[0]) && /^(create|update|delete|cancel|capture|confirm|pay|void|finalize|send|resume)$/.test(pos[1] || '')) || ['post', 'delete'].includes(pos[0]))) ASK.add('Creates or changes a real Stripe object');

  // live messaging / payment endpoints, whatever the HTTP client
  if (!TEXT_ONLY.has(bin) && (LIVE_HOSTS.test(raw) || seg.heredocs.some((h) => LIVE_HOSTS.test(h)))) ASK.add('Calls a live messaging/payment API');

  // secrets
  if (READERS.has(bin) && secretCandidates(bin, args).some(isSecretPath)) ASK.add('Reads a secret-bearing file');

  // weakening protections
  if (bin === 'chmod' && args.some((a) => /^(0?777|a\+w|o\+w|a\+rwx|o\+rwx)$/.test(a))) ASK.add('World-writable permissions');
  if (['npm', 'pnpm', 'yarn'].includes(bin) && verb === 'config' && args.includes('strict-ssl') && args.includes('false')) ASK.add('Disables TLS verification');
  if (bin === 'curl' && args.some((a) => a === '--insecure' || /^-[a-zA-Z]*k[a-zA-Z]*$/.test(a))) ASK.add('Disables TLS verification');
  if (bin === 'wget' && args.includes('--no-check-certificate')) ASK.add('Disables TLS verification');
  if (/NODE_TLS_REJECT_UNAUTHORIZED=["']?0|PYTHONHTTPSVERIFY=["']?0/.test(raw)) ASK.add('Disables TLS verification');

  return bin;
}

function checkCommand(cmd, depth) {
  if (depth > MAX_DEPTH) return;
  const src = String(cmd || '');
  const extra = [];
  const segs = lex(src, depth, extra);
  const bins = [];
  for (const s of segs) { const b = checkSegment(s, depth); if (b) bins.push({ b, s }); }
  for (const inner of extra) checkCommand(inner, depth + 1);

  // whole-command content rules
  if (/\bmkfs(\.\w+)?\b|\bdd\s+[^|]*of=\/dev\/(sd|nvme|disk|hd|vd|xvd|mmcblk)/.test(src)) DENY.add('Raw disk write / format');
  if (/:\(\)\s*\{\s*:\|:&\s*\};:/.test(src)) DENY.add('Fork bomb');
  if (/\b(DROP\s+(DATABASE|TABLE|SCHEMA)|TRUNCATE\s+TABLE|DELETE\s+FROM\s+\w+\s*;?\s*$)/i.test(src)) ASK.add('Destructive SQL');

  const hasSql = bins.some(({ b }) => SQL_BINS.has(b)) || /\bprisma\s+db\s+execute\b/.test(src);
  const hasDb = bins.some(({ b, s }) => DB_BINS.has(b) || (!TEXT_ONLY.has(b) && s.words.some((w) => /migrat/i.test(w))));
  if (hasDb && PROD.test(src)) ASK.add('Database client pointed at something named production');
  if (bins.some(({ b }) => b === 'redis-cli') && /\bflush(all|db)\b/i.test(src)) ASK.add('Wipes a Redis database');
  if (bins.some(({ b }) => b === 'mongosh' || b === 'mongo') && /\bdropDatabase\s*\(|\.drop\s*\(|\bdeleteMany\s*\(\s*\{\s*\}\s*\)/.test(src)) ASK.add('Drops MongoDB data');
  if (hasSql) {
    const noWhere = (re) => { for (const m of src.matchAll(re)) if (!/\bWHERE\b/i.test(m[1] || '')) return true; return false; };
    if (noWhere(/\bDELETE\s+FROM\b([^;"\n]*)/gi) || noWhere(/\bUPDATE\s+[\w."`[\]-]+\s+SET\b([^;"\n]*)/gi)) ASK.add('Destructive SQL (DELETE/UPDATE without WHERE)');
    if (/\bTRUNCATE\s+(TABLE\s+)?[A-Za-z_"`]/i.test(src)) ASK.add('Destructive SQL');
  }
}

// ---------------------------------------------------------------- dispatch
try {
  if (tool === 'Bash') {
    checkCommand(String(ti.command || ''), 0);
  } else if (['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
    const fp = String(ti.file_path || ti.notebook_path || '');
    if (isSecretPath(fp)) ASK.add(`${tool} on a secret-bearing file (${fp.split('/').pop()})`);
  } else if (tool === 'Grep') {
    const p = String(ti.path || '');
    const g = String(ti.glob || '').replace(/^(\*\*\/)+/, '');
    if (isSecretPath(p) || (g && (isSecretPath(g) || /^\.env\*?$/.test(g) || /^\*\.(pem|key|p12|pfx)$/.test(g)))) ASK.add('Grep on a secret-bearing file');
  }
} catch {
  ASK.add('guard could not analyse this command');
}

function out(decision, reasons) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: `Lithos Ultra guard: ${[...reasons].join('; ')}. Policy requires explicit user authorization.`,
    },
  }));
  process.exit(0);
}

if (DENY.size) out('deny', DENY);
if (ASK.size) out('ask', ASK);
process.exit(0);
