// Required environment variables (set in Vercel project settings):
//   VITE_DATABASE_URL     — Neon Postgres connection string
//   WEBHOOK_SECRET        — shared secret required in x-webhook-secret header
//   STRIPE_WEBHOOK_SECRET — Stripe endpoint signing secret (for ?source=stripe)
//
// Stripe webhook endpoint: POST /api/webhooks?source=stripe
//   Signature is verified against the RAW request body, which is why body
//   parsing is disabled below and JSON is parsed manually for other callers.

import { handleStripeWebhook } from './_docs-helper.js'

// Stripe signature verification needs the exact raw bytes of the payload.
export const config = { api: { bodyParser: false } }

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-secret')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const rawBody = await readRawBody(req)

  // Stripe events (signature-verified inside the handler; no shared secret).
  if (req.query?.source === 'stripe') {
    return handleStripeWebhook(req, res, rawBody)
  }

  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  let parsedBody = {}
  try {
    parsedBody = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {}
  } catch {
    return res.status(400).json({ error: 'invalid JSON body' })
  }

  try {
    const { event, brand_id, data } = parsedBody || {}
    if (!event) return res.status(400).json({ error: 'event required' })

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const safeData = data || {}

    if (event === 'content_published') {
      const contentId = safeData.content_id
      if (!contentId) {
        return res.status(400).json({ error: 'data.content_id required' })
      }
      await sql.query("UPDATE content SET status='published' WHERE id=$1", [
        contentId,
      ])
      await sql.query(
        'UPDATE schedules SET published=true WHERE content_id=$1',
        [contentId],
      )
      // Make analytics insert idempotent against (content_id) by relying on a
      // unique index (created on first write below if absent).
      await sql.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS analytics_content_id_unique
           ON analytics(content_id)`,
      )
      await sql.query(
        `INSERT INTO analytics
           (content_id, brand_id, views, likes, comments, shares, engagement_rate, score)
         VALUES ($1, $2, 0, 0, 0, 0, 0, 0)
         ON CONFLICT (content_id) DO NOTHING`,
        [contentId, safeData.brand_id || brand_id || null],
      )
      return res.status(200).json({ success: true })
    }

    if (event === 'analytics_update') {
      const contentId = safeData.content_id
      if (!contentId) {
        return res.status(400).json({ error: 'data.content_id required' })
      }
      const views = Number(safeData.views) || 0
      const likes = Number(safeData.likes) || 0
      const comments = Number(safeData.comments) || 0
      const shares = Number(safeData.shares) || 0
      const saves = Number(safeData.saves) || 0
      const engagementRate = Number(safeData.engagement_rate) || 0

      const updated = await sql.query(
        `UPDATE analytics
            SET views=$1,
                likes=$2,
                comments=$3,
                shares=$4,
                engagement_rate=$5,
                score=LEAST(($5 * 40) + ($6 * 0.1) + ($4 * 0.5), 100)
          WHERE content_id=$7
        RETURNING score, brand_id`,
        [views, likes, comments, shares, engagementRate, saves, contentId],
      )
      const updatedRow = (updated?.rows ?? updated)?.[0]
      const score = Number(updatedRow?.score || 0)
      const useBrandId = safeData.brand_id || brand_id || updatedRow?.brand_id

      if (score > 80 && useBrandId) {
        const preview = String(
          safeData.content_preview || `content_id ${contentId}`,
        )
        await sql.query(
          `INSERT INTO brand_memory (brand_id, memory_type, content)
           VALUES ($1, 'top_performers', $2)`,
          [
            useBrandId,
            `High performing content: ${preview} - Score: ${Math.round(score)}`,
          ],
        )
      }

      return res.status(200).json({ success: true, score })
    }

    if (event === 'daily_summary') {
      if (!brand_id) return res.status(400).json({ error: 'brand_id required' })

      const publishedRows = await sql.query(
        `SELECT COUNT(*) AS c FROM content
          WHERE brand_id=$1 AND status='published'
            AND created_at::date = CURRENT_DATE`,
        [brand_id],
      )
      const avgRows = await sql.query(
        `SELECT COALESCE(ROUND(AVG(score)::numeric, 0), 0) AS avg_score
           FROM analytics
          WHERE brand_id=$1 AND recorded_at::date = CURRENT_DATE`,
        [brand_id],
      )
      const topRows = await sql.query(
        `SELECT COALESCE(c.hook, c.caption, c.script) AS preview, a.score
           FROM analytics a
           JOIN content c ON a.content_id = c.id
          WHERE a.brand_id=$1 AND a.recorded_at::date = CURRENT_DATE
          ORDER BY a.score DESC
          LIMIT 1`,
        [brand_id],
      )

      const publishedToday = Number(
        (publishedRows?.rows ?? publishedRows)?.[0]?.c || 0,
      )
      const avgScore = Number(
        (avgRows?.rows ?? avgRows)?.[0]?.avg_score || 0,
      )
      const top = (topRows?.rows ?? topRows)?.[0]
      const topPreview = top?.preview
        ? `${String(top.preview).slice(0, 80)} (score ${Math.round(top.score || 0)})`
        : 'no top performer today'

      const summary =
        `Daily summary: ${publishedToday} posts published, ` +
        `avg score ${avgScore}, top performer: ${topPreview}`

      await sql.query(
        `INSERT INTO brand_memory (brand_id, memory_type, content)
         VALUES ($1, 'campaign_history', $2)`,
        [brand_id, summary],
      )

      return res.status(200).json({
        success: true,
        summary,
        published_today: publishedToday,
        avg_score: avgScore,
      })
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
