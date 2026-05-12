// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//   ANTHROPIC_API_KEY — Anthropic API key for Claude vision
//
// POST /api/upload
// Body: { brand_id, image_base64, filename }
//   image_base64 may include the "data:image/...;base64," prefix or just be the
//   raw base64 payload.

function parseDataUrl(image_base64) {
  if (!image_base64) return { mediaType: 'image/png', payload: '' }
  if (image_base64.startsWith('data:')) {
    const m = image_base64.match(/^data:([^;]+);base64,(.*)$/)
    if (m) return { mediaType: m[1], payload: m[2] }
  }
  return { mediaType: 'image/png', payload: image_base64 }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brand_id, image_base64 } = req.body || {}
    if (!brand_id || !image_base64) {
      return res.status(400).json({ error: 'brand_id and image_base64 required' })
    }

    const { mediaType, payload } = parseDataUrl(image_base64)
    const logoUrl = `data:${mediaType};base64,${payload}`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: payload,
                },
              },
              {
                type: 'text',
                text:
                  'Analyze this brand logo and extract: 1. Primary color as hex code 2. Secondary color as hex code 3. Visual style in one word (minimalist/bold/professional/playful/modern/cinematic) 4. Aesthetic description in one sentence. Return ONLY valid JSON: { primary_color: string, secondary_color: string, visual_style: string, aesthetic_description: string }',
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('Claude vision error:', errText)
      return res
        .status(502)
        .json({ error: 'claude_vision_failed', details: errText })
    }

    const apiData = await anthropicRes.json()
    const rawText = apiData?.content?.[0]?.text ?? ''
    let parsed = {}
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
    } catch {
      parsed = {}
    }

    const primary = parsed.primary_color || '#ffffff'
    const secondary = parsed.secondary_color || '#000000'
    const style = parsed.visual_style || 'modern'
    const aesthetic =
      parsed.aesthetic_description ||
      'Clean modern brand aesthetic with balanced contrast'

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    await sql.query(
      `UPDATE brands
          SET logo_url=$1,
              primary_color=$2,
              secondary_color=$3,
              visual_style=$4,
              aesthetic_description=$5
        WHERE id=$6`,
      [logoUrl, primary, secondary, style, aesthetic, brand_id],
    )

    return res.status(200).json({
      success: true,
      primary_color: primary,
      secondary_color: secondary,
      visual_style: style,
      aesthetic_description: aesthetic,
    })
  } catch (error) {
    console.error('upload handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
