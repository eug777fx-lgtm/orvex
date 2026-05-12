// GET /api/schedule?brand_id=<uuid>
//
// Returns today's hardcoded agent schedule with computed status per slot:
//   - 'active'   when the slot is within ±30 minutes of now
//   - 'done'     when the slot is more than 30 minutes in the past
//   - 'upcoming' when the slot is more than 30 minutes in the future
//
// Times below are interpreted in the server's timezone (Vercel = UTC).

const SLOTS = [
  { time: '07:00', task: 'Daily strategy brief', agent_type: 'strategy' },
  { time: '08:00', task: 'Generate hooks and captions', agent_type: 'writer' },
  { time: '09:00', task: 'Post to Instagram', agent_type: 'distribution' },
  { time: '12:00', task: 'Build video briefs', agent_type: 'video' },
  { time: '15:00', task: 'Post to TikTok', agent_type: 'distribution' },
  { time: '20:00', task: 'Score performance', agent_type: 'analytics' },
]

function slotStatus(slotTime, now) {
  const [h, m] = slotTime.split(':').map(Number)
  const scheduled = new Date(now)
  scheduled.setHours(h, m, 0, 0)
  const diffMin = (scheduled.getTime() - now.getTime()) / 60000
  if (Math.abs(diffMin) <= 30) return 'active'
  if (diffMin < 0) return 'done'
  return 'upcoming'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { brand_id } = req.query || {}
  if (!brand_id) return res.status(400).json({ error: 'brand_id required' })

  const now = new Date()
  const items = SLOTS.map((s) => ({
    time: s.time,
    task: s.task,
    agent_type: s.agent_type,
    status: slotStatus(s.time, now),
    brand_id,
  }))

  return res.status(200).json(items)
}
