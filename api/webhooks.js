// Required environment variables (set in Vercel project settings):
//   VITE_DATABASE_URL   — Neon Postgres connection string
//   WEBHOOK_SECRET      — shared secret required in x-webhook-secret header

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const { event, brand_id, data } = req.body || {}
    if (!event) return res.status(400).json({ error: 'event required' })

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const safeData = data || {}

    if (event === 'content_published') {
      const contentId = safeData.content_id
      if (!contentId) {
        return res.status(400).json({ error: 'data.content_id required' })
      }

      await sql.query("UPDATE content SET status='published' WHERE id=$1", [contentId])

      await sql.query(
        `INSERT INTO analytics
           (brand_id, content_id, views, likes, comments, shares, engagement_rate, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          brand_id || null,
          contentId,
          safeData.views || 0,
          safeData.likes || 0,
          safeData.comments || 0,
          safeData.shares || 0,
          safeData.engagement_rate || 0,
          safeData.score || 0,
        ],
      )

      return res.status(200).json({ success: true })
    }

    if (event === 'analytics_update') {
      const contentId = safeData.content_id
      if (!contentId) {
        return res.status(400).json({ error: 'data.content_id required' })
      }

      const engagementRate = Number(safeData.engagement_rate) || 0
      const saves = Number(safeData.saves) || 0
      const shares = Number(safeData.shares) || 0
      const score = Math.min(100, engagementRate * 40 + saves * 0.1 + shares * 0.5)

      await sql.query(
        `UPDATE analytics
            SET views=$1,
                likes=$2,
                comments=$3,
                shares=$4,
                engagement_rate=$5,
                score=$6
          WHERE content_id=$7`,
        [
          safeData.views || 0,
          safeData.likes || 0,
          safeData.comments || 0,
          shares,
          engagementRate,
          score,
          contentId,
        ],
      )

      return res.status(200).json({ success: true, score })
    }

    if (event === 'schedule_trigger') {
      if (!brand_id) return res.status(400).json({ error: 'brand_id required' })

      const result = await sql.query(
        `SELECT *
           FROM schedules
          WHERE brand_id=$1
            AND published=false
            AND scheduled_at <= now()
          ORDER BY scheduled_at ASC
          LIMIT 1`,
        [brand_id],
      )
      const rows = result?.rows ?? result
      const row = rows?.[0] || null
      return res.status(200).json({ success: true, schedule: row })
    }

    if (event === 'memory_update') {
      if (!brand_id) return res.status(400).json({ error: 'brand_id required' })
      const memoryType = safeData.memory_type
      const content = safeData.content
      if (!memoryType || !content) {
        return res
          .status(400)
          .json({ error: 'data.memory_type and data.content required' })
      }
      await sql.query(
        `INSERT INTO brand_memory (brand_id, memory_type, content)
         VALUES ($1, $2, $3)`,
        [brand_id, memoryType, content],
      )
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: `unknown event: ${event}` })
  } catch (error) {
    console.error('webhooks handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
