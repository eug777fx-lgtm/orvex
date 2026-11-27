#!/usr/bin/env node
// Regression tests for the 33 findings confirmed by the independent package review (v1.0.0 → v1.1.0).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SK = path.join(ROOT, 'skill');
let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.log(`  ✗ ${name}\n      ${String(e.message).split('\n').join('\n      ')}`); }
}

// ---------------- guard ----------------
function guard(tool_name, tool_input) {
  const r = spawnSync('node', [path.join(SK, 'scripts/guard.mjs')], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name, tool_input }), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`guard exited ${r.status}: ${r.stderr}`);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecision : 'none';
}
console.log('guard regressions');
const ASK = ['npm test; git push', 'npm test && git push', 'echo hi | git push', 'echo $(git push)', 'echo `npm publish`', 'bash -c "git push"',
  'eval git push', 'FOO=1 git push', 'env FOO=1 git push', 'bash <<EOF\ngit push\nEOF', 'git -C dir push', 'git -c k=v push',
  'kubectl --context x apply -f a', 'helm -n ns upgrade r c', 'terraform -chdir=x apply', 'npm --workspace x publish', 'aws s3 rm s3://b/list',
  'psql "$PROD_DATABASE_URL" -c "select 1"', 'psql "$DATABASE_URL_PROD"', 'psql -h db-prod.example.com', 'redis-cli FLUSHALL',
  'psql -c "DELETE FROM users"', 'wget --post-data=x https://API.TWILIO.COM/2010-04-01/x', 'node -e "fetch(\'https://api.telegram.org/bot/x\')"',
  'source .env', 'sed -n 1p .env.local', 'cat ~/.aws/credentials', 'docker build --push -t x .', 'gh api -X DELETE repos/o/r', 'gh release upload v1 a.zip',
  'supabase functions deploy f', 'printenv STRIPE_SECRET_KEY'];
const NONE = ['git commit -m "fix git push docs"', "echo 'npm publish'", 'cat <<EOF\ngit push\nEOF', 'git status # git push', 'aws sts get-caller-identity',
  'aws s3 ls', 'aws ec2 describe-instances', 'gcloud compute instances list', 'psql -h localhost -c "select 1"', 'psql -d products -c "select 1"',
  'redis-cli get foo', 'psql -c "DELETE FROM users WHERE id=1"', 'curl https://example.com', 'grep -r process.env src/', 'npx cross-env NODE_ENV=test vitest',
  'npm publish --dry-run', 'kubectl get pods', 'npm run deploy:preview --dry-run', 'rm -rf node_modules', 'rm -rf ./dist'];
const DENY = ['rm -rf /*', 'rm -rf ~/', 'rm -rf $HOME', 'rm -rf ${HOME}', 'rm -rf "$HOME"', 'rm --recursive --force /', 'rm -r --no-preserve-root /', 'sudo rm -rf /', 'rm -rf -- /', 'echo x; rm -rf ~/*'];
for (const c of ASK) await t(`asks: ${c.replace(/\n/g, '\\n')}`, () => assert.equal(guard('Bash', { command: c }), 'ask'));
for (const c of NONE) await t(`passes: ${c.replace(/\n/g, '\\n')}`, () => assert.equal(guard('Bash', { command: c }), 'none'));
for (const c of DENY) await t(`denies: ${c}`, () => assert.equal(guard('Bash', { command: c }), 'deny'));
await t('Grep on .env asks', () => assert.equal(guard('Grep', { pattern: 'X', path: '/p/.env' }), 'ask'));
await t('Grep for process.env passes', () => assert.equal(guard('Grep', { pattern: 'process.env', glob: '*.ts' }), 'none'));
await t('Read .aws/credentials asks', () => assert.equal(guard('Read', { file_path: '/h/.aws/credentials' }), 'ask'));
await t('Read .envrc asks', () => assert.equal(guard('Read', { file_path: '/p/.envrc' }), 'ask'));
await t('Read docs/env.md passes', () => assert.equal(guard('Read', { file_path: '/p/docs/env.md' }), 'none'));
await t('guard source has no allow decision', () => assert.ok(!/['"]allow['"]/.test(fs.readFileSync(path.join(SK, 'scripts/guard.mjs'), 'utf8'))));

// ---------------- mission control ----------------
console.log('mission-control regressions');
const MCP = path.join(SK, 'scripts/mc.mjs');
function sandbox() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lithos-rg-'));
  execFileSync('git', ['init', '-q'], { cwd: d });
  const MC = (...a) => execFileSync('node', [MCP, ...a], { cwd: d, encoding: 'utf8' });
  const MCr = (...a) => spawnSync('node', [MCP, ...a], { cwd: d, encoding: 'utf8' });
  const st = () => JSON.parse(fs.readFileSync(path.join(d, '.lithos/state.json'), 'utf8'));
  MC('init', '--task', 'rg');
  return { d, MC, MCr, st };
}
const par = (d, argsList) => Promise.all(argsList.map((a) => new Promise((res) => { let out = ''; const p = spawn('node', [MCP, ...a], { cwd: d }); p.stdout.on('data', (c) => (out += c)); p.on('close', (code) => res({ code, out: out.trim() })); })));
await t('20 parallel task adds all persist, lock released', async () => {
  const s = sandbox();
  await par(s.d, Array.from({ length: 20 }, (_, i) => ['task', 'add', `P${i}`]));
  assert.equal(Object.keys(s.st().tasks).length, 20);
  assert.ok(!fs.existsSync(path.join(s.d, '.lithos/state.lock')));
});
await t('10 parallel finding adds get 10 unique ids', async () => {
  const s = sandbox();
  const r = await par(s.d, Array.from({ length: 10 }, (_, i) => ['finding', 'add', '--kind', 'security', '--title', `f${i}`]));
  const ids = r.map((x) => x.out);
  assert.equal(new Set(ids).size, 10); ids.forEach((id) => assert.match(id, /^F\d+$/));
});
await t('directory ownership without trailing slash conflicts; prefix-but-not-segment does not', () => {
  const s = sandbox();
  s.MC('task', 'add', 'A', '--files', 'src/api'); s.MC('task', 'add', 'B', '--files', 'src/api/users.ts');
  const r = s.MCr('check-ownership'); assert.equal(r.status, 2); assert.match(r.stdout, /CONFLICT A <-> B/);
  const s2 = sandbox(); s2.MC('task', 'add', 'C', '--files', 'src/ap'); s2.MC('task', 'add', 'D', '--files', 'src/api.ts');
  assert.equal(s2.MCr('check-ownership').status, 0);
});
await t('finding kinds: unknown rejected, aliases mapped, nothing dropped', () => {
  const s = sandbox();
  const bad = s.MCr('finding', 'add', '--kind', 'bogus', '--title', 'x'); assert.notEqual(bad.status, 0); assert.match(bad.stderr, /valid kinds/i);
  s.MC('finding', 'add', '--kind', 'accessibility', '--title', 'A11yX'); s.MC('finding', 'add', '--kind', 'pentest', '--title', 'PenX');
  const st = s.st(); st.findings.push({ id: 'F99', kind: 'legacy-thing', severity: 'low', title: 'LegacyX', status: 'open' });
  fs.writeFileSync(path.join(s.d, '.lithos/state.json'), JSON.stringify(st)); s.MC('render');
  const md = fs.readFileSync(path.join(s.d, '.lithos/STATUS.md'), 'utf8');
  assert.match(md, /A11yX/); assert.match(md.split('## Security findings')[1].split('\n## ')[0], /PenX/); assert.match(md, /## Other findings \(1\)/); assert.match(md, /LegacyX/);
});
await t('--key=value flags and prototype-safe lookups', () => {
  const s = sandbox(); s.MC('task', 'add', 'Q', '--title=--weird');
  assert.equal(s.st().tasks.Q.title, '--weird'); assert.notEqual(s.MCr('task', 'status', 'toString', 'done').status, 0);
});
await t('git renames reported by destination only', () => {
  const s = sandbox(); fs.writeFileSync(path.join(s.d, 'a.txt'), 'x');
  execFileSync('git', ['add', 'a.txt'], { cwd: s.d }); execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'a'], { cwd: s.d });
  execFileSync('git', ['mv', 'a.txt', 'b.txt'], { cwd: s.d }); s.MC('render');
  const md = fs.readFileSync(path.join(s.d, '.lithos/STATUS.md'), 'utf8');
  assert.match(md, /- b\.txt \(git\)/); assert.ok(!/a\.txt/.test(md));
});
await t('stale lock is taken over', () => {
  const s = sandbox(); const lock = path.join(s.d, '.lithos/state.lock'); fs.mkdirSync(lock);
  const old = new Date(Date.now() - 30000); fs.utimesSync(lock, old, old);
  assert.equal(s.MCr('task', 'add', 'S1').status, 0); assert.ok(!fs.existsSync(lock));
});
await t('events with agent_id but no SubagentStart still count as observed agents', () => {
  const s = sandbox();
  spawnSync('node', [MCP, 'hook'], { input: JSON.stringify({ hook_event_name: 'PostToolUse', cwd: s.d, agent_id: 'w1', agent_type: 'lithos-api-engineer', tool_name: 'Write', tool_input: { file_path: path.join(s.d, 'x.ts') } }) });
  s.MC('render'); assert.match(fs.readFileSync(path.join(s.d, '.lithos/STATUS.md'), 'utf8'), /\| w1 \| lithos-api-engineer \|/);
});

// ---------------- workflows ----------------
console.log('workflow regressions');
function loadWorkflow(file) {
  const src = fs.readFileSync(path.join(SK, 'workflows', file), 'utf8');
  const m = src.match(/^export const meta = (\{[\s\S]*?\n\})\n/);
  const body = src.slice(m[0].length);
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFn('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', body);
  return (impl, args) => {
    const calls = [], logs = [];
    const agent = async (prompt, opts = {}) => { calls.push({ prompt, opts }); return impl(prompt, opts, calls.length); };
    const parallel = async (th) => Promise.all(th.map((x) => Promise.resolve().then(x).catch(() => null)));
    const p = fn(agent, parallel, null, () => {}, (l) => logs.push(l), args, { total: null });
    return { calls, logs, p: p.then((ret) => ({ ret, calls, logs })) };
  };
}
const exec = loadWorkflow('lithos-execute.js');
const rev = loadWorkflow('lithos-review.js');
const done = (extra) => ({ status: 'done', summary: 's', filesChanged: [], testsRun: [], needs: [], ...extra });
const ids = (p) => [...p.matchAll(/\[(RV\d+)\]/g)].map((m) => m[1]);

await t('execute: all validation errors reported before any agent call', async () => {
  const r = exec(async () => done(), { maxAgents: 0, tasks: [{ id: 'A' }, { id: 'A', agentType: 'x' }, { agentType: 'y' }, { id: 'C', agentType: 'x', deps: ['Z'] }] });
  await assert.rejects(r.p, (e) => /agentType/.test(e.message) && /duplicate task id A/.test(e.message) && /unknown task Z/.test(e.message));
  assert.equal(r.calls.length, 0);
});
await t('execute: title defaults to id; agentsUsed reported', async () => {
  const { ret, calls } = await exec(async () => done(), { tasks: [{ id: 'A', agentType: 'x' }] }).p;
  assert.match(calls[0].prompt, /TASK A: A/); assert.equal(ret.agentsUsed, 1);
});
await t('execute: worktree dependents merge dependency branches', async () => {
  const { ret, calls } = await exec(async (p, o) => done({ branch: { A: 'wt/a-1', B: 'wt/b-1', C: 'wt/c' }[o.label.split(' ')[0]] }),
    { isolation: 'worktree', tasks: [{ id: 'A', agentType: 'x' }, { id: 'B', agentType: 'x' }, { id: 'C', agentType: 'x', deps: ['A', 'B'] }] }).p;
  const c = calls.find((x) => x.opts.label.startsWith('C'));
  assert.match(c.prompt, /git merge --no-edit wt\/a-1/); assert.match(c.prompt, /git merge --no-edit wt\/b-1/);
  assert.ok(!calls.find((x) => x.opts.label.startsWith('A')).prompt.includes('git merge --no-edit'));
  assert.deepEqual(ret.done, ['A', 'B', 'C']);
});
await t('execute: worktree dependency without a valid branch blocks dependent', async () => {
  for (const branch of [undefined, '--upload-pack=x']) {
    const { ret, calls } = await exec(async () => done({ branch }), { isolation: 'worktree', tasks: [{ id: 'A', agentType: 'x' }, { id: 'C', agentType: 'x', deps: ['A'] }] }).p;
    assert.deepEqual(ret.blocked, ['C']); assert.equal(calls.length, 1);
  }
});
await t('execute: maxAgents counts retries and blocks unstarted tasks', async () => {
  const a = await exec(async () => ({ ...done(), status: 'failed' }), { maxAgents: 3, maxRetries: 2, tasks: [{ id: 'A', agentType: 'x' }, { id: 'B', agentType: 'x' }] }).p;
  assert.equal(a.calls.length, 3); assert.equal(a.ret.agentsUsed, 3);
  const b = await exec(async () => done(), { maxAgents: 2, tasks: [{ id: 'A', agentType: 'x' }, { id: 'B', agentType: 'x' }, { id: 'C', agentType: 'x' }] }).p;
  assert.equal(b.calls.length, 2); assert.deepEqual(b.ret.blocked, ['C']);
});
await t('review: lens attribution survives null/throwing earlier reviewers', async () => {
  const { ret } = await rev(async (p, o) => {
    if (o.phase === 'Review') { if (o.label === 'R1 a') return null; if (o.label === 'R1 b') throw new Error('x'); if (o.label === 'R1 c') return { findings: [{ title: 'T', severity: 'high', file: 'src/a.ts', evidence: 'e', fix: 'f' }] }; return { findings: [] }; }
    return { refuted: false, reason: 'r' };
  }, { lenses: [{ key: 'a', agentType: 'x' }, { key: 'b', agentType: 'x' }, { key: 'c', agentType: 'x' }], fix: false }).p;
  assert.equal(ret.open[0].lens, 'c');
});
await t('review: distinct similar titles in one file both survive', async () => {
  const F = [{ title: 'Missing auth check on user update endpoint handler', file: 'src/a.ts', severity: 'high', evidence: 'e', fix: 'f' },
    { title: 'Missing auth check on user update endpoint handler for admins', file: 'src/a.ts', severity: 'high', evidence: 'e', fix: 'f' }];
  const { ret } = await rev(async (p, o) => (o.phase === 'Review' ? { findings: o.label.startsWith('R1') ? F : [] } : { refuted: false, reason: 'r' }),
    { lenses: [{ key: 'a', agentType: 'x' }, { key: 'b', agentType: 'x' }], fix: false }).p;
  assert.equal(ret.confirmed.length, 2);
});
await t('review: a failed fix is retried next round without re-verification', async () => {
  let fixCalls = 0;
  const { ret, calls } = await rev(async (p, o) => {
    if (o.phase === 'Review') return { findings: o.label.startsWith('R1') ? [{ title: 'Bug', file: 'src/a.ts', severity: 'high', evidence: 'e', fix: 'f' }] : [] };
    if (o.phase === 'Verify') return { refuted: false, reason: 'r' };
    if (o.phase === 'Fix') { fixCalls++; return fixCalls === 1 ? { fixed: [], notFixed: [{ id: 'RV1', reason: 'tests broke' }], testsRun: [] } : { fixed: ids(p), notFixed: [], testsRun: [] }; }
    return { resolved: true, reason: 'ok' };
  }, { lenses: [{ key: 'a', agentType: 'x' }], owners: [{ taskId: 'T1', agentType: 'x', files: ['src/**'] }], maxFixRounds: 2 }).p;
  assert.equal(fixCalls, 2); assert.equal(calls.filter((c) => c.opts.phase === 'Verify').length, 2);
  assert.equal(ret.fixed.length, 1); assert.equal(ret.open.length, 0);
});
await t('review: maxAgents never exceeded and agentsUsed exact', async () => {
  for (let max = 1; max <= 30; max++) {
    let n = 0;
    const { ret, calls } = await rev(async (p, o) => {
      if (o.phase === 'Review') { n++; return { findings: [{ title: `low ${n}`, file: 'src/a.ts', severity: 'low', evidence: 'e', fix: 'f' }, { title: `high ${n}`, file: 'src/b.ts', severity: 'high', evidence: 'e', fix: 'f' }] }; }
      if (o.phase === 'Verify') return { refuted: false, reason: 'r' };
      if (o.phase === 'Fix') return { fixed: ids(p).slice(1), notFixed: [], testsRun: [] };
      return { resolved: true, reason: 'ok' };
    }, { owners: [{ taskId: 'T1', agentType: 'x', files: ['src/**'] }], maxFixRounds: 2, verifyVotes: 2, maxAgents: max }).p;
    assert.ok(calls.length <= max, `max ${max}: used ${calls.length}`); assert.equal(ret.agentsUsed, calls.length);
    const openIds = ret.open.map((f) => f.id); assert.equal(new Set(openIds).size, openIds.length);
  }
});

// ---------------- installer (sandboxed CLAUDE_CONFIG_DIR, never the real one) ----------------
console.log('installer regressions');
function inst(cfg, script, ...a) { return spawnSync('bash', [path.join(ROOT, script), ...a], { encoding: 'utf8', env: { ...process.env, HOME: path.join(path.dirname(cfg), 'home'), CLAUDE_CONFIG_DIR: cfg } }); }
await t('special-character config dir: hooks point to it and run', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lithos-inst-')); const cfg = path.join(base, 'c&d#e');
  const r = inst(cfg, 'install.sh'); assert.equal(r.status, 0, r.stdout + r.stderr);
  const skill = fs.readFileSync(path.join(cfg, 'skills/lithos-ultra/SKILL.md'), 'utf8');
  assert.ok(skill.includes(`${cfg}/skills/lithos-ultra/scripts/guard.mjs`)); assert.ok(!skill.includes('$HOME/.claude'));
  assert.ok(fs.existsSync(path.join(cfg, 'workflows/lithos-execute.js')), 'saved workflows installed');
  const cmd = skill.match(/command: '(node "[^']+guard\.mjs")'/)[1];
  assert.equal(spawnSync('bash', ['-c', cmd], { input: '{}' }).status, 0);
});
await t('user-owned lithos agent and workflow survive install, reinstall and uninstall', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lithos-inst-')); const cfg = path.join(base, 'cfg');
  fs.mkdirSync(path.join(cfg, 'agents'), { recursive: true }); fs.writeFileSync(path.join(cfg, 'agents/lithos-custom.md'), 'mine');
  fs.mkdirSync(path.join(cfg, 'workflows'), { recursive: true }); fs.writeFileSync(path.join(cfg, 'workflows/my-flow.js'), 'mine');
  assert.equal(inst(cfg, 'install.sh').status, 0); assert.equal(inst(cfg, 'install.sh').status, 0);
  const u = inst(cfg, 'uninstall.sh'); assert.equal(u.status, 0, u.stdout + u.stderr);
  assert.equal(fs.readFileSync(path.join(cfg, 'agents/lithos-custom.md'), 'utf8'), 'mine');
  assert.equal(fs.readFileSync(path.join(cfg, 'workflows/my-flow.js'), 'utf8'), 'mine');
  assert.ok(!fs.existsSync(path.join(cfg, 'workflows/lithos-execute.js'))); assert.ok(!fs.existsSync(path.join(cfg, 'skills/lithos-ultra')));
});
await t('--check reports a missing agent and fails', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lithos-inst-')); const cfg = path.join(base, 'cfg');
  inst(cfg, 'install.sh'); fs.unlinkSync(path.join(cfg, 'agents/lithos-qa-engineer.md'));
  const r = inst(cfg, 'install.sh', '--check'); assert.equal(r.status, 1); assert.match(r.stdout, /agent missing: .*lithos-qa-engineer\.md/); assert.match(r.stdout, /check FAILED/);
});
await t('backslash config dir refused', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'lithos-inst-')); const cfg = path.join(base, 'a\\b');
  const r = inst(cfg, 'install.sh'); assert.equal(r.status, 1); assert.ok(!fs.existsSync(cfg));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
