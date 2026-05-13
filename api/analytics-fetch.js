// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// GET /api/analytics-fetch?brand_id=<uuid>&days=7

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { brand_id } = req.query || {}
  const days = Math.max(1, Math.min(180, Number(req.query?.days) || 7))
  if (!brand_id) return res.status(400).json({ error: 'brand_id required' })

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const result = await sql.query(
      `SELECT c.id, c.hook, c.caption, c.type,
              a.score, a.engagement_rate, a.views, a.likes, a.shares,
              s.platform, s.scheduled_at
         FROM content c
         JOIN analytics a ON c.id = a.content_id
    LEFT JOIN schedules s ON c.id = s.content_id
        WHERE c.brand_id = $1
          AND c.status = 'published'
          AND s.scheduled_at >= now() - ($2 * interval '1 day')
        ORDER BY a.score DESC`,
      [brand_id, days],
    )
    const rows = result?.rows ?? result ?? []
    return res.status(200).json(rows)
  } catch (error) {
    console.error('analytics-fetch handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
