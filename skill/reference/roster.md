# Lithos Ultra — Specialist Roster

All specialists are Claude Code subagents installed in `~/.claude/agents/` with the `lithos-`
prefix. Use the exact `agentType` below in workflow `args` or the Agent tool's `subagent_type`.
Specialists cannot spawn agents. "Edits" = may create/modify files it owns.

| Department | agentType | Edits | Activate when |
|---|---|---|---|
| Management | `lithos-orchestrator` | yes | Only as a main-session agent (`claude --agent lithos-orchestrator`); never spawned as a subagent |
| Management | `lithos-product-manager` | `.lithos/` docs | enterprise; unclear business outcome; multiple user groups |
| Management | `lithos-technical-project-manager` | `.lithos/` docs | > 8 tasks; cross-team dependencies; swarm planning |
| Management | `lithos-requirements-analyst` | `.lithos/` docs | vague requirements; acceptance criteria needed; discovery synthesis |
| Engineering | `lithos-software-architect` | `.lithos/architecture.md`, ADRs | build+ modes; new systems; major refactors |
| Engineering | `lithos-frontend-engineer` | yes | web UI, components, client state |
| Engineering | `lithos-backend-engineer` | yes | services, business logic, jobs |
| Engineering | `lithos-fullstack-engineer` | yes | small vertical slices where splitting FE/BE adds overhead |
| Engineering | `lithos-database-engineer` | yes | schema, migrations, indexes, RLS, query performance |
| Engineering | `lithos-api-engineer` | yes | public/partner APIs, OpenAPI, versioning, webhooks |
| Engineering | `lithos-ai-systems-engineer` | yes | LLM features, agents, RAG, evals, prompt-injection defences |
| Engineering | `lithos-automation-engineer` | yes | business-process automation, schedulers, queues, scripts |
| Engineering | `lithos-integration-specialist` | yes | WhatsApp, CRM, payment, accounting, IoT/MQTT, third-party APIs (sandbox only) |
| Design | `lithos-creative-director` | design brief | any customer-facing product; brand direction |
| Design | `lithos-ui-ux-designer` | yes (UI code) | screens, flows, information architecture |
| Design | `lithos-design-systems-specialist` | yes | tokens, typography, component library |
| Design | `lithos-motion-designer` | yes | meaningful interaction/motion in scope |
| Design | `lithos-accessibility-specialist` | yes | every customer-facing UI (audit + fixes) |
| Infrastructure | `lithos-devops-engineer` | yes | CI, Docker, dev environments, observability |
| Infrastructure | `lithos-cloud-architect` | docs + IaC | hosting choice, IaC (plan only, never apply) |
| Infrastructure | `lithos-performance-engineer` | yes | measurable perf targets, profiling, load tests (local) |
| Infrastructure | `lithos-deployment-specialist` | config only | deploy config, release checklists, rollbacks — never deploys |
| Verification | `lithos-security-engineer` | no (findings) | every build+ run; auth, tenancy, secrets, deps |
| Verification | `lithos-pentest-specialist` | no (findings) | enterprise/audit; local targets only |
| Verification | `lithos-qa-engineer` | test files | acceptance testing, exploratory testing, E2E |
| Verification | `lithos-test-automation-engineer` | test files | test infrastructure, unit/integration suites, CI tests |
| Verification | `lithos-code-reviewer` | no (findings) | every run |
| Verification | `lithos-adversarial-reviewer` | no (findings) | every run; finding verification |

## Selection heuristics
- Prefer one `lithos-fullstack-engineer` over separate FE+BE for slices under ~300 lines.
- `lithos-integration-specialist` owns all third-party API client code so credentials handling and
  webhook verification live in one place.
- Reviewers never review their own work: a role that implemented a task is not a reviewer lens for it.
- Management roles produce a document and finish. They are not resident coordinators: the
  orchestrator coordinates.
