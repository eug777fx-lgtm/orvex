// Required env var (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// POST /api/db                              body: { query, params }
//   Runs arbitrary SQL (used by the client-side db wrapper).
//
// GET  /api/db?action=logs&brand_id=<uuid>&limit=20
//   Returns recent agent_runs with computed items_generated + human message.

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
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

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
      /\b("?)(proposals|invoices|payments|doc_files|doc_signatures|doc_access_tokens|doc_audit_events|doc_settings)\1\b/i
    if (SENSITIVE_TABLES.test(String(query))) {
      return res
        .status(403)
        .json({ error: 'This table is not accessible through /api/db' })
    }

    const result = await sql.query(query, params || [])
    return res.status(200).json({ data: result?.rows ?? result })
  } catch (error) {
    console.error('DB Error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
