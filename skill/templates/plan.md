# Lithos Ultra — Execution Plan (approval checkpoint)

**Task:** <one line>  
**Mode:** <mode> (<inferred because …> | requested)  
**Business outcome:** <metric this work should move>  
**Assumptions:** <bullets; anything the user should correct>

## Architecture (summary)
<5–10 lines; full version in .lithos/architecture.md>

## Team (<N> agents of a <ceiling> ceiling)
| Agent | Role | Responsibility | Why needed |
|---|---|---|---|

Roles considered but not activated: <list + one-line reason>

## Tasks & ownership
| Id | Task | Owner | Owned files | Depends on |
|---|---|---|---|---|

Ownership check: <output of mc.mjs check-ownership>  
Execution waves: <output of mc.mjs waves>  
Isolation: <shared file-ownership | worktree>

## Verification plan
Review lenses: <…> · Verify votes: <n> · Max fix rounds: <n>  
Commands: <build / typecheck / lint / test commands that will be run>  
Visual checks: <screenshots at 375/768/1440 | n/a>

## Estimated resources
Agent invocations: <implementers + reviewers + verifiers ≈ total>  
Rough token range: <low–high from config/budgets.json estimates> (planning estimate, not a measurement)

## Not in scope / requires your authorization
<deploy, push, production data, paid services, real messages — none will be done without your OK>

**Approve to start execution.**
