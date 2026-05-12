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
    const brandMemory = memoryRows?.rows ?? memoryRows ?? []

    const voiceRules =
      brandMemory
        .filter((m) => m.memory_type === 'voice_rules')
        .map((m) => m.content)
        .join('\n') ||
      brand.voice_prompt ||
      'No voice rules defined yet.'
    const audience =
      brandMemory
        .filter((m) => m.memory_type === 'audience')
        .map((m) => m.content)
        .join('\n') || 'No audience profile defined yet.'
    const topPerformers =
      brandMemory
        .filter((m) => m.memory_type === 'top_performers')
        .map((m) => m.content)
        .join('\n') || 'No prior performance data yet.'
    const campaignHistory =
      brandMemory
        .filter((m) => m.memory_type === 'campaign_history')
        .map((m) => m.content)
        .join('\n') || 'No campaign history yet.'

    let systemPrompt
    if (agent_type === 'strategy') {
      systemPrompt = `You are a content strategy agent for ${brand.name}. BRAND VOICE: ${voiceRules} TARGET AUDIENCE: ${audience} TOP PERFORMING CONTENT: ${topPerformers} CAMPAIGN HISTORY: ${campaignHistory} Create a 7-day content brief. Output ONLY valid JSON: { brief: string, angles: array of 3 strings, daily_topics: array of 7 strings, recommended_formats: array of 3 strings, key_message: string }`
    } else if (agent_type === 'writer') {
      systemPrompt = `You are a professional copywriter for ${brand.name}. BRAND VOICE — follow exactly: ${voiceRules} TARGET AUDIENCE: ${audience} BEST PERFORMING CONTENT: ${topPerformers} Write high-performing social media content matching this brand voice exactly. Output ONLY valid JSON: { hooks: array of 5 strings, captions: array of 3 strings, scripts: array of 2 full reel scripts, cta: string }`
    } else if (agent_type === 'analytics') {
      systemPrompt = `You are an analytics agent for ${brand.name}. BRAND VOICE: ${voiceRules} TOP PERFORMERS: ${topPerformers} Output ONLY valid JSON: { top_performer: string, key_insight: string, recommendation: string, memory_update: string, avoid: string }`
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
        max_tokens: 2000,
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
      if (!match) {
        parsed = { raw_output: rawText }
      } else {
        try {
          parsed = JSON.parse(match[0])
        } catch {
          parsed = { raw_output: rawText }
        }
      }
    } catch {
      parsed = { raw_output: rawText }
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
      const scripts = Array.isArray(parsed.scripts) ? parsed.scripts : []

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
      for (const scriptText of scripts) {
        if (!scriptText) continue
        await sql.query(
          `INSERT INTO content (brand_id, type, script, status)
           VALUES ($1, 'script', $2, 'pending')`,
          [brand_id, String(scriptText)],
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
