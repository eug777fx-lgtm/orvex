// Required env var (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// POST /api/approve
// Body: { content_id, brand_id }
//
// Marks content as approved and inserts a schedule row at the next available
// slot. Slot policy:
//   - first slot for a brand: tomorrow at 09:00 UTC
//   - subsequent slots: previous slot + 4 hours
//   - hard cap of 3 posts per day — overflow moves to the next day at 09:00 UTC
// Platform mapping by content.type:
//   hook|script|video → instagram
//   caption           → facebook
//   anything else     → instagram

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { content_id, brand_id } = req.body || {}
    if (!content_id || !brand_id) {
      return res.status(400).json({ error: 'content_id and brand_id required' })
    }

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const contentRows = await sql.query(
      'SELECT type FROM content WHERE id = $1',
      [content_id],
    )
    const content = (contentRows?.rows ?? contentRows)?.[0]
    if (!content) return res.status(404).json({ error: 'content not found' })

    await sql.query("UPDATE content SET status='approved' WHERE id=$1", [content_id])

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

    // Enforce daily cap by walking forward day-by-day until we find room.
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

    return res.status(200).json({
      success: true,
      scheduled_at: candidate.toISOString(),
      platform,
    })
  } catch (error) {
    console.error('approve handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
