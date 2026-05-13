// Required env var (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// GET  /api/analytics?brand_id=<uuid>&days=7
//   Returns top-scoring published content for last N days (default 7).
//
// POST /api/analytics
//   Body: { type: 'update', content_id, brand_id, views, likes, comments, shares, saves, reach }
//     UPSERTs analytics row + writes top_performers brand_memory if score > 75 + queues analytics agent_run.
//   Body: { type: 'fetch', brand_id, days }
//     Same as the GET, returned as { data: [...] }.

async function getDb() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.VITE_DATABASE_URL)
}

async function fetchAnalytics(sql, brandId, days) {
  const d = Math.max(1, Math.min(180, Number(days) || 7))
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
    [brandId, d],
  )
  return result?.rows ?? result ?? []
}

async function updateAnalytics(sql, body) {
  const { content_id, brand_id } = body
  if (!content_id) throw new Error('content_id required')

  const views = Number(body.views) || 0
  const likes = Number(body.likes) || 0
  const comments = Number(body.comments) || 0
  const shares = Number(body.shares) || 0
  const saves = Number(body.saves) || 0
  const reach = Number(body.reach) || 0

  const engagement_rate =
    reach > 0 ? ((likes + comments + shares + saves) / reach) * 100 : 0
  const score = Math.min(
    engagement_rate * 40 + saves * 0.1 + shares * 0.5,
    100,
  )

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

  return {
    score: Math.round(score * 100) / 100,
    engagement_rate: Math.round(engagement_rate * 100) / 100,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const sql = await getDb()

    if (req.method === 'GET') {
      const { brand_id, days } = req.query || {}
      if (!brand_id) return res.status(400).json({ error: 'brand_id required' })
      const rows = await fetchAnalytics(sql, brand_id, days)
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const type = body.type
      if (type === 'fetch') {
        if (!body.brand_id)
          return res.status(400).json({ error: 'brand_id required' })
        const rows = await fetchAnalytics(sql, body.brand_id, body.days)
        return res.status(200).json({ data: rows })
      }
      if (type === 'update') {
        const result = await updateAnalytics(sql, body)
        return res.status(200).json({ success: true, ...result })
      }
      return res
        .status(400)
        .json({ error: "body.type must be 'update' or 'fetch'" })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('analytics handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
