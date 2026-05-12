// GET /api/schedule?brand_id=<uuid>
//
// Returns today's scheduled content for a brand from the schedules table.
// Response shape: { schedules: [...], is_empty: boolean }
// When no schedules exist for today: { schedules: [], is_empty: true }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { brand_id } = req.query || {}
  if (!brand_id) return res.status(400).json({ error: 'brand_id required' })

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const result = await sql.query(
      `SELECT s.id, s.scheduled_at, s.platform, s.published,
              c.type, c.hook, c.caption, c.script
         FROM schedules s
         JOIN content c ON s.content_id = c.id
        WHERE s.brand_id = $1
          AND s.scheduled_at::date = CURRENT_DATE
        ORDER BY s.scheduled_at ASC`,
      [brand_id],
    )
    const rows = result?.rows ?? result ?? []

    if (rows.length === 0) {
      return res.status(200).json({ schedules: [], is_empty: true })
    }
    return res.status(200).json({ schedules: rows, is_empty: false })
  } catch (error) {
    console.error('schedule handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
