// Required environment variables (set in Vercel project settings):
//   VITE_DATABASE_URL   — Neon Postgres connection string
//   ANTHROPIC_API_KEY   — Anthropic API key for Claude calls

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { brand_id, agent_type, input } = req.body || {}
    if (!brand_id || !agent_type) {
      return res.status(400).json({ error: 'brand_id and agent_type required' })
    }

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const brandRows = await sql.query(
      'SELECT name, voice_prompt, color, platforms FROM brands WHERE id = $1',
      [brand_id],
    )
    const brand = (brandRows?.rows ?? brandRows)?.[0]
    if (!brand) return res.status(404).json({ error: 'brand not found' })

    const memoryRows = await sql.query(
      'SELECT content, memory_type FROM brand_memory WHERE brand_id = $1',
      [brand_id],
    )
    const memory = memoryRows?.rows ?? memoryRows

    const memoryByType = memory.reduce((acc, row) => {
      const k = row.memory_type || 'general'
      if (!acc[k]) acc[k] = []
      acc[k].push(row.content)
      return acc
    }, {})

    const voiceRules =
      (memoryByType.voice_rules || []).join('\n') ||
      brand.voice_prompt ||
      'Confident, concise, no fluff.'
    const memoryDump = memory.map((m) => `[${m.memory_type}] ${m.content}`).join('\n') ||
      'No prior memory yet.'

    let systemPrompt
    if (agent_type === 'strategy') {
      systemPrompt =
        `You are a content strategy agent for ${brand.name}. ` +
        `Your job is to analyze trends and create a 7-day content brief. ` +
        `Brand context: ${memoryDump}. ` +
        `Output a JSON object with: { brief: string, angles: array of 3 strings, recommended_formats: array }`
    } else if (agent_type === 'writer') {
      systemPrompt =
        `You are a copywriter for ${brand.name}. ` +
        `Brand voice: ${voiceRules}. ` +
        `Write content that matches this brand exactly. ` +
        `Output a JSON object with: { hooks: array of 5 strings, captions: array of 3 strings, cta: string }`
    } else if (agent_type === 'analytics') {
      systemPrompt =
        `You are an analytics agent for ${brand.name}. ` +
        `Review the content performance and write a learning summary. ` +
        `Output a JSON object with: { top_performer: string, key_insight: string, recommendation: string, memory_update: string }`
    } else {
      return res.status(400).json({ error: `unsupported agent_type: ${agent_type}` })
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: input || 'Run your scheduled task now.' },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text()
      console.error('Anthropic error:', errBody)
      return res.status(502).json({ error: 'anthropic_call_failed', details: errBody })
    }

    const apiData = await anthropicRes.json()
    const rawText = apiData?.content?.[0]?.text ?? ''
    const tokensUsed =
      (apiData?.usage?.input_tokens || 0) + (apiData?.usage?.output_tokens || 0)

    let parsed
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { raw: rawText }
    } catch {
      parsed = { raw: rawText }
    }

    await sql.query(
      `INSERT INTO agent_runs (brand_id, agent_type, input, output, status, tokens_used)
       VALUES ($1, $2, $3, $4, 'complete', $5)`,
      [
        brand_id,
        agent_type,
        JSON.stringify({ input: input || null }),
        JSON.stringify(parsed),
        tokensUsed,
      ],
    )

    if (agent_type === 'writer' && parsed && typeof parsed === 'object') {
      const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : []
      const captions = Array.isArray(parsed.captions) ? parsed.captions : []

      for (const hookText of hooks) {
        if (!hookText) continue
        await sql.query(
          `INSERT INTO content (brand_id, type, hook, status)
           VALUES ($1, 'hook', $2, 'pending')`,
          [brand_id, String(hookText)],
        )
      }
      for (const captionText of captions) {
        if (!captionText) continue
        await sql.query(
          `INSERT INTO content (brand_id, type, caption, status)
           VALUES ($1, 'caption', $2, 'pending')`,
          [brand_id, String(captionText)],
        )
      }
    }

    return res.status(200).json({
      success: true,
      agent_type,
      output: parsed,
      tokens_used: tokensUsed,
    })
  } catch (error) {
    console.error('agents handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
