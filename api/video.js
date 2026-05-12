// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL   — Neon Postgres connection string
//   HIGGSFIELD_API_KEY  — Higgsfield API key for image/video generation
//
// POST /api/video
// Body: { brand_id, type, prompt, image_url }
//   type: "text_to_image" | "text_to_video" | "image_to_video"

const HIGGSFIELD_BASE = 'https://cloud.higgsfield.ai/api/v1'
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 120000

function buildBody(type, prompt, image_url) {
  if (type === 'text_to_image') {
    return {
      model: 'seedream-v3',
      prompt,
      aspect_ratio: '9:16',
      resolution: '1080p',
    }
  }
  if (type === 'text_to_video') {
    return {
      model: 'cinema-studio',
      prompt,
      duration: 5,
      aspect_ratio: '9:16',
    }
  }
  if (type === 'image_to_video') {
    return {
      model: 'soul',
      prompt,
      image_url,
      duration: 5,
      aspect_ratio: '9:16',
    }
  }
  throw new Error(`unsupported type: ${type}`)
}

async function startGeneration(type, prompt, image_url) {
  const res = await fetch(`${HIGGSFIELD_BASE}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildBody(type, prompt, image_url)),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error('higgsfield_generate_failed: ' + errText)
  }
  return res.json()
}

async function pollStatus(generationId) {
  const start = Date.now()
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(`${HIGGSFIELD_BASE}/status/${generationId}`, {
      headers: { Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}` },
    })
    if (!res.ok) throw new Error('higgsfield_status_failed')
    const data = await res.json()
    if (data.status === 'completed' || data.status === 'failed') return data
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error('higgsfield_polling_timeout')
}

async function buildBrandedPrompt(sql, brand_id, type, prompt) {
  if (!brand_id) return prompt
  const rows = await sql.query(
    'SELECT logo_url, primary_color, secondary_color, visual_style, aesthetic_description FROM brands WHERE id = $1',
    [brand_id],
  )
  const brand = (rows?.rows ?? rows)?.[0]
  if (!brand || !brand.logo_url) return prompt
  let suffix = ` Visual style: ${brand.visual_style || 'modern'}. Color palette: primary ${brand.primary_color || '#fff'}, accent ${brand.secondary_color || '#000'}. Aesthetic: ${brand.aesthetic_description || ''}. Maintain consistent brand identity.`
  if (type === 'text_to_image') {
    suffix +=
      ' Brand colors should appear subtly in lighting, shadows, or background gradients. Do not add text or logos to the image.'
  }
  return `${prompt}${suffix}`
}

export async function generateVideo({ brand_id, type, prompt, image_url, sql }) {
  const brandedPrompt = await buildBrandedPrompt(sql, brand_id, type, prompt)
  const startResult = await startGeneration(type, brandedPrompt, image_url)
  const generationId = startResult.generation_id || startResult.id
  if (!generationId) {
    throw new Error('higgsfield returned no generation_id')
  }
  const result = await pollStatus(generationId)
  if (result.status !== 'completed') {
    return { success: false, error: result.error || 'higgsfield_failed' }
  }
  const outputUrl = result.output_url || result.url
  const dbType = type === 'text_to_image' ? 'image' : 'video'

  const inserted = await sql.query(
    `INSERT INTO content (brand_id, type, script, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id`,
    [brand_id || null, dbType, outputUrl],
  )
  const contentId = (inserted?.rows ?? inserted)?.[0]?.id
  return { success: true, url: outputUrl, content_id: contentId }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brand_id, type, prompt, image_url } = req.body || {}
    if (!type || !prompt) {
      return res.status(400).json({ error: 'type and prompt required' })
    }
    if (type === 'image_to_video' && !image_url) {
      return res.status(400).json({ error: 'image_url required for image_to_video' })
    }

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const result = await generateVideo({ brand_id, type, prompt, image_url, sql })
    return res.status(200).json(result)
  } catch (error) {
    console.error('video handler error:', error.message)
    return res.status(500).json({ success: false, error: error.message })
  }
}
