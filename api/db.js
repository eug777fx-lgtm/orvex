// Required env var (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// POST /api/db                              body: { query, params }
//   Runs arbitrary SQL (used by the client-side db wrapper).
//
// GET  /api/db?action=logs&brand_id=<uuid>&limit=20
//   Returns recent agent_runs with computed items_generated + human message.

import { authUser, cors } from './_guard.js'

// The only statements a signed-out visitor may run: the public demo page
// (/demo/:slug) loading its demo and counting the view. Everything else needs
// a CRM login token.
const norm = (q) => String(q || '').replace(/\s+/g, ' ').trim()
const PUBLIC_QUERIES = new Set([
  'SELECT * FROM demos WHERE slug = $1 LIMIT 1',
  "UPDATE demos SET view_count = COALESCE(view_count, 0) + 1, last_viewed_at = now(), status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END WHERE id = $1",
])

function logMessageFor(agentType, status, itemsGenerated) {
  if (status === 'error' || status === 'failed') {
    return 'Agent encountered an error — check API keys'
  }
  if (status !== 'complete') {
    return `${logDisplayName(agentType)} is running…`
  }
  switch (agentType) {
    case 'strategy':
      return 'Strategy Agent completed trend scan and weekly brief'
    case 'writer':
      return `Writer Agent generated ${itemsGenerated} content pieces`
    case 'analytics':
      return 'Analytics Agent scored content and updated brand memory'
    case 'video_director':
      return 'Video Director Agent created video brief'
    case 'repurpose':
      return 'Repurpose Agent created platform variants'
    case 'video_render':
      return 'Video render queued'
    default:
      return `${logDisplayName(agentType)} completed`
  }
}

function logDisplayName(agentType) {
  if (!agentType) return 'Agent'
  return agentType
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

async function handleLogs(sql, req, res) {
  const { brand_id, limit } = req.query || {}
  if (!brand_id) return res.status(400).json({ error: 'brand_id required' })
  const lim = Math.max(1, Math.min(100, Number(limit) || 20))

  const result = await sql.query(
    `SELECT id, agent_type, status, created_at,
            CASE
              WHEN output::text = 'null' OR output IS NULL THEN 0
              WHEN agent_type = 'writer' THEN (
                SELECT COUNT(*) FROM content
                 WHERE brand_id = $1
                   AND created_at >= ar.created_at - interval '10 seconds'
                   AND created_at <= ar.created_at + interval '10 seconds'
              )
              ELSE 1
            END AS items_generated
       FROM agent_runs ar
      WHERE brand_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [brand_id, lim],
  )
  const rows = result?.rows ?? result ?? []
  const formatted = rows.map((r) => ({
    id: r.id,
    agent_type: r.agent_type,
    status: r.status,
    created_at: r.created_at,
    items_generated: Number(r.items_generated || 0),
    message: logMessageFor(r.agent_type, r.status, Number(r.items_generated || 0)),
  }))
  return res.status(200).json(formatted)
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  // Signed-in CRM users only (token from the login, account still active),
  // except the two public demo-page statements above.
  const isPublic = req.method === 'POST' && PUBLIC_QUERIES.has(norm(req.body?.query))
  const user = isPublic ? null : await authUser(req)
  if (!user && !isPublic) return res.status(401).json({ error: 'Please sign in again', code: 'auth' })

  if (user && req.method === 'POST') {
    const q = String(req.body?.query || '')
    // nobody reads password hashes through this endpoint
    if (/password_hash/i.test(q)) return res.status(403).json({ error: 'Not allowed' })
    if (user.role !== 'admin') {
      // one statement per call
      if (/;\s*\S/.test(q)) return res.status(403).json({ error: 'Not allowed' })
      // only the admin may change the schema or touch accounts and roles
      if (/^\s*(alter|drop|truncate|create|grant|revoke|comment|vacuum|reindex)\b/i.test(q)) {
        return res.status(403).json({ error: 'Not allowed' })
      }
      if (/\b(insert|update|delete)\b[\s\S]*\bsales_reps\b|\bsales_reps\b[\s\S]*\b(insert|update|delete)\b/i.test(q)) {
        return res.status(403).json({ error: 'Not allowed' })
      }
    }
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    if (req.method === 'GET') {
      const { action } = req.query || {}
      if (action === 'logs') return await handleLogs(sql, req, res)
      return res
        .status(400)
        .json({ error: 'GET requires action=logs&brand_id=...' })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { query, params } = req.body
    if (!query) return res.status(400).json({ error: 'No query provided' })

    // SECURITY GUARD: the Payments & Documents tables hold financial data,
    // signatures, bank details and client access tokens. They must never be
    // reachable through this open SQL endpoint — all access to them goes
    // through the authenticated docs_* actions in /api/workflow.
    const SENSITIVE_TABLES =
      /\b("?)(proposals|invoices|payments|doc_files|doc_signatures|doc_access_tokens|doc_audit_events|doc_settings|intel_settings|intel_presets|intel_usage_events|lead_discovery_searches|lead_discovery_search_results|discovered_businesses|business_analysis|lead_scores|pricing_recommendations)\1\b/i
    if (SENSITIVE_TABLES.test(String(query))) {
      return res
        .status(403)
        .json({ error: 'This table is not accessible through /api/db' })
    }

    const result = await sql.query(query, params || [])
    let data = result?.rows ?? result
    // a "SELECT *" on the accounts table must never hand out password hashes
    if (Array.isArray(data)) {
      data = data.map((row) => {
        if (row && typeof row === 'object' && 'password_hash' in row) {
          const { password_hash: _omit, ...rest } = row
          return rest
        }
        return row
      })
    }
    return res.status(200).json({ data })
  } catch (error) {
    // the real reason goes to the server log; admins also see it to fix queries
    console.error('DB Error:', error.message)
    return res.status(500).json({ error: user?.role === 'admin' ? error.message : 'Database error' })
  }
}
