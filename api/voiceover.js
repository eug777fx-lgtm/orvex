// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL  — Neon Postgres connection string
//   ELEVENLABS_API_KEY — ElevenLabs API key for text-to-speech
//
// POST /api/voiceover
// Body: { text, brand_id, voice_id }
// voice_id defaults to "21m00Tcm4TlvDq8ikWAM" (Rachel).

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { text, brand_id, voice_id } = req.body || {}
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text required' })
    }
    const useVoice = voice_id || DEFAULT_VOICE_ID

    const apiRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${useVoice}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    )

    if (!apiRes.ok) {
      const errBody = await apiRes.text()
      console.error('ElevenLabs error:', errBody)
      return res
        .status(502)
        .json({ error: 'elevenlabs_failed', details: errBody })
    }

    const audioBuffer = await apiRes.arrayBuffer()
    const base64 = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64}`

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)
    const inserted = await sql.query(
      `INSERT INTO content (brand_id, type, script, status)
       VALUES ($1, 'voiceover', $2, 'pending')
       RETURNING id`,
      [brand_id || null, String(text)],
    )
    const contentId = (inserted?.rows ?? inserted)?.[0]?.id

    return res
      .status(200)
      .json({ success: true, audio_url: audioUrl, content_id: contentId })
  } catch (error) {
    console.error('voiceover handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
