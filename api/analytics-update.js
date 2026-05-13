// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// POST /api/analytics-update
// Body: { content_id, brand_id, views, likes, comments, shares, saves, reach }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { content_id, brand_id } = req.body || {}
    if (!content_id) return res.status(400).json({ error: 'content_id required' })

    const views = Number(req.body.views) || 0
    const likes = Number(req.body.likes) || 0
    const comments = Number(req.body.comments) || 0
    const shares = Number(req.body.shares) || 0
    const saves = Number(req.body.saves) || 0
    const reach = Number(req.body.reach) || 0

    const engagement_rate =
      reach > 0 ? ((likes + comments + shares + saves) / reach) * 100 : 0
    const score = Math.min(
      engagement_rate * 40 + saves * 0.1 + shares * 0.5,
      100,
    )

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    // Ensure unique index so the UPSERT semantics work.
    await sql.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS analytics_content_id_unique
         ON analytics(content_id)`,
    )

    await sql.query(
      `INSERT INTO analytics
         (content_id, brand_id, views, likes, comments, shares, engagement_rate, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (content_id) DO UPDATE SET
         brand_id = COALESCE(EXCLUDED.brand_id, analytics.brand_id),
         views = EXCLUDED.views,
         likes = EXCLUDED.likes,
         comments = EXCLUDED.comments,
         shares = EXCLUDED.shares,
         engagement_rate = EXCLUDED.engagement_rate,
         score = EXCLUDED.score`,
      [
        content_id,
        brand_id || null,
        views,
        likes,
        comments,
        shares,
        engagement_rate,
        score,
      ],
    )

    if (score > 75 && brand_id) {
      const contentRows = await sql.query(
        'SELECT hook, caption FROM content WHERE id = $1',
        [content_id],
      )
      const c = (contentRows?.rows ?? contentRows)?.[0]
      const preview = (c?.hook || c?.caption || `content ${content_id}`).slice(0, 100)
      await sql.query(
        `INSERT INTO brand_memory (brand_id, memory_type, content)
         VALUES ($1, 'top_performers', $2)`,
        [
          brand_id,
          `High performing post scored ${Math.round(score)}/100. Content: ${preview}`,
        ],
      )
    }

    if (brand_id) {
      await sql.query(
        `INSERT INTO agent_runs (brand_id, agent_type, input, status)
         VALUES ($1, 'analytics', $2::jsonb, 'pending')`,
        [
          brand_id,
          JSON.stringify({
            trigger: 'post_performance',
            content_id,
            score,
          }),
        ],
      )
    }

    return res.status(200).json({
      success: true,
      score: Math.round(score * 100) / 100,
      engagement_rate: Math.round(engagement_rate * 100) / 100,
    })
  } catch (error) {
    console.error('analytics-update handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
