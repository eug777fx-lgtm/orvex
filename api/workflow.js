// Required env var (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// GET  /api/workflow?action=next&brand_id=<uuid>
//   Returns the next approved+unpublished content ready to post.
//   Response: { success, has_content, content? }
//
// POST /api/workflow
//   Body: { action: 'approve', content_id, brand_id }
//     Marks content approved, schedules it at the next available slot (4h cadence,
//     3/day cap), returns { scheduled_at, platform }.
//   Body: { action: 'reject', content_id }
//     Marks content rejected.
//   Body: { action: 'published', schedule_id, content_id, brand_id }
//     Called by Make.com after a successful post. Marks schedule/content published
//     and ensures an analytics row exists.

const MAX_PER_DAY = 3
const SLOT_GAP_HOURS = 4

function startOfUtcDay(d) {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function platformForType(type) {
  if (type === 'caption') return 'facebook'
  return 'instagram'
}

async function getDb() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.VITE_DATABASE_URL)
}

async function handleApprove(sql, body) {
  const { content_id, brand_id } = body
  if (!content_id || !brand_id) {
    const err = new Error('content_id and brand_id required')
    err.status = 400
    throw err
  }

  const contentRows = await sql.query(
    'SELECT type FROM content WHERE id = $1',
    [content_id],
  )
  const content = (contentRows?.rows ?? contentRows)?.[0]
  if (!content) {
    const err = new Error('content not found')
    err.status = 404
    throw err
  }

  await sql.query("UPDATE content SET status='approved' WHERE id=$1", [
    content_id,
  ])

  const latestRows = await sql.query(
    `SELECT scheduled_at FROM schedules
      WHERE brand_id=$1 AND published=false
      ORDER BY scheduled_at DESC LIMIT 1`,
    [brand_id],
  )
  const latest = (latestRows?.rows ?? latestRows)?.[0]?.scheduled_at

  let candidate
  if (!latest) {
    candidate = new Date()
    candidate.setUTCDate(candidate.getUTCDate() + 1)
    candidate.setUTCHours(9, 0, 0, 0)
  } else {
    candidate = new Date(latest)
    candidate.setUTCHours(candidate.getUTCHours() + SLOT_GAP_HOURS)
  }

  for (let safety = 0; safety < 30; safety++) {
    const dayStart = startOfUtcDay(candidate)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

    const countRows = await sql.query(
      `SELECT COUNT(*)::int AS c FROM schedules
        WHERE brand_id=$1
          AND published=false
          AND scheduled_at >= $2
          AND scheduled_at < $3`,
      [brand_id, dayStart.toISOString(), dayEnd.toISOString()],
    )
    const count = (countRows?.rows ?? countRows)?.[0]?.c ?? 0
    if (count < MAX_PER_DAY) break

    candidate = new Date(dayStart)
    candidate.setUTCDate(candidate.getUTCDate() + 1)
    candidate.setUTCHours(9, 0, 0, 0)
  }

  const platform = platformForType(content.type)

  await sql.query(
    `INSERT INTO schedules (content_id, brand_id, platform, scheduled_at, published)
     VALUES ($1, $2, $3, $4, false)`,
    [content_id, brand_id, platform, candidate.toISOString()],
  )

  return { scheduled_at: candidate.toISOString(), platform }
}

async function handleReject(sql, body) {
  const { content_id } = body
  if (!content_id) {
    const err = new Error('content_id required')
    err.status = 400
    throw err
  }
  await sql.query("UPDATE content SET status='rejected' WHERE id=$1", [
    content_id,
  ])
  return {}
}

async function handleNext(sql, brand_id) {
  if (!brand_id) {
    const err = new Error('brand_id required')
    err.status = 400
    throw err
  }
  const result = await sql.query(
    `SELECT pp.id, pp.platform, pp.hook_text, pp.caption_text, pp.cta_text,
            pp.hashtags, pp.visual_url, pp.visual_type, pp.scheduled_at,
            b.name AS brand_name
       FROM post_packages pp
       JOIN brands b ON pp.brand_id = b.id
      WHERE pp.brand_id = $1
        AND pp.status = 'approved'
        AND pp.published = false
        AND pp.scheduled_at <= NOW()
      ORDER BY pp.scheduled_at ASC
      LIMIT 1`,
    [brand_id],
  )
  const rows = result?.rows ?? result
  const row = rows?.[0]
  if (!row) return { has_content: false }
  return { has_content: true, package: row }
}

async function handlePublished(sql, body) {
  const { schedule_id, content_id, package_id, brand_id } = body
  if (!schedule_id && !package_id && !content_id) {
    const err = new Error('package_id or (schedule_id + content_id) required')
    err.status = 400
    throw err
  }
  if (package_id) {
    await sql.query(
      "UPDATE post_packages SET published=true, published_at=NOW() WHERE id=$1",
      [package_id],
    )
  }
  if (schedule_id) {
    await sql.query('UPDATE schedules SET published=true WHERE id=$1', [
      schedule_id,
    ])
  }
  if (content_id) {
    await sql.query("UPDATE content SET status='published' WHERE id=$1", [
      content_id,
    ])
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
  }
  return {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const sql = await getDb()

    if (req.method === 'GET') {
      const { action, brand_id } = req.query || {}
      if (action === 'next') {
        const result = await handleNext(sql, brand_id)
        return res.status(200).json({ success: true, ...result })
      }
      return res
        .status(400)
        .json({ error: 'GET requires action=next&brand_id=...' })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const action = body.action
      if (action === 'approve') {
        const result = await handleApprove(sql, body)
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'reject') {
        await handleReject(sql, body)
        return res.status(200).json({ success: true })
      }
      if (action === 'published') {
        await handlePublished(sql, body)
        return res.status(200).json({ success: true })
      }
      return res
        .status(400)
        .json({ error: "body.action must be 'approve', 'reject', or 'published'" })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('workflow handler error:', error.message)
    return res
      .status(error.status || 500)
      .json({ error: error.message })
  }
}
