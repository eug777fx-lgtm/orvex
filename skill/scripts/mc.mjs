#!/usr/bin/env node
// Lithos Ultra — Mission Control CLI.
// Real-execution status tracking for a Lithos run in the current project.
//
// Data model (all inside <project>/.lithos/):
//   state.json    – written ONLY by the orchestrator via this CLI (plan, tasks, tests, findings)
//   events.jsonl  – appended ONLY by hooks (`mc.mjs hook`): real SubagentStart/Stop + file edits
//   STATUS.md / status.html – rendered views of both (never hand-edited)
// Splitting writers avoids races between parallel hook processes and the orchestrator.
// Zero dependencies; Node >= 18.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

const STEPS = [
  'Understand business requirements', 'Inspect codebase', 'Inventory functionality, deps & debt',
  'Architecture', 'Decompose into tasks', 'Assign specialists', 'Approval checkpoint',
  'Parallel execution', 'Integration', 'Independent review', 'Fix verified issues',
  'Build / type / lint / tests', 'Security & performance verification', 'Delivery & report',
];
const TASK_STATES = ['pending', 'in_progress', 'done', 'blocked', 'failed', 'skipped'];
const STEP_STATES = ['pending', 'in_progress', 'done', 'skipped', 'blocked'];

// Canonical finding kinds. Every kind belongs to exactly one rendered section; anything else
// already present in an older state.json is still shown under "Other findings" (never dropped).
const FINDING_KINDS = ['security', 'review', 'design', 'a11y', 'performance', 'debt', 'pentest', 'dependencies', 'data-protection', 'maintainability', 'correctness'];
const KIND_ALIASES = { accessibility: 'a11y' };
const SECURITY_KINDS = ['security', 'pentest', 'dependencies', 'data-protection'];
const FINDING_SECTIONS = [
  ['Security findings', SECURITY_KINDS],
  ['Review results', ['review', 'design', 'a11y', 'performance', 'maintainability', 'correctness']],
  ['Technical debt', ['debt']],
];

// ---------- helpers ----------
const now = () => new Date().toISOString();
class McError extends Error {}
// Throw rather than exit so `finally` blocks (lock release) always run; main() reports it.
function die(msg) { throw new McError(msg); }
const own = (o, k) => o != null && Object.hasOwn(o, k);
function checkId(kind, id) {
  if (typeof id !== 'string' || !id.length) die(`${kind} id required`);
  if (id === '__proto__') die(`invalid ${kind} id: ${id}`);
  return id;
}

// ---------- state lock ----------
// Exclusive cross-process lock around load -> mutate -> save -> render. mkdir is atomic on all
// platforms; the lock dir holds an owner token so we never release a lock we no longer hold.
const LOCK_STALE_MS = 10_000;
const LOCK_TIMEOUT_MS = 30_000;
const sleepCell = new Int32Array(new SharedArrayBuffer(4));
const sleep = (ms) => { Atomics.wait(sleepCell, 0, 0, ms); };
let heldLock = null; // { lock, token }
function releaseLock() {
  if (!heldLock) return;
  const { lock, token } = heldLock; heldLock = null;
  try { if (fs.readFileSync(path.join(lock, 'owner'), 'utf8') === token) fs.rmSync(lock, { recursive: true, force: true }); } catch { /* already gone or taken over */ }
}
process.on('exit', releaseLock);
function acquireLock(dir) {
  const lock = path.join(dir, 'state.lock');
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const start = Date.now();
  let delay = 5;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      fs.writeFileSync(path.join(lock, 'owner'), token);
      heldLock = { lock, token };
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    let st = null;
    try { st = fs.statSync(lock); } catch { continue; } // released between mkdir and stat: retry now
    if (Date.now() - st.mtimeMs > LOCK_STALE_MS) {
      // Stale takeover: atomically move the old lock aside, then verify we moved the one we judged stale.
      const aside = `${lock}.stale.${process.pid}.${Math.random().toString(36).slice(2)}`;
      try {
        fs.renameSync(lock, aside);
        const moved = fs.statSync(aside);
        if (moved.ino !== st.ino) { try { fs.renameSync(aside, lock); } catch { /* lock re-created meanwhile */ } }
        fs.rmSync(aside, { recursive: true, force: true });
      } catch { /* someone else took it over first */ }
      continue;
    }
    if (Date.now() - start > LOCK_TIMEOUT_MS) die(`timed out after ${LOCK_TIMEOUT_MS / 1000}s waiting for ${lock} (remove it if no other mc process is running)`);
    sleep(delay + Math.floor(Math.random() * delay));
    delay = Math.min(delay * 2, 100);
  }
}
function touchLock() { if (heldLock) { const t = new Date(); try { fs.utimesSync(heldLock.lock, t, t); } catch { /* ignore */ } } }
function withLock(dir, fn) {
  acquireLock(dir);
  try { return fn(); } finally { releaseLock(); }
}

function findLithosDir(start) {
  let dir = path.resolve(start);
  for (;;) {
    const cand = path.join(dir, '.lithos');
    if (fs.existsSync(path.join(cand, 'state.json'))) return cand;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// `--key value`, `--key=value`, or a bare `--key` (boolean). A value that itself starts with
// `--` can only be passed as `--key=--value`.
function parseFlags(argv) {
  const pos = []; const flags = Object.create(null);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.length > 2) {
      const eq = a.indexOf('=');
      if (eq > 2) { flags[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else { flags[key] = next; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}
// Conservative overlap test for owned paths. A non-glob path may be a file or a directory, so it
// covers itself and everything below it on a path-segment boundary ("src/api" covers
// "src/api/users.ts" but not "src/api.ts"). A glob covers everything starting with its literal
// prefix ("src/api/**" -> "src/api/"). False positives are preferred over missed conflicts.
function normPath(x) {
  let p = String(x).trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  while (p.startsWith('./')) p = p.slice(2);
  p = p.replace(/\/\.(?=\/|$)/g, '');
  if (p === '.') p = '';
  return p;
}
function pathsOverlap(f, g) {
  const isGlob = (x) => /[*?[{]/.test(x);
  const globPre = (x) => x.slice(0, x.search(/[*?[{]/));
  const dirOf = (x) => x.replace(/\/+$/, ''); // non-glob path treated as file-or-directory
  const under = (p, d) => d === '' || p === d || p.startsWith(d + '/');
  const [a, b] = [normPath(f), normPath(g)];
  if (a === b) return true;
  const ga = isGlob(a); const gb = isGlob(b);
  if (!ga && !gb) { const [da, db] = [dirOf(a), dirOf(b)]; return under(da, db) || under(db, da); }
  if (ga && gb) { const [pa, pb] = [globPre(a), globPre(b)]; return pa.startsWith(pb) || pb.startsWith(pa); }
  const [glob, plain] = ga ? [a, b] : [b, a];
  const pg = globPre(glob); const dp = dirOf(plain);
  // plain path matched by the glob prefix, or the glob lives inside the plain directory
  return dp.startsWith(pg) || under(pg.replace(/\/+$/, ''), dp) || (dp + '/').startsWith(pg);
}
const list = (v) => (typeof v === 'string' && v.length ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

function load(dir) {
  const st = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  for (const k of ['steps', 'agents', 'tasks']) if (!st[k] || typeof st[k] !== 'object') st[k] = {};
  for (const k of ['tests', 'findings']) if (!Array.isArray(st[k])) st[k] = [];
  // Monotonic finding counter; migrate older state files from the highest existing F<n>.
  if (!Number.isInteger(st.seq)) {
    st.seq = st.findings.reduce((m, f) => { const n = /^F(\d+)$/.exec(f && f.id); return n ? Math.max(m, Number(n[1])) : m; }, 0);
  }
  return st;
}
function normKind(k) {
  const v = String(k).trim().toLowerCase();
  return own(KIND_ALIASES, v) ? KIND_ALIASES[v] : v;
}
function save(dir, st) {
  touchLock();
  st.updatedAt = now();
  const tmp = path.join(dir, `state.json.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2));
  fs.renameSync(tmp, path.join(dir, 'state.json')); // atomic replace
}
function readEvents(dir) {
  const f = path.join(dir, 'events.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ---------- hook mode (stdin JSON from Claude Code) ----------
function runHook() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }
  let input; try { input = JSON.parse(raw); } catch { process.exit(0); }
  // Prefer the edited file's location (works for worktrees and subagents whose cwd differs).
  const fpHint = input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path);
  const dir = (fpHint && findLithosDir(path.dirname(fpHint))) || findLithosDir(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (!dir) process.exit(0); // no active Lithos run in this project → do nothing
  if (process.env.LITHOS_HOOK_DEBUG) fs.appendFileSync(path.join(dir, 'hook-raw.jsonl'), raw.trim() + '\n');
  const ev = { ts: now(), event: input.hook_event_name };
  if (input.agent_id) ev.agent_id = input.agent_id;
  if (input.agent_type) ev.agent_type = input.agent_type;
  // A subagent's own Stop hook (agent frontmatter) arrives as SubagentStop or Stop with agent_id set.
  if (input.hook_event_name === 'Stop' && input.agent_id) ev.event = 'SubagentStop';
  if (input.hook_event_name === 'PostToolUse' && (input.tool_name === 'Agent' || input.tool_name === 'Task')) {
    // Main-session signal that a delegated agent call returned.
    ev.event = 'AgentReturned';
    ev.subagent_type = (input.tool_input && input.tool_input.subagent_type) || 'general-purpose';
    const resp = input.tool_response;
    const rid = resp && typeof resp === 'object' ? (resp.agentId || resp.agent_id) : null;
    if (rid) ev.returned_agent_id = rid;
    if (resp && typeof resp === 'object') {
      if (Number.isFinite(resp.totalTokens)) ev.tokens = resp.totalTokens;
      if (Number.isFinite(resp.totalDurationMs)) ev.duration_ms = resp.totalDurationMs;
      if (typeof resp.status === 'string') ev.status = resp.status;
    }
    ev.background = Boolean(input.tool_input && input.tool_input.run_in_background);
    fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify(ev) + '\n');
    process.exit(0);
  }
  if (input.hook_event_name === 'PostToolUse') {
    const fp = input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path);
    if (!fp) process.exit(0);
    ev.tool = input.tool_name;
    const root = path.dirname(dir);
    const rel = path.relative(root, fp);
    if (rel.startsWith(path.join('.lithos', ''))) process.exit(0); // ignore our own files
    ev.file = rel.startsWith('..') ? fp : rel;
  }
  if (input.hook_event_name === 'SubagentStop' && typeof input.last_assistant_message === 'string') {
    ev.summary = input.last_assistant_message.slice(0, 280);
  }
  fs.appendFileSync(path.join(dir, 'events.jsonl'), JSON.stringify(ev) + '\n');
  process.exit(0);
}

// Files changed per git, relative to the project root (dirname of .lithos). Porcelain paths are
// relative to the repo toplevel; -z avoids quoting and gives renames as "XY dest\0orig\0".
function gitModified(root) {
  const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
  const top = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], opts).trim();
  const out = execFileSync('git', ['-C', root, 'status', '--porcelain', '-z', '--', '.'], opts);
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const rootReal = real(root); const topReal = real(top);
  const parts = out.split('\0');
  const files = new Set();
  for (let i = 0; i < parts.length; i++) {
    const e = parts[i];
    if (e.length < 4) continue;
    const xy = e.slice(0, 2);
    const file = e.slice(3);
    if (/[RC]/.test(xy)) i++; // skip the rename/copy source; keep the destination
    const rel = path.relative(rootReal, path.resolve(topReal, file));
    if (!rel || rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) continue; // outside project
    const posix = rel.split(path.sep).join('/') + (file.endsWith('/') ? '/' : '');
    if (posix === '.lithos' || posix.startsWith('.lithos/')) continue;
    files.add(posix);
  }
  return [...files];
}

// ---------- derived view ----------
function derive(st, events) {
  // Hook-observed subagents (ground truth of what actually ran)
  const observed = {};
  let measuredTokens = 0;
  for (const e of events) {
    if (e.event === 'SubagentStart' && e.agent_id) observed[e.agent_id] = { type: e.agent_type || 'unknown', status: 'active', startedAt: e.ts };
    if (e.event === 'SubagentStop' && e.agent_id) {
      const o = observed[e.agent_id] || { type: e.agent_type || 'unknown', startedAt: null };
      observed[e.agent_id] = { ...o, status: 'finished', endedAt: e.ts, summary: e.summary || o.summary };
    }
    if (e.event === 'AgentReturned') {
      // Prefer an exact id match; otherwise close the oldest still-active agent of that type.
      let id = e.returned_agent_id && observed[e.returned_agent_id] ? e.returned_agent_id : null;
      if (!id && !e.background) id = Object.keys(observed).find((k) => observed[k].status === 'active' && observed[k].type === e.subagent_type) || null;
      if (id && observed[id].status === 'active') observed[id] = { ...observed[id], status: 'finished', endedAt: e.ts };
      if (id && Number.isFinite(e.tokens)) observed[id].tokens = e.tokens;
      if (Number.isFinite(e.tokens)) measuredTokens += e.tokens;
    }
  }
  const files = {};
  for (const e of events) if (e.file) files[e.file] = (files[e.file] || 0) + 1;
  // Agents seen only through their own frontmatter hooks (e.g. workflow agents whose
  // SubagentStart fired in a session without the skill's hooks) are still real observations.
  for (const e of events) {
    if (e.agent_id && !observed[e.agent_id] && e.event !== 'AgentReturned') observed[e.agent_id] = { type: e.agent_type || 'unknown', status: 'seen via its tool events', startedAt: e.ts };
  }
  let gitFiles = [];
  try { gitFiles = gitModified(path.dirname(st.__dir)); } catch { /* not a git repo */ }
  const tasks = Object.values(st.tasks);
  const counted = tasks.filter((t) => t.status !== 'skipped');
  const done = counted.filter((t) => t.status === 'done').length;
  const stepsDone = Object.values(st.steps).filter((s) => s.status === 'done' || s.status === 'skipped').length;
  const progress = counted.length ? Math.round((done / counted.length) * 100) : 0;
  const lifecycle = Math.round((stepsDone / STEPS.length) * 100);
  return { observed, files, gitFiles, done, total: counted.length, progress, lifecycle, measuredTokens };
}

// ---------- rendering ----------
function renderMarkdown(st, d) {
  const L = [];
  const agents = Object.entries(st.agents);
  L.push(`# Lithos Ultra — Mission Control`, '');
  L.push(`**Task:** ${st.task}  `, `**Mode:** ${st.mode} · **Agent budget:** ${st.budget ?? 'n/a'} · **Started:** ${st.createdAt} · **Updated:** ${st.updatedAt}`, '');
  L.push(`**Task progress:** ${d.done}/${d.total} tasks done (${d.progress}%) · **Lifecycle:** ${d.lifecycle}%`, '');
  L.push(`**Measured subagent tokens (foreground Agent calls):** ${d.measuredTokens ? d.measuredTokens.toLocaleString('en-US') : 'none recorded'}`, '');
  if (st.run) L.push(`Workflow run: \`${st.run.runId}\` (${st.run.scriptPath})`, '');
  L.push('## Lifecycle');
  for (const [n, s] of Object.entries(st.steps)) L.push(`- [${s.status === 'done' ? 'x' : ' '}] ${n}. ${s.name} — ${s.status}${s.note ? ` (${s.note})` : ''}`);
  L.push('', '## Planned team (orchestrator-registered)');
  if (!agents.length) L.push('_none registered_');
  else { L.push('| Agent | Role | Responsibility | Status |', '|---|---|---|---|'); for (const [id, a] of agents) L.push(`| ${id} | ${a.role} | ${a.responsibility || ''} | ${a.status} |`); }
  const obs = Object.entries(d.observed);
  L.push('', `## Subagents observed by hooks (${obs.length})`);
  if (!obs.length) L.push('_no SubagentStart events recorded yet_');
  else { L.push('| Agent id | Type | Status | Started | Ended | Tokens |', '|---|---|---|---|---|---|'); for (const [id, o] of obs) L.push(`| ${id} | ${o.type} | ${o.status === 'active' ? 'started (no stop event yet)' : o.status} | ${o.startedAt || ''} | ${o.endedAt || ''} | ${o.tokens ?? ''} |`); }
  const byStatus = (s) => Object.entries(st.tasks).filter(([, t]) => t.status === s);
  for (const [title, s] of [['Current tasks', 'in_progress'], ['Blocked tasks', 'blocked'], ['Failed tasks', 'failed'], ['Pending tasks', 'pending'], ['Completed tasks', 'done']]) {
    const rows = byStatus(s);
    L.push('', `## ${title} (${rows.length})`);
    for (const [id, t] of rows) L.push(`- **${id}** ${t.title} — owner \`${t.owner}\`${t.files.length ? ` · files: ${t.files.join(', ')}` : ''}${t.deps.length ? ` · deps: ${t.deps.join(', ')}` : ''}${t.note ? ` · _${t.note}_` : ''}`);
  }
  L.push('', '## Files modified');
  const fileSet = new Set([...Object.keys(d.files), ...d.gitFiles]);
  if (!fileSet.size) L.push('_none_');
  for (const f of [...fileSet].sort()) L.push(`- ${f}${d.files[f] ? ` (${d.files[f]} edit event${d.files[f] > 1 ? 's' : ''})` : ' (git)'}`);
  L.push('', '## Test results');
  if (!st.tests.length) L.push('_no test runs recorded_');
  else { L.push('| When | Name | Command | Status | Summary |', '|---|---|---|---|---|'); for (const t of st.tests) L.push(`| ${t.ts} | ${t.name} | \`${t.cmd || ''}\` | ${t.status.toUpperCase()} | ${t.summary || ''} |`); }
  const sectioned = new Set(FINDING_SECTIONS.flatMap(([, kinds]) => kinds));
  const other = st.findings.filter((f) => !sectioned.has(f.kind));
  const sections = [...FINDING_SECTIONS, ...(other.length ? [['Other findings', null]] : [])];
  for (const [title, kinds] of sections) {
    const fs_ = kinds ? st.findings.filter((f) => kinds.includes(f.kind)) : other;
    L.push('', `## ${title} (${fs_.length})`);
    if (!fs_.length) L.push('_none recorded_');
    for (const f of fs_) L.push(`- ${f.id ? `${f.id} ` : ''}[${f.severity}] **${f.title}** — ${f.status}${f.file ? ` · ${f.file}` : ''}${!kinds || f.kind !== kinds[0] ? ` · ${f.kind}` : ''}`);
  }
  L.push('', '---', '_Generated from .lithos/state.json and hook events in .lithos/events.jsonl. No simulated data._');
  return L.join('\n') + '\n';
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderHtml(st, d, refresh) {
  const chip = (s) => `<span class="chip s-${esc(s)}">${esc(s)}</span>`;
  const table = (head, rows) => rows.length ? `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="empty">None recorded.</p>';
  const tasks = Object.entries(st.tasks);
  const obs = Object.entries(d.observed);
  const fileSet = [...new Set([...Object.keys(d.files), ...d.gitFiles])].sort();
  const sec = st.findings.filter((f) => SECURITY_KINDS.includes(f.kind));
  const rev = st.findings.filter((f) => !SECURITY_KINDS.includes(f.kind)); // everything else, incl. unknown legacy kinds
  const activeObs = obs.filter(([, o]) => o.status === 'active').length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${refresh ? '<meta http-equiv="refresh" content="5">' : ''}<title>Lithos Mission Control</title>
<style>
:root{--bg:#f6f5f2;--panel:#fff;--ink:#1b1b1a;--muted:#6b6a66;--line:#e3e1db;--ok:#2f6b4f;--warn:#9a6a12;--bad:#a23b2c;--info:#2d4f7c}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--panel:#1d1d1b;--ink:#ecebe6;--muted:#9c9a93;--line:#30302c;--ok:#6fbf95;--warn:#d9a54a;--bad:#e07a68;--info:#86a9d9}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px 16px 64px}h1{font-size:20px;margin:0;letter-spacing:-.01em}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 10px}
.meta{color:var(--muted);margin:4px 0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.kpi,.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px}.kpi b{display:block;font-size:22px;font-variant-numeric:tabular-nums}.kpi span{color:var(--muted);font-size:12px}
.bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:var(--ok)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:820px){.cols{grid-template-columns:1fr}}.panel{margin-bottom:12px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:500}
code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.empty{color:var(--muted);margin:0}
.chip{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;border:1px solid currentColor}.s-done,.s-pass,.s-finished,.s-fixed{color:var(--ok)}.s-in_progress,.s-active{color:var(--info)}.s-blocked,.s-open,.s-pending{color:var(--warn)}.s-failed,.s-fail{color:var(--bad)}
ol{margin:0;padding-left:20px}li{margin:2px 0}
</style></head><body><main>
<h1>Lithos Mission Control</h1><p class="meta">${esc(st.task)} · mode <b>${esc(st.mode)}</b> · budget ${esc(st.budget ?? 'n/a')} · updated ${esc(st.updatedAt)}</p>
<div class="grid">
<div class="kpi"><b>${d.progress}%</b><span>${d.done}/${d.total} tasks done</span><div class="bar"><i style="width:${d.progress}%"></i></div></div>
<div class="kpi"><b>${d.lifecycle}%</b><span>lifecycle steps</span><div class="bar"><i style="width:${d.lifecycle}%"></i></div></div>
<div class="kpi"><b>${activeObs}/${obs.length}</b><span>subagents active / observed</span></div>
<div class="kpi"><b>${fileSet.length}</b><span>files modified</span></div>
<div class="kpi"><b>${d.measuredTokens ? (d.measuredTokens / 1000).toFixed(0) + 'k' : '—'}</b><span>measured subagent tokens</span></div>
<div class="kpi"><b>${st.tests.filter((t) => t.status === 'pass').length}/${st.tests.length}</b><span>test runs passing</span></div>
<div class="kpi"><b>${sec.filter((f) => f.status === 'open').length}</b><span>open security findings</span></div>
</div>
<div class="cols">
<div class="panel"><h2>Lifecycle</h2><ol>${Object.values(st.steps).map((s) => `<li>${esc(s.name)} ${chip(s.status)}</li>`).join('')}</ol></div>
<div class="panel"><h2>Planned team</h2>${table(['Agent', 'Role', 'Responsibility', 'Status'], Object.entries(st.agents).map(([id, a]) => [esc(id), `<code>${esc(a.role)}</code>`, esc(a.responsibility), chip(a.status)]))}</div>
</div>
<div class="panel"><h2>Subagents observed by hooks</h2>${table(['Agent id', 'Type', 'Status', 'Started', 'Ended', 'Tokens'], obs.map(([id, o]) => [`<code>${esc(id)}</code>`, esc(o.type), chip(o.status), esc(o.startedAt), esc(o.endedAt), esc(o.tokens ?? '')]))}</div>
<div class="panel"><h2>Tasks</h2>${table(['Id', 'Task', 'Owner', 'Files', 'Deps', 'Status'], tasks.map(([id, t]) => [esc(id), esc(t.title) + (t.note ? `<br><small>${esc(t.note)}</small>` : ''), `<code>${esc(t.owner)}</code>`, esc(t.files.join(', ')), esc(t.deps.join(', ')), chip(t.status)]))}</div>
<div class="cols">
<div class="panel"><h2>Test results</h2>${table(['Name', 'Command', 'Status', 'Summary'], st.tests.map((t) => [esc(t.name), `<code>${esc(t.cmd)}</code>`, chip(t.status), esc(t.summary)]))}</div>
<div class="panel"><h2>Files modified</h2>${fileSet.length ? `<ul>${fileSet.map((f) => `<li><code>${esc(f)}</code></li>`).join('')}</ul>` : '<p class="empty">None.</p>'}</div>
</div>
<div class="cols">
<div class="panel"><h2>Security findings</h2>${table(['Kind', 'Severity', 'Finding', 'Status'], sec.map((f) => [esc(f.kind), esc(f.severity), esc(f.title) + (f.file ? `<br><code>${esc(f.file)}</code>` : ''), chip(f.status)]))}</div>
<div class="panel"><h2>Review results</h2>${table(['Kind', 'Severity', 'Finding', 'Status'], rev.map((f) => [esc(f.kind), esc(f.severity), esc(f.title) + (f.file ? `<br><code>${esc(f.file)}</code>` : ''), chip(f.status)]))}</div>
</div>
<p class="meta">Rendered from .lithos/state.json and real hook events. Nothing on this page is simulated.</p>
</main></body></html>`;
}

function render(dir, st) {
  st.__dir = dir;
  const d = derive(st, readEvents(dir));
  delete st.__dir;
  fs.writeFileSync(path.join(dir, 'STATUS.md'), renderMarkdown(st, d));
  fs.writeFileSync(path.join(dir, 'status.html'), renderHtml(st, d, false));
  return d;
}

// ---------- commands ----------
function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'hook') return runHook();
  const { pos, flags } = parseFlags(rest);
  const cwd = flags.dir ? path.resolve(flags.dir) : process.cwd();

  if (cmd === 'init') {
    const dir = path.join(cwd, '.lithos');
    if (fs.existsSync(path.join(dir, 'state.json')) && !flags.force) die('.lithos/state.json already exists (use `resume`, or --force to start a new run; the old state is archived)');
    fs.mkdirSync(dir, { recursive: true });
    withLock(dir, () => initRun(dir, flags));
    console.log(`initialised ${dir}`);
    return;
  }

  const dir = findLithosDir(cwd);
  if (!dir) die('no .lithos/state.json found (run `mc.mjs init` first)');
  const LOCKED = ['step', 'agent', 'task', 'test', 'finding', 'run', 'render'];
  if (LOCKED.includes(cmd)) withLock(dir, () => execCommand(cmd, dir, pos, flags));
  else execCommand(cmd, dir, pos, flags); // read-only commands and help: no lock
}

function initRun(dir, flags) {
  if (fs.existsSync(path.join(dir, 'state.json')) && !flags.force) die('.lithos/state.json already exists (use `resume`, or --force to start a new run; the old state is archived)');
  if (fs.existsSync(path.join(dir, 'state.json'))) {
    const arch = path.join(dir, 'archive', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(arch, { recursive: true });
    for (const f of ['state.json', 'events.jsonl', 'STATUS.md', 'status.html', 'REPORT.md', 'architecture.md']) if (fs.existsSync(path.join(dir, f))) fs.renameSync(path.join(dir, f), path.join(arch, f));
  }
  const steps = {}; STEPS.forEach((name, i) => { steps[i + 1] = { name, status: 'pending' }; });
  const st = { version: 1, mode: flags.mode || 'build', task: flags.task || '(unspecified)', budget: flags.budget ? Number(flags.budget) : null, createdAt: now(), updatedAt: now(), steps, agents: {}, tasks: {}, tests: [], findings: [], seq: 0, run: null };
  save(dir, st);
  // keep run state out of git unless the user decides otherwise
  if (!fs.existsSync(path.join(dir, '.gitignore'))) fs.writeFileSync(path.join(dir, '.gitignore'), '*\n');
  render(dir, st);
}

function execCommand(cmd, dir, pos, flags) {
  const st = load(dir);

  switch (cmd) {
    case 'step': {
      const [n, status] = pos;
      if (!own(st.steps, n)) die(`unknown step ${n} (1-${STEPS.length})`);
      if (!STEP_STATES.includes(status)) die(`status must be one of ${STEP_STATES.join(', ')}`);
      st.steps[n].status = status; if (flags.note) st.steps[n].note = String(flags.note);
      break;
    }
    case 'agent': {
      const [sub, id] = pos;
      checkId('agent', id);
      if (sub === 'add') st.agents[id] = { role: flags.role || id, responsibility: flags.resp || '', status: 'planned' };
      else if (sub === 'status') { if (!own(st.agents, id)) die(`unknown agent ${id}`); st.agents[id].status = pos[2] || 'done'; }
      else die('usage: agent add <id> --role <agentType> --resp "<text>" | agent status <id> <planned|active|done|failed>');
      break;
    }
    case 'task': {
      const [sub, id, status] = pos;
      checkId('task', id);
      if (sub === 'add') st.tasks[id] = { title: flags.title || id, owner: flags.owner || 'orchestrator', files: list(flags.files), deps: list(flags.deps), status: 'pending', note: '' };
      else if (sub === 'status') {
        if (!own(st.tasks, id)) die(`unknown task ${id}`);
        if (!TASK_STATES.includes(status)) die(`status must be one of ${TASK_STATES.join(', ')}`);
        st.tasks[id].status = status; if (flags.note) st.tasks[id].note = String(flags.note);
      } else die('usage: task add <id> --title --owner --files a,b --deps x,y | task status <id> <state> [--note]');
      break;
    }
    case 'check-ownership': {
      // A file/glob owned by two tasks that may run concurrently (neither depends on the other, transitively) is a conflict.
      const ids = Object.keys(st.tasks);
      const reach = (a, b, seen = new Set()) => { if (seen.has(a)) return false; seen.add(a); return ((own(st.tasks, a) && st.tasks[a].deps) || []).some((d) => d === b || reach(d, b, seen)); };
      const conflicts = [];
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const [a, b] = [ids[i], ids[j]];
        if (reach(a, b) || reach(b, a)) continue;
        const shared = st.tasks[a].files.filter((f) => st.tasks[b].files.some((g) => pathsOverlap(f, g)));
        if (shared.length) conflicts.push({ a, b, shared });
      }
      const cycles = ids.filter((id) => reach(id, id));
      if (cycles.length) console.log(`DEPENDENCY CYCLE involving: ${cycles.join(', ')}`);
      if (!conflicts.length && !cycles.length) { console.log(`ok: ${ids.length} tasks, no ownership conflicts, no cycles`); return; }
      for (const c of conflicts) console.log(`CONFLICT ${c.a} <-> ${c.b}: ${c.shared.join(', ')}`);
      process.exit(2);
    }
    case 'waves': {
      // Topological layering → which tasks can run in parallel.
      const left = new Set(Object.keys(st.tasks).filter((id) => !['done', 'skipped'].includes(st.tasks[id].status)));
      const doneSet = new Set(Object.keys(st.tasks).filter((id) => ['done', 'skipped'].includes(st.tasks[id].status)));
      let w = 1;
      while (left.size) {
        const wave = [...left].filter((id) => st.tasks[id].deps.every((d) => doneSet.has(d) || !own(st.tasks, d)));
        if (!wave.length) die(`unschedulable (cycle or missing dep): ${[...left].join(', ')}`);
        console.log(`wave ${w++}: ${wave.join(', ')}`);
        wave.forEach((id) => { left.delete(id); doneSet.add(id); });
      }
      return;
    }
    case 'test': {
      if (pos[0] !== 'add') die('usage: test add --name --cmd --status pass|fail --summary');
      const status = String(flags.status || '').toLowerCase();
      if (!['pass', 'fail'].includes(status)) die('--status must be pass or fail');
      st.tests.push({ ts: now(), name: flags.name || 'test', cmd: flags.cmd || '', status, summary: flags.summary || '' });
      break;
    }
    case 'finding': {
      const [sub, idx] = pos;
      if (sub === 'add') {
        const kind = flags.kind === undefined ? 'review' : normKind(flags.kind === true ? '' : flags.kind);
        if (!FINDING_KINDS.includes(kind)) die(`unknown finding kind "${flags.kind === true ? '' : flags.kind}"; valid kinds: ${FINDING_KINDS.join(', ')} (alias: accessibility -> a11y)`);
        st.seq += 1; // allocated under the state lock: unique even with concurrent invocations
        const f = { id: `F${st.seq}`, kind, severity: flags.severity || 'medium', title: flags.title || '(untitled)', file: flags.file || '', status: flags.status || 'open', ts: now() };
        st.findings.push(f); console.log(f.id);
      } else if (sub === 'status') {
        const f = st.findings.find((x) => x.id === idx); if (!f) die(`unknown finding ${idx}`);
        f.status = pos[2] || 'fixed';
      } else die(`usage: finding add --kind ${FINDING_KINDS.join('|')} --severity --title --file [--status] | finding status <F#> <open|fixed|rejected|accepted>`);
      break;
    }
    case 'run': { st.run = { runId: pos[0], scriptPath: pos[1] || '', ts: now() }; break; }
    case 'render': { const d = render(dir, st); console.log(`rendered ${path.join(dir, 'STATUS.md')} and status.html — ${d.done}/${d.total} tasks, lifecycle ${d.lifecycle}%`); return; }
    case 'json': { st.__dir = dir; const d = derive(st, readEvents(dir)); delete st.__dir; console.log(JSON.stringify({ ...st, derived: d }, null, 2)); return; }
    case 'serve': {
      const port = Number(flags.port || 4317);
      const server = http.createServer((req, res) => {
        try {
          const cur = load(dir); cur.__dir = dir; const d = derive(cur, readEvents(dir)); delete cur.__dir;
          if (req.url === '/state.json') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ...cur, derived: d })); return; }
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(renderHtml(cur, d, true));
        } catch { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('mission control: could not read state'); }
      });
      server.listen(port, '127.0.0.1', () => console.log(`Lithos Mission Control on http://127.0.0.1:${port} (local only, Ctrl+C to stop)`));
      return;
    }
    default:
      console.log(`Lithos Mission Control
  init --mode <m> --task "<t>" [--budget N] [--force]
  step <1-14> <pending|in_progress|done|skipped|blocked> [--note]
  agent add <id> --role <agentType> --resp "<text>" | agent status <id> <state>
  task add <id> --title --owner --files a,b --deps x,y | task status <id> <state> [--note]
  check-ownership | waves
  test add --name --cmd --status pass|fail --summary
  finding add --kind <${FINDING_KINDS.join('|')}> --severity --title [--file] | finding status <F#> <state>
  run <runId> <scriptPath>
  render | json | serve [--port 4317]
  hook   (stdin JSON from Claude Code hooks)`);
      return;
  }
  save(dir, st);
  render(dir, st);
}

try {
  main();
} catch (e) {
  if (e instanceof McError) { process.stderr.write(`mc: ${e.message}\n`); process.exit(1); }
  process.stderr.write(`mc: unexpected error: ${e && e.message ? e.message : e}\n`);
  process.exit(1);
}
