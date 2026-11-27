# Lithos Ultra — Business Systems Playbooks

Principle: **the business problem picks the technology.** Before choosing a stack, write down the
outcome metric (e.g. "cut quote turnaround from 2 days to 2 hours", "reduce missed rent follow-ups
to zero"), who operates the system daily, the data involved, and the simplest thing that moves the
metric. Prefer boring, well-supported technology the client can maintain. Record the chosen metric in
`.lithos/architecture.md` and design the report around it.

Default stack (override when the codebase or client dictates): TypeScript, Next.js or Vite+React
front end, Node (Next route handlers / Fastify / Hono) or Python (FastAPI) back end, PostgreSQL with
a typed ORM/query builder (Prisma/Drizzle/SQLAlchemy), zod/pydantic validation, Playwright + Vitest/
pytest. Hosting decided by the client; Lithos never deploys without authorization.

## Custom business software
Model the real workflow first: actors, states, transitions, approvals, documents. Implement as an
explicit state machine where status matters (quotes, jobs, tickets). Audit log on every state change.

## AI agents & assistants
- Define the job, the tools, and what the agent must never do. Least-privilege tools; side-effecting
  tools require human confirmation.
- Retrieval: chunk + embed client documents; cite sources in answers; tenant-scoped indexes.
- Evals before launch: a small golden set of real questions with expected behaviour, including
  prompt-injection and out-of-scope cases. Track cost and latency per request.
- Use the latest Claude models via the official SDK; keep model id in config; log token usage.

## Business process automation
Map current process → identify trigger, inputs, decisions, outputs, exceptions. Idempotent jobs,
retries with backoff, dead-letter handling, human-in-the-loop for exceptions, run history UI.

## CRM systems
Entities: contacts, companies, deals/pipelines, activities, tasks, notes, attachments. Dedup and
merge rules, import from CSV with validation preview, activity timeline, permissioned views,
pipeline reporting with conversion and velocity. Integrate email/WhatsApp as activities.

## SaaS platforms
Multi-tenant from day one (tenant_id + enforced scoping or Postgres RLS), organisation/user/role
model, invitations, plan/entitlement checks in one place, billing via a provider's hosted flow
(test mode only during development), per-tenant audit log, usage metering if priced by usage.

## Property management systems
Entities: portfolios, properties, units, tenants/residents, leases, rent schedules, invoices,
payments, arrears, maintenance requests, vendors, inspections, documents. Key flows: lease lifecycle,
rent roll, arrears escalation, maintenance ticket triage with photos, owner statements. Dates and
money: store in UTC and minor units; prorations tested.

## Internal dashboards
Start from the decisions the dashboard supports. Each KPI: definition, source, refresh cadence,
owner. Pre-aggregate for speed; drill-down to records; export CSV; role-based visibility.

## Customer portals
Auth (magic link / OTP / SSO as fits), task-first home, document access via signed URLs, request
submission with status tracking, notifications preferences, strict per-customer data scoping tests.

## WhatsApp integrations
- Use the official **WhatsApp Business Platform (Cloud API)** or an approved BSP. No unofficial
  libraries that automate WhatsApp Web.
- Respect opt-in, the 24-hour customer-service window, and pre-approved **message templates** for
  business-initiated messages; handle opt-out keywords.
- Webhooks: verify the `hub.verify_token` handshake and the `X-Hub-Signature-256` HMAC; process
  idempotently by message id; respond 200 fast and queue work.
- Development uses test numbers / sandbox and a local mock; **never send to real numbers** without
  explicit authorization (guard hook asks on live API calls).

## API integrations
Typed client per provider owned by `lithos-integration-specialist`; timeouts, retries with jitter,
circuit breaking for flaky providers, rate-limit awareness, idempotency keys, webhook signature
verification, contract tests against recorded fixtures, sandbox credentials only.

## IoT monitoring platforms
Ingestion via MQTT (TLS, per-device credentials) or HTTPS; device registry and provisioning;
time-series storage (TimescaleDB/Postgres partitioning or a TSDB); downsampling and retention
policies; alert rules with hysteresis and acknowledgement; offline detection via heartbeats;
dashboards with time-range controls. Simulate devices locally for tests.

## Digital experiences
Performance budget first (LCP < 2.5 s, CLS < 0.1, INP < 200 ms on mid-range mobile), CMS only if the
client edits content, accessible by default, analytics with consent.
