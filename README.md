# Lithos Ultra

Private Claude Code skill for **Lithos Labs**: an orchestrated, multi-agent engineering system that
plans, implements, reviews, verifies and reports on client projects using native Claude Code
features only (skills, subagents, dynamic workflows, hooks, worktrees). No third-party packages.

## Install / update

```bash
git clone <your private repo> lithos-ultra   # or copy this folder
```

```bash
cd lithos-ultra && ./install.sh
```

Installs at user scope (all projects):

- `~/.claude/skills/lithos-ultra/`: skill, policies, references, templates, workflow templates, scripts
- `~/.claude/agents/lithos-*.md`: 28 specialist subagents
- `~/.claude/workflows/lithos-{discover,execute,review}.js`: saved workflows that the skill calls by name. They also appear as the `/lithos-discover`, `/lithos-execute` and `/lithos-review` commands.

Re-running `install.sh` updates in place and backs up the previous version to
`~/.claude/backups/lithos-ultra-<timestamp>/`. `CLAUDE_CONFIG_DIR` is respected. Requires Node.js 18 or later.
Run `./install.sh --check` to verify an install. A config dir containing a backslash is rejected. Restart Claude Code or run `/reload-skills` after updating.

## Uninstall

```bash
./uninstall.sh
```

This removes only the files recorded in the install manifest: the skill, the package's agents and the saved workflows. Your own `lithos-*` files and your projects' `.lithos/` folders are untouched. If the manifest is missing or from an older version, the script refuses to guess and lists the candidate files. `./uninstall.sh --force` then removes exactly the files this package ships.

## Commands

```
/lithos-ultra quick [task]          3–5 agents, no checkpoint unless over budget
/lithos-ultra build [task]          8–15 agents, approval checkpoint
/lithos-ultra enterprise [task]     15–30 agents, approval checkpoint(s)
/lithos-ultra swarm [task]          up to 100 agents (queued; platform concurrency limits apply)
/lithos-ultra audit [task]          5–10 agents, review only, verified findings report
/lithos-ultra design [task]         4–8 agents, design system + screens + visual verification
/lithos-ultra status                render and show mission control
/lithos-ultra resume                continue an interrupted run from .lithos/state.json
/lithos-ultra <plain description>   mode inferred and announced
Flags: --agents N   --isolation worktree   --yes (pre-approve the checkpoint for this run)
```

Budgets are ceilings. The orchestrator uses the smallest effective team.

## How it works

1. **Orchestrator = your main session.** The skill runs inline (not forked), because only the main
   session reliably has the Workflow and Agent tools, and nested subagents may be disabled
   (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`).
2. **Specialists = `lithos-*` subagents.** Their `tools` allowlists exclude `Agent`, so they cannot
   delegate. Reviewers (code, adversarial, security, pentest) have no Edit/Write tools.
3. **Parallel execution = native Workflow tool** with three parameterized templates. They are installed as saved workflows and called by name. If a name isn't found, the template is pasted inline, because Workflow only loads a `scriptPath` from the working directory, an added directory, or a path it returned itself.
   - `lithos-discover.js`: parallel read-only codebase mapping, then a synthesis
   - `lithos-execute.js`: implements a task DAG; each task starts as soon as its own dependencies finish; bounded retries; optional worktree isolation
   - `lithos-review.js`: multi-lens independent review, then adversarial verification (majority vote), fixes by the owning specialist, then a recheck, with bounded rounds

   If workflows are unavailable, the skill falls back to the Agent tool, one wave of tasks at a time.
4. **Conflict prevention.** Every task declares owned files. `mc.mjs check-ownership` rejects overlaps
   between tasks that can run concurrently, and shared seams belong to the orchestrator. In worktree
   mode, branches are merged locally one at a time.
5. **Mission control.** `scripts/mc.mjs` keeps `.lithos/state.json`, which only the orchestrator writes.
   Hooks declared in the skill's and agents' frontmatter append real `SubagentStart`/`SubagentStop`
   and file-edit events to `.lithos/events.jsonl`. `render` produces `STATUS.md` and `status.html`;
   `serve` runs a local auto-refreshing page at `http://127.0.0.1:4317`. Planned agents and
   hook-observed agents are shown separately, so nothing is simulated.
6. **Guard.** `scripts/guard.mjs` is a PreToolUse hook. It returns `ask` for push, deploy, infra changes,
   migrations, production database clients, live messaging/payment APIs, secret files, and disabled
   TLS or git hooks. It returns `deny` for `rm -rf /` and similar commands. It never returns `allow`, so it
   cannot weaken your permission settings.

## Layout

```
lithos-ultra/
├── install.sh / uninstall.sh / VERSION / README.md
├── agents/                     28 × lithos-*.md (generated by tools/gen-agents.mjs, editable)
├── tools/gen-agents.mjs        roster → agent files
├── tests/run-tests.mjs         self-tests (guard, mission control, workflow logic in a simulated runtime)
├── tests/regression.mjs        regression tests for the 33 findings from the independent review
└── skill/                      → ~/.claude/skills/lithos-ultra/
    ├── SKILL.md                entry point: parsing, lifecycle, hard rules, hooks
    ├── config/budgets.json     mode ceilings, verify votes, fix rounds, estimates, platform limits
    ├── policies/               security.md, execution-rules.md
    ├── reference/              modes.md, roster.md, design-intelligence.md, business-systems.md
    ├── templates/              plan.md (checkpoint), final-report.md
    ├── workflows/              lithos-discover.js, lithos-execute.js, lithos-review.js
    └── scripts/                mc.mjs (mission control), guard.mjs (safety hook)
```

## Improving it

- Edit roles in `tools/gen-agents.mjs`, then run `node tools/gen-agents.mjs`. You can also edit `agents/*.md` directly and stop using the generator.
- Tune budgets, verify votes and fix rounds in `skill/config/budgets.json`.
- Add business playbooks to `skill/reference/business-systems.md`.
- Run `node tests/run-tests.mjs && node tests/regression.mjs` before every `./install.sh`. That's 165 tests, and the installer tests use a temporary `CLAUDE_CONFIG_DIR`.

## Known limitations

See the "Known limitations" section of the delivery report, or `skill/policies/execution-rules.md` §8.
