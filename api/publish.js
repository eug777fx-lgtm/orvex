// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// GET  /api/publish?brand_id=<uuid>
//   Returns: { success, has_content, content }
//
// POST /api/publish
//   Body: { schedule_id, content_id, brand_id, platform, result }
//   Returns: { success: true }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    if (req.method === 'GET') {
      const { brand_id } = req.query || {}
      if (!brand_id) return res.status(400).json({ error: 'brand_id required' })

      const result = await sql.query(
        `SELECT c.id, c.type, c.hook, c.caption, c.script, c.status,
                s.platform, s.scheduled_at, s.id AS schedule_id
           FROM schedules s
           JOIN content c ON s.content_id = c.id
          WHERE s.brand_id = $1
            AND s.published = false
            AND c.status = 'approved'
            AND s.scheduled_at <= NOW()
          ORDER BY s.scheduled_at ASC
          LIMIT 1`,
        [brand_id],
      )
      const rows = result?.rows ?? result
      const row = rows?.[0]
      if (!row) {
        return res.status(200).json({ success: true, has_content: false })
      }
      return res.status(200).json({ success: true, has_content: true, content: row })
    }

    if (req.method === 'POST') {
      const { schedule_id, content_id, brand_id } = req.body || {}
      if (!schedule_id || !content_id) {
        return res
          .status(400)
          .json({ error: 'schedule_id and content_id required' })
      }

      await sql.query('UPDATE schedules SET published=true WHERE id=$1', [schedule_id])
      await sql.query("UPDATE content SET status='published' WHERE id=$1", [content_id])

      await sql.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS analytics_content_id_unique
           ON analytics(content_id)`,
      )
      await sql.query(
        `INSERT INTO analytics (content_id, brand_id)
         VALUES ($1, $2)
         ON CONFLICT (content_id) DO NOTHING`,
        [content_id, brand_id || null],
      )

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('publish handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
