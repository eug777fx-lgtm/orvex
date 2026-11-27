# Lithos Ultra — Mode Playbooks

Ceilings and verification settings live in `config/budgets.json`. All modes follow the 14-step
lifecycle in SKILL.md; this file says what changes per mode.

## quick — 3–5 agents
Small, well-bounded change (bug fix, endpoint, component, script).
- Discovery inline (no discover workflow). Architecture = 3–5 lines in the plan, no file.
- Typical team: 1–2 implementers + `lithos-code-reviewer` + 1 verifier (+ `lithos-qa-engineer`
  if there are no tests to run).
- No approval checkpoint unless the plan exceeds the mode max (5) or touches anything in security policy §A.
- ≤ 2 tasks may run via the Agent tool directly instead of the execute workflow.

## build — 8–15 agents
A feature set or a new application.
- Discovery via `lithos-discover.js` when the repo has > ~50 source files; else inline.
- `lithos-software-architect` writes/validates `.lithos/architecture.md`.
- Team drawn from engineering + design (if customer-facing) + verification.
- Review lenses: correctness, adversarial, security; + design/accessibility for UI.
- Checkpoint always.

## enterprise — 15–30 agents
Multi-tenant SaaS, multi-service systems, compliance-sensitive data, several integrations.
- Management department active: `lithos-product-manager` (outcomes, scope), `lithos-requirements-analyst`
  (acceptance criteria), `lithos-technical-project-manager` (task graph, risks) – each produces a
  file under `.lithos/` and finishes; they don't stay resident.
- Architecture must include tenancy model, authz matrix, data retention, observability, rollout plan.
- Review lenses: correctness, adversarial, security, performance, accessibility, design; 3 verify votes.
- Pentest specialist runs against the local build only.
- Checkpoint always, plus a second checkpoint before any migration or integration with external sandboxes.

## swarm — up to 100 agents (subject to platform limits)
Very large but highly parallel work: migrations across many modules, large test backfills,
multi-module scaffolding, broad audits.
- Only appropriate when work splits into many truly independent units. If it doesn't, downgrade to
  enterprise and say why.
- Default `isolation: worktree`; merge branches sequentially.
- Workflow concurrency is capped (default 16 concurrently, `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`,
  and by CPU count); 100 agents run in queued batches, not all at once.
- Checkpoint must state agent count, waves, worst-case token range and the merge plan.

## audit — 5–10 agents
Review only, no implementation unless the user asks afterwards.
- Steps 8, 9 and 11 are skipped (no implementation); steps 5–6 plan the review lenses instead of
  tasks; step 10 runs the review; step 14 always delivers the report. Fix rounds = 0.
- Use `lithos-review.js` with `fix: false` and lenses chosen from: correctness, security,
  pentest (local), performance, accessibility, design, dependencies, data-protection, maintainability.
- Deliverable: `.lithos/REPORT.md` with verified findings ranked by business impact, each with
  evidence and a concrete fix; rejected findings listed separately.

## design — 4–8 agents
Customer-facing design work: design system, redesign, new screens, landing/portal UX.
- Always read `reference/design-intelligence.md`.
- Team: `lithos-creative-director` (direction brief) → `lithos-design-systems-specialist` (tokens,
  components) → `lithos-ui-ux-designer` / `lithos-frontend-engineer` (screens) →
  `lithos-accessibility-specialist` (always) + `lithos-motion-designer` (only if motion is in scope).
- Verification: Playwright screenshots at 375/768/1440 (light + dark if supported), reviewed by a
  design lens reviewer who did not build the screens; max 2 fix rounds.

## Natural-language invocation
`/lithos-ultra <description>` with no mode word: infer the mode from scope (see SKILL.md §0),
announce it with one sentence of reasoning, and proceed. The user can override at the checkpoint.

## Custom budgets
`--agents N` sets the ceiling. If N is below what the plan needs, merge tasks or sequence them and
say what was traded off; if above, still use the smallest effective team.
