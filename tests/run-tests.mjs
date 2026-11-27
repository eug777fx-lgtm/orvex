#!/usr/bin/env node
// Lithos Ultra self-tests: guard hook decisions, mission-control CLI, and workflow template
// logic executed in a simulated runtime (agent() mocked; real runtime semantics: top-level
// await/return, parallel() resolves throwing thunks to null).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SK = path.join(ROOT, 'skill');
let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.log(`  ✗ ${name}\n      ${e.message.split('\n').join('\n      ')}`); }
}

// ---------------- guard ----------------
function guard(tool_name, tool_input) {
  const r = spawnSync('node', [path.join(SK, 'scripts/guard.mjs')], { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name, tool_input }), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`guard exited ${r.status}: ${r.stderr}`);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.permissionDecision : 'none';
}
console.log('guard.mjs');
const ASKS = ['git push origin main', 'git push', 'npm publish', 'vercel --prod', 'vercel', 'npx vercel deploy', 'netlify deploy --prod', 'terraform apply', 'kubectl apply -f k8s/', 'prisma migrate deploy', 'psql "$DATABASE_URL_PROD" -c "select 1" # production',
  'cat .env', 'cat .env.local', 'printenv', 'curl -X POST https://graph.facebook.com/v20.0/123/messages', 'git commit --no-verify -m x', 'fly deploy', 'aws s3 cp x s3://bucket', 'gh pr create --fill', 'echo "DROP TABLE users;" | sqlite3 db', 'curl -k https://x', 'git reset --hard HEAD~1'];
const NONE = ['npm test', 'npm run build', 'git status', 'git diff', 'git commit -m "x"', 'cat .env.example', 'ls -la', 'node app.js', 'npx tsc --noEmit', 'cat vercel.json', 'grep -r netlify docs/', 'aws --version', 'npx vitest run', 'git log --oneline'];
for (const c of ASKS) await t(`asks: ${c}`, () => assert.equal(guard('Bash', { command: c }), 'ask'));
for (const c of NONE) await t(`passes: ${c}`, () => assert.equal(guard('Bash', { command: c }), 'none'));
await t('denies rm -rf /', () => assert.equal(guard('Bash', { command: 'rm -rf /' }), 'deny'));
await t('denies rm -rf ~', () => assert.equal(guard('Bash', { command: 'rm -rf ~' }), 'deny'));
await t('passes rm -rf ./dist', () => assert.equal(guard('Bash', { command: 'rm -rf ./dist' }), 'none'));
await t('asks Read .env', () => assert.equal(guard('Read', { file_path: '/p/.env' }), 'ask'));
await t('asks Write id_rsa', () => assert.equal(guard('Write', { file_path: '/home/u/.ssh/id_rsa' }), 'ask'));
await t('passes Read .env.example', () => assert.equal(guard('Read', { file_path: '/p/.env.example' }), 'none'));
await t('passes Edit src file', () => assert.equal(guard('Edit', { file_path: '/p/src/env.ts' }), 'none'));
await t('never emits allow', () => { const src = fs.readFileSync(path.join(SK, 'scripts/guard.mjs'), 'utf8'); assert.ok(!/permissionDecision:\s*['"]allow/.test(src)); });
await t('malformed stdin is a no-op', () => { const r = spawnSync('node', [path.join(SK, 'scripts/guard.mjs')], { input: 'not json', encoding: 'utf8' }); assert.equal(r.status, 0); assert.equal(r.stdout, ''); });

// ---------------- mission control ----------------
console.log('mc.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lithos-mc-'));
const MC = (...a) => execFileSync('node', [path.join(SK, 'scripts/mc.mjs'), ...a], { cwd: tmp, encoding: 'utf8' });
const MCfail = (...a) => spawnSync('node', [path.join(SK, 'scripts/mc.mjs'), ...a], { cwd: tmp, encoding: 'utf8' });
const hook = (obj) => spawnSync('node', [path.join(SK, 'scripts/mc.mjs'), 'hook'], { input: JSON.stringify(obj), encoding: 'utf8' });
execFileSync('git', ['init', '-q'], { cwd: tmp });
await t('hook is a no-op without a run', () => { const r = hook({ hook_event_name: 'SubagentStart', cwd: tmp, agent_id: 'x', agent_type: 'y' }); assert.equal(r.status, 0); assert.ok(!fs.existsSync(path.join(tmp, '.lithos'))); });
await t('init creates state', () => { MC('init', '--mode', 'quick', '--task', 'demo', '--budget', '4'); assert.ok(fs.existsSync(path.join(tmp, '.lithos/state.json'))); });
await t('init refuses to clobber', () => assert.notEqual(MCfail('init', '--task', 'x').status, 0));
await t('task add + ownership ok', () => {
  MC('task', 'add', 'T1', '--title', 'api', '--owner', 'lithos-backend-engineer', '--files', 'src/api/**');
  MC('task', 'add', 'T2', '--title', 'ui', '--owner', 'lithos-frontend-engineer', '--files', 'src/ui/**');
  MC('task', 'add', 'T3', '--title', 'tests', '--owner', 'lithos-test-automation-engineer', '--files', 'src/api/handlers.ts', '--deps', 'T1');
  assert.match(MC('check-ownership'), /no ownership conflicts/);
});
await t('ownership conflict detected for concurrent tasks', () => {
  MC('task', 'add', 'T4', '--title', 'bad', '--owner', 'lithos-backend-engineer', '--files', 'src/api/routes.ts');
  const r = MCfail('check-ownership'); assert.equal(r.status, 2); assert.match(r.stdout, /CONFLICT T1 <-> T4/);
  MC('task', 'status', 'T4', 'skipped');
});
await t('waves respect deps', () => { const w = MC('waves'); assert.match(w, /wave 1: T1, T2/); assert.match(w, /wave 2: T3/); });
await t('hooks record real events', () => {
  assert.equal(hook({ hook_event_name: 'SubagentStart', cwd: tmp, agent_id: 'a1', agent_type: 'lithos-backend-engineer' }).status, 0);
  hook({ hook_event_name: 'PostToolUse', cwd: path.join(tmp, 'src'), tool_name: 'Write', tool_input: { file_path: path.join(tmp, 'src/api/x.ts') } });
  hook({ hook_event_name: 'PostToolUse', cwd: tmp, tool_name: 'Write', tool_input: { file_path: path.join(tmp, '.lithos/notes.md') } });
  hook({ hook_event_name: 'SubagentStop', cwd: tmp, agent_id: 'a1', agent_type: 'lithos-backend-engineer', last_assistant_message: 'done' });
  const ev = fs.readFileSync(path.join(tmp, '.lithos/events.jsonl'), 'utf8').trim().split('\n');
  assert.equal(ev.length, 3, 'own .lithos files must be ignored');
});
await t('status/test/finding/render', () => {
  MC('task', 'status', 'T1', 'done'); MC('task', 'status', 'T2', 'blocked', '--note', 'waiting on design');
  MC('test', 'add', '--name', 'unit', '--cmd', 'npm test', '--status', 'pass', '--summary', '12 passed');
  MC('finding', 'add', '--kind', 'security', '--severity', 'high', '--title', 'Missing rate limit', '--file', 'src/api/login.ts');
  MC('step', '1', 'done');
  MC('render');
  const md = fs.readFileSync(path.join(tmp, '.lithos/STATUS.md'), 'utf8');
  assert.match(md, /1\/3 tasks done \(33%\)/);
  assert.match(md, /\| a1 \| lithos-backend-engineer \| finished/);
  assert.match(md, /src\/api\/x\.ts \(1 edit event\)/);
  assert.match(md, /Blocked tasks \(1\)/);
  assert.match(md, /Missing rate limit/);
  const html = fs.readFileSync(path.join(tmp, '.lithos/status.html'), 'utf8');
  assert.match(html, /<title>Lithos Mission Control<\/title>/);
});
await t('html escapes untrusted text', () => {
  MC('task', 'add', 'T9', '--title', '<script>alert(1)</script>', '--owner', 'x'); MC('render');
  assert.ok(!fs.readFileSync(path.join(tmp, '.lithos/status.html'), 'utf8').includes('<script>alert(1)'));
});
await t('subagent Stop + Agent return close agents and record tokens', () => {
  hook({ hook_event_name: 'SubagentStart', cwd: tmp, agent_id: 'b1', agent_type: 'lithos-qa-engineer' });
  hook({ hook_event_name: 'SubagentStart', cwd: tmp, agent_id: 'b2', agent_type: 'lithos-code-reviewer' });
  hook({ hook_event_name: 'Stop', cwd: tmp, agent_id: 'b1', agent_type: 'lithos-qa-engineer' }); // agent-frontmatter Stop
  hook({ hook_event_name: 'PostToolUse', cwd: tmp, tool_name: 'Agent', tool_input: { subagent_type: 'lithos-code-reviewer' }, tool_response: { agentId: 'b2', totalTokens: 1234, totalDurationMs: 50, status: 'completed' } });
  MC('render');
  const md = fs.readFileSync(path.join(tmp, '.lithos/STATUS.md'), 'utf8');
  assert.match(md, /\| b1 \| lithos-qa-engineer \| finished/);
  assert.match(md, /\| b2 \| lithos-code-reviewer \| finished \|[^|]*\|[^|]*\| 1234 \|/);
  assert.match(md, /Measured subagent tokens[^:]*:\*\* 1,234/);
});
await t('invalid status rejected', () => assert.notEqual(MCfail('task', 'status', 'T1', 'finished-ish').status, 0));
await t('init --force archives old run', () => { MC('init', '--force', '--task', 'second'); assert.ok(fs.readdirSync(path.join(tmp, '.lithos/archive')).length === 1); });
fs.rmSync(tmp, { recursive: true, force: true });

// ---------------- workflow templates (simulated runtime) ----------------
console.log('workflows (simulated runtime)');
function loadWorkflow(file) {
  const src = fs.readFileSync(path.join(SK, 'workflows', file), 'utf8');
  const m = src.match(/^export const meta = (\{[\s\S]*?\n\})\n/);
  assert.ok(m, 'meta must be the first statement');
  // meta must be a pure literal: evaluate it without any scope
  const meta = Function(`"use strict"; return (${m[1]})`)();
  const body = src.slice(m[0].length);
  for (const banned of ['Date.now()', 'Math.random()', 'new Date()', 'require(', 'import(']) assert.ok(!body.includes(banned), `${file} uses ${banned}`);
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFn('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', body);
  return { meta, run: (agentImpl, args) => {
    const calls = []; const logs = []; const phases = [];
    const agent = async (prompt, opts = {}) => { calls.push({ prompt, opts }); return agentImpl(prompt, opts, calls.length); };
    const parallel = async (thunks) => Promise.all(thunks.map((th) => Promise.resolve().then(th).catch(() => null)));
    return fn(agent, parallel, null, (p) => phases.push(p), (l) => logs.push(l), args, { total: null }).then((ret) => ({ ret, calls, logs, phases }));
  } };
}

for (const f of fs.readdirSync(path.join(SK, 'workflows'))) {
  await t(`${f}: meta literal + phases match`, () => {
    const { meta } = loadWorkflow(f);
    assert.ok(meta.name && meta.description);
    const src = fs.readFileSync(path.join(SK, 'workflows', f), 'utf8');
    for (const [, p] of src.matchAll(/phase\('([^']+)'\)/g)) assert.ok(meta.phases.some((x) => x.title === p), `phase ${p} missing from meta`);
  });
}

const exec = loadWorkflow('lithos-execute.js');
const doneResult = (files) => ({ status: 'done', summary: 'implemented', filesChanged: files || [], testsRun: [{ cmd: 'npm test', result: 'pass' }], needs: [] });
await t('execute: dependency order respected', async () => {
  const order = [];
  const { ret } = await exec.run(async (p, o) => { const id = o.label.split(' ')[0]; order.push(id); await new Promise((r) => setTimeout(r, id === 'A' ? 30 : 5)); return doneResult(); },
    { tasks: [{ id: 'A', agentType: 'lithos-backend-engineer', title: 'a', files: ['a/**'] }, { id: 'B', agentType: 'lithos-frontend-engineer', title: 'b', files: ['b/**'] }, { id: 'C', agentType: 'lithos-qa-engineer', title: 'c', files: ['c/**'], deps: ['A', 'B'] }] });
  assert.deepEqual(order.slice(0, 2).sort(), ['A', 'B']); assert.equal(order[2], 'C'); assert.deepEqual(ret.done, ['A', 'B', 'C']);
});
await t('execute: C starts before slow unrelated task finishes (no wave barrier)', async () => {
  const events = [];
  await exec.run(async (p, o) => { const id = o.label.split(' ')[0]; events.push(`start ${id}`); await new Promise((r) => setTimeout(r, id === 'SLOW' ? 60 : 5)); events.push(`end ${id}`); return doneResult(); },
    { tasks: [{ id: 'A', agentType: 'x', title: 'a' }, { id: 'SLOW', agentType: 'x', title: 's' }, { id: 'C', agentType: 'x', title: 'c', deps: ['A'] }] });
  assert.ok(events.indexOf('start C') < events.indexOf('end SLOW'));
});
await t('execute: bounded retry then blocked dependents', async () => {
  const { ret, calls } = await exec.run(async (p, o) => (o.label.startsWith('A') ? { status: 'failed', summary: 'boom', filesChanged: [], testsRun: [], needs: [] } : doneResult()),
    { maxRetries: 1, tasks: [{ id: 'A', agentType: 'x', title: 'a' }, { id: 'B', agentType: 'x', title: 'b', deps: ['A'] }] });
  assert.equal(calls.filter((c) => c.opts.label.startsWith('A')).length, 2, 'one try + one retry');
  assert.match(calls[1].prompt, /RETRY 1/);
  assert.deepEqual(ret.failed, ['A']); assert.deepEqual(ret.blocked, ['B']);
});
await t('execute: null agent result handled', async () => {
  const { ret } = await exec.run(async () => null, { maxRetries: 0, tasks: [{ id: 'A', agentType: 'x', title: 'a' }] });
  assert.deepEqual(ret.failed, ['A']);
});
await t('execute: cycle rejected', async () => {
  await assert.rejects(exec.run(async () => doneResult(), { tasks: [{ id: 'A', agentType: 'x', title: 'a', deps: ['B'] }, { id: 'B', agentType: 'x', title: 'b', deps: ['A'] }] }), /cycle/);
});
await t('execute: worktree isolation + agentType + ownership in prompt', async () => {
  const { calls } = await exec.run(async () => doneResult(), { isolation: 'worktree', tasks: [{ id: 'A', agentType: 'lithos-api-engineer', title: 'a', files: ['src/api/**'] }] });
  assert.equal(calls[0].opts.isolation, 'worktree'); assert.equal(calls[0].opts.agentType, 'lithos-api-engineer');
  assert.match(calls[0].prompt, /src\/api\/\*\*/); assert.match(calls[0].prompt, /NEVER push/);
});

const rev = loadWorkflow('lithos-review.js');
await t('review: dedup, majority verify, fix by owner, recheck, bounded', async () => {
  let reviewRound = 0;
  const { ret, calls } = await rev.run(async (p, o) => {
    if (o.phase === 'Review') {
      if (o.label.startsWith('R1')) { reviewRound = 1; return { findings: [
        { title: 'SQL injection in search', severity: 'high', file: 'src/api/search.ts', evidence: 'string concat', fix: 'parameterize' },
        { title: 'Bogus claim', severity: 'low', file: 'src/api/x.ts', evidence: 'none', fix: 'n/a' }] }; }
      return { findings: [{ title: 'SQL injection in search', severity: 'high', file: 'src/api/search.ts', evidence: 'dup', fix: 'p' }] }; // duplicate → dry
    }
    if (o.phase === 'Verify') return { refuted: /Bogus/.test(p), reason: 'checked' };
    if (o.phase === 'Fix') { const ids = [...p.matchAll(/\[(RV\d+)\]/g)].map((m) => m[1]); return { fixed: ids, notFixed: [], testsRun: ['npm test'] }; }
    if (o.phase === 'Recheck') return { resolved: true, reason: 'ok' };
    throw new Error('unexpected ' + o.phase);
  }, { lenses: [{ key: 'correctness', agentType: 'lithos-code-reviewer' }, { key: 'security', agentType: 'lithos-security-engineer' }], verifyVotes: 3, maxFixRounds: 2,
       owners: [{ taskId: 'T1', agentType: 'lithos-backend-engineer', files: ['src/api/**'] }] });
  assert.equal(ret.confirmed.length, 1, 'dedup across lenses + bogus refuted');
  assert.equal(ret.rejected.length, 1);
  assert.equal(ret.fixed.length, 1); assert.equal(ret.open.length, 0);
  assert.equal(calls.filter((c) => c.opts.phase === 'Fix')[0].opts.agentType, 'lithos-backend-engineer');
  assert.ok(ret.rounds <= 3);
});
await t('review: audit mode never fixes', async () => {
  const { ret, calls } = await rev.run(async (p, o) => (o.phase === 'Review' ? { findings: [{ title: 'XSS', severity: 'high', file: 'a.ts', evidence: 'e', fix: 'f' }] } : { refuted: false, reason: 'real' }), { fix: false });
  assert.equal(calls.filter((c) => c.opts.phase === 'Fix').length, 0); assert.equal(ret.open.length, 1);
});
await t('review: unowned finding goes to orchestrator, not fixed', async () => {
  const { ret } = await rev.run(async (p, o) => (o.phase === 'Review' ? { findings: [{ title: 'Bad root config', severity: 'medium', file: 'package.json', evidence: 'e', fix: 'f' }] } : { refuted: false, reason: 'real' }), { owners: [{ taskId: 'T1', agentType: 'x', files: ['src/**'] }] });
  assert.equal(ret.open.length, 1); assert.match(ret.open[0].note, /orchestrator/);
});
await t('review: never-ending reviewers are bounded', async () => {
  let n = 0;
  const { ret } = await rev.run(async (p, o) => {
    if (o.phase === 'Review') return { findings: [{ title: `New issue ${++n}`, severity: 'low', file: 'src/a.ts', evidence: 'e', fix: 'f' }] };
    if (o.phase === 'Verify') return { refuted: false, reason: 'real' };
    if (o.phase === 'Fix') return { fixed: [...p.matchAll(/\[(RV\d+)\]/g)].map((m) => m[1]), notFixed: [], testsRun: [] };
    return { resolved: true, reason: 'ok' };
  }, { maxFixRounds: 2, owners: [{ taskId: 'T1', agentType: 'x', files: ['src/**'] }] });
  assert.equal(ret.rounds, 3, 'MAX_ROUNDS fix rounds + one final review');
});

const disc = loadWorkflow('lithos-discover.js');
await t('discover: maps areas and synthesizes', async () => {
  const { ret, calls } = await disc.run(async (p, o) => (o.phase === 'Map' ? { purpose: 'p', stack: [], features: [], tests: 'none', debt: [], risks: [] } : 'synthesis text'), { areas: [{ key: 'api', paths: ['src/api'] }, { key: 'ui', paths: ['src/ui'] }] });
  assert.equal(ret.areas.length, 2); assert.equal(ret.synthesis, 'synthesis text'); assert.equal(calls[0].opts.agentType, 'Explore');
});

// ---------------- package structure ----------------
console.log('package');
await t('SKILL.md frontmatter has required fields and < 500 lines', () => {
  const s = fs.readFileSync(path.join(SK, 'SKILL.md'), 'utf8');
  assert.match(s, /^---\nname: lithos-ultra\n/); assert.match(s, /\ndescription: /); assert.ok(s.split('\n').length < 500);
  const fm = s.split('---')[1]; assert.ok((fm.match(/description: .*/)[0].length + (fm.match(/when_to_use: .*/) || [''])[0].length) < 1536);
});
await t('every file referenced from SKILL.md exists', () => {
  const s = fs.readFileSync(path.join(SK, 'SKILL.md'), 'utf8');
  for (const [, ref] of s.matchAll(/`((?:policies|reference|templates|config|scripts|workflows)\/[\w./-]+)`/g)) assert.ok(fs.existsSync(path.join(SK, ref.replace(/\s.*/, ''))), `missing ${ref}`);
});
await t('28 agents, valid frontmatter, specialists cannot spawn agents', () => {
  const files = fs.readdirSync(path.join(ROOT, 'agents')).filter((f) => f.endsWith('.md'));
  assert.equal(files.length, 28);
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, 'agents', f), 'utf8');
    const name = s.match(/\nname: (.+)\n/)[1]; assert.equal(`${name}.md`, f);
    assert.match(s, /\ndescription: /);
    if (name !== 'lithos-orchestrator') { const tools = s.match(/\ntools: (.+)\n/)[1]; assert.ok(!/\bAgent\b/.test(tools), `${f} has Agent`); }
  }
});
await t('roster.md lists exactly the installed agents', () => {
  const r = fs.readFileSync(path.join(SK, 'reference/roster.md'), 'utf8');
  const listed = new Set([...r.matchAll(/`(lithos-[a-z-]+)`/g)].map((m) => m[1]));
  const files = new Set(fs.readdirSync(path.join(ROOT, 'agents')).map((f) => f.replace(/\.md$/, '')));
  for (const f of files) assert.ok(listed.has(f), `${f} not in roster`);
  for (const l of listed) assert.ok(files.has(l), `${l} in roster but no agent file`);
});
await t('reviewer roles have no Edit/Write tools', () => {
  for (const n of ['security-engineer', 'pentest-specialist', 'code-reviewer', 'adversarial-reviewer']) {
    const s = fs.readFileSync(path.join(ROOT, 'agents', `lithos-${n}.md`), 'utf8');
    assert.ok(!/\ntools: .*\b(Edit|Write)\b/.test(s), n);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
