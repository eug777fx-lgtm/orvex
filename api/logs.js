// Required env var (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// GET /api/logs?brand_id=<uuid>&limit=20
// Returns array of agent_runs with computed items_generated and a human message.

function messageFor(agentType, status, itemsGenerated) {
  if (status === 'error' || status === 'failed') {
    return 'Agent encountered an error — check API keys'
  }
  if (status !== 'complete') {
    return `${displayName(agentType)} is running…`
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
      return 'Repurpose Agent created 4 platform variants'
    case 'video_render':
      return 'Video render queued'
    default:
      return `${displayName(agentType)} completed`
  }
}

function displayName(agentType) {
  if (!agentType) return 'Agent'
  return agentType
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { brand_id, limit } = req.query || {}
  if (!brand_id) return res.status(400).json({ error: 'brand_id required' })
  const lim = Math.max(1, Math.min(100, Number(limit) || 20))

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

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
      message: messageFor(r.agent_type, r.status, Number(r.items_generated || 0)),
    }))
    return res.status(200).json(formatted)
  } catch (error) {
    console.error('logs handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
