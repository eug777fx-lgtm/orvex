# Lithos Ultra — Execution Rules

## 1. Roles
- **Orchestrator** = the main Claude Code session running `/lithos-ultra`. It plans, assigns,
  integrates, runs the final verification and reports. It is the only party that spawns agents.
- **Specialists** = `lithos-*` subagents. They implement or review. Their definitions disallow the
  `Agent` tool, so they cannot delegate (no circular or runaway delegation).
- Built-in `Explore` may be used for read-only discovery.

## 2. Team sizing
- Budgets in `config/budgets.json` are ceilings. Start from the minimum team that covers the work.
- A role is activated only when it owns a task or a review lens. Never pad the team to reach a
  number. Small projects routinely use fewer agents than the mode minimum — say so in the plan.
- `--agents N` overrides the mode ceiling (clamped to `absoluteMax`).

## 3. Preventing conflicting edits
Default **shared-tree, file-ownership** model:
1. Every implementation task declares owned files/globs.
2. `mc.mjs check-ownership` must report no conflicts between tasks that can run concurrently.
3. Shared seams (root `package.json`, lockfiles, global config, route registries, DB schema index,
   `.env.example`) are owned by ONE task or by the orchestrator in the integration step.
4. Specialists report out-of-ownership needs in `needs`; the orchestrator applies them.
5. Specialists never run repo-wide rewrites (formatters on everything, codemods, `git checkout`,
   `git stash`, lockfile regeneration) unless they own those files.

Optional **worktree** model (`--isolation worktree`, default for swarm):
- Each implementer runs with `isolation: worktree` and commits locally on its branch.
- Worktrees branch from the default branch (or `HEAD` if the user's `worktree.baseRef` is `head`),
  so the orchestrator must commit the baseline plan/scaffold locally first.
- The orchestrator merges branches one at a time, building after each merge. Never pushes.

## 4. No duplicate work
- One task = one owner. The orchestrator checks the discovery inventory before creating tasks so
  existing functionality is reused, not rebuilt.
- Completed tasks (`done` in `.lithos/state.json`) are never re-run on resume.

## 5. Bounded loops
- Failed task: at most `maxRetries` retries (default 1), then `blocked` with a reason.
- Review/fix: at most `maxFixRounds` rounds; findings must survive adversarial verification
  (majority of `verifyVotes` refuters fail to refute) before anyone fixes them.
- Rechecks only look at files changed by fixes. Dedup is against everything already seen, so
  rejected findings do not reappear.
- After the bound: report remaining items as open. Never loop "until perfect".

## 6. Honest status
- Mission control records only what happened. Agents observed by hooks are listed separately from
  the planned team. Tests are recorded with the exact command and the observed result.
- Never write "all tests pass" without a recorded passing run. Never fabricate metrics, screenshots
  or review outcomes.

## 7. Interruption & resume
- All plan/progress state is in `.lithos/state.json`; hook events in `.lithos/events.jsonl`;
  architecture in `.lithos/architecture.md`.
- Workflow templates are passed inline (`script`); record the run id and the persisted script path
  the tool returns with `mc.mjs run <runId> <scriptPath>`. Resume with
  `Workflow({scriptPath, resumeFromRunId})` – finished agent calls replay from cache. Resume works
  within the same Claude Code session; after a restart, re-run only tasks not marked `done`.
- `/lithos-ultra resume` continues from the first lifecycle step that is not done.

## 8. Fallbacks
- Workflow tool unavailable (plan without dynamic workflows, `disableWorkflows`) → Agent tool, one
  wave of independent tasks per message in the background, then the next wave.
- Agent teams are experimental and require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and an
  interactive session; Lithos Ultra does not depend on them.
