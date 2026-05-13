// Required environment variables (set in Vercel project settings):
//   VITE_DATABASE_URL   — Neon Postgres connection string
//   ANTHROPIC_API_KEY   — Anthropic API key for Claude calls
//   HIGGSFIELD_API_KEY  — Higgsfield API key (only needed for video_director)
//
// Endpoints:
//   POST /api/agents                     body: { brand_id, agent_type, input }
//   GET  /api/agents?scheduled=true&brand=<name>&agent=<type>

import { generateVideo } from './video.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    if (req.method === 'GET') {
      const { scheduled, brand, agent } = req.query || {}
      if (scheduled !== 'true' || !brand || !agent) {
        return res.status(400).json({
          error: 'GET requires scheduled=true&brand=<name>&agent=<type>',
        })
      }
      const rows = await sql.query(
        'SELECT id FROM brands WHERE name = $1 LIMIT 1',
        [brand],
      )
      const brand_id = (rows?.rows ?? rows)?.[0]?.id
      if (!brand_id) return res.status(404).json({ error: 'brand not found' })

      const result = await runAgent({
        sql,
        brand_id,
        agent_type: agent,
        input: 'Scheduled run',
      })
      return res.status(200).json({
        success: true,
        items_generated: result.itemsGenerated,
        agent_type: agent,
        brand,
      })
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { brand_id, agent_type, input } = req.body || {}
    if (!brand_id || !agent_type) {
      return res.status(400).json({ error: 'brand_id and agent_type required' })
    }

    const result = await runAgent({ sql, brand_id, agent_type, input })
    return res.status(200).json({
      success: true,
      agent_type,
      output: result.parsed,
      tokens_used: result.tokensUsed,
      items_generated: result.itemsGenerated,
      ...(result.video ? { video: result.video } : {}),
    })
  } catch (error) {
    console.error('agents handler error:', error.message)
    const status = error.status || 500
    return res.status(status).json({ error: error.message })
  }
}

async function runAgent({ sql, brand_id, agent_type, input }) {
  const brandRows = await sql.query(
    'SELECT name, voice_prompt, color, platforms, logo_url, primary_color, secondary_color, visual_style, aesthetic_description FROM brands WHERE id = $1',
    [brand_id],
  )
  const brand = (brandRows?.rows ?? brandRows)?.[0]
  if (!brand) {
    const err = new Error('brand not found')
    err.status = 404
    throw err
  }

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

  const visualContext = brand.logo_url
    ? ` VISUAL IDENTITY: Primary color: ${brand.primary_color}. Secondary color: ${brand.secondary_color}. Visual style: ${brand.visual_style}. Aesthetic: ${brand.aesthetic_description}. Reference these when suggesting visuals, colors, or video concepts.`
    : ''

  let systemPrompt
  if (agent_type === 'strategy') {
    systemPrompt = `You are a content strategy agent for ${brand.name}. BRAND VOICE: ${voiceRules} TARGET AUDIENCE: ${audience} TOP PERFORMING CONTENT: ${topPerformers} CAMPAIGN HISTORY: ${campaignHistory}${visualContext} Create a 7-day content brief. Output ONLY valid JSON: { brief: string, angles: array of 3 strings, daily_topics: array of 7 strings, recommended_formats: array of 3 strings, key_message: string }`
  } else if (agent_type === 'writer') {
    systemPrompt = `You are a professional copywriter for ${brand.name}. BRAND VOICE — follow exactly: ${voiceRules} TARGET AUDIENCE: ${audience} BEST PERFORMING CONTENT: ${topPerformers}${visualContext} Produce 3 complete post packages — mix of instagram and facebook, mix of image and video. Each package is a fully ready post (hook + caption + CTA + hashtags + visual brief). Output ONLY valid JSON: { packages: array of 3 objects, each { platform: 'instagram' or 'facebook', hook: string (scroll-stopping line), caption: string (full caption that tells the story), cta: string (clear call to action), hashtags: string (5 space-separated hashtags), visual_brief: string (detailed description for Higgsfield or Remotion), visual_type: 'image' or 'video' or 'carousel', remotion_composition: 'HookOpener' or 'QuoteCard' or 'TradeInsight' or 'BrandPromo' or 'ServiceAd' or null } }`
  } else if (agent_type === 'analytics') {
    systemPrompt = `You are an analytics agent for ${brand.name}. BRAND VOICE: ${voiceRules} TOP PERFORMERS: ${topPerformers}${visualContext} Output ONLY valid JSON: { top_performer: string, key_insight: string, recommendation: string, memory_update: string, avoid: string }`
  } else if (agent_type === 'video_director') {
    systemPrompt = `You are a video director agent for ${brand.name}. BRAND VOICE: ${voiceRules} AUDIENCE: ${audience}${visualContext} Your job is to generate a cinematic video prompt for this brand. Output ONLY valid JSON: { video_prompt: string (detailed cinematic prompt for Higgsfield), image_prompt: string (detailed image prompt), style: string, mood: string, duration: 5, type: text_to_video }`
  } else if (agent_type === 'repurpose') {
    const approvedRows = await sql.query(
      `SELECT id, hook, caption, script FROM content
       WHERE brand_id = $1 AND status = 'approved'
       ORDER BY created_at DESC LIMIT 1`,
      [brand_id],
    )
    const approved = (approvedRows?.rows ?? approvedRows)?.[0]
    if (!approved) {
      const err = new Error('no approved content to repurpose')
      err.status = 404
      throw err
    }
    const originalContent = [approved.hook, approved.caption, approved.script]
      .filter(Boolean)
      .join('\n')
    systemPrompt = `You are a content repurposing agent for ${brand.name}. BRAND VOICE: ${voiceRules}${visualContext} Take this original content and repurpose it into 2 platform-native formats for Instagram and Facebook. Original content: ${originalContent}. Output ONLY valid JSON: { instagram_caption: string, facebook_post: string }`
  } else {
    const err = new Error(`unsupported agent_type: ${agent_type}`)
    err.status = 400
    throw err
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
    const err = new Error('anthropic_call_failed: ' + errBody)
    err.status = 502
    throw err
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

  let itemsGenerated = 0
  if (agent_type === 'writer' && parsed && typeof parsed === 'object') {
    const packages = Array.isArray(parsed.packages) ? parsed.packages : []
    for (const pkg of packages) {
      if (!pkg) continue
      const hookText = String(pkg.hook || '')
      const captionText = String(pkg.caption || '')
      const ctaText = String(pkg.cta || '')
      const hashtags = String(pkg.hashtags || '')
      const platform =
        pkg.platform === 'facebook' ? 'facebook' : 'instagram'
      const visualType = ['video', 'carousel'].includes(pkg.visual_type)
        ? pkg.visual_type
        : 'image'
      const visualBrief = String(pkg.visual_brief || '')
      const composition = pkg.remotion_composition || null

      // Persist the text parts as content rows for backward compat with the
      // rest of the system (analytics, repurpose, search, etc.).
      let hookId = null
      let captionId = null
      if (hookText) {
        const r = await sql.query(
          `INSERT INTO content (brand_id, type, hook, status)
           VALUES ($1, 'hook', $2, 'pending') RETURNING id`,
          [brand_id, hookText],
        )
        hookId = (r?.rows ?? r)?.[0]?.id
      }
      if (captionText) {
        const r = await sql.query(
          `INSERT INTO content (brand_id, type, caption, status)
           VALUES ($1, 'caption', $2, 'pending') RETURNING id`,
          [brand_id, captionText],
        )
        captionId = (r?.rows ?? r)?.[0]?.id
      }

      await sql.query(
        `INSERT INTO post_packages
           (brand_id, status, platform, hook_id, caption_id,
            hook_text, caption_text, cta_text, hashtags,
            visual_type, visual_brief, remotion_composition)
         VALUES ($1, 'needs_visual', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          brand_id,
          platform,
          hookId,
          captionId,
          hookText,
          captionText,
          ctaText,
          hashtags,
          visualType,
          visualBrief,
          composition,
        ],
      )
      itemsGenerated += 1
    }
  }

  let videoResult = null
  if (agent_type === 'video_director' && parsed && typeof parsed === 'object') {
    const videoPrompt = parsed.video_prompt
    // Always save a brief row first so something appears in the Videos queue,
    // even if Higgsfield fails or times out.
    let briefId = null
    try {
      const briefInsert = await sql.query(
        `INSERT INTO content (brand_id, type, script, status)
         VALUES ($1, 'video_brief', $2, 'pending')
         RETURNING id`,
        [brand_id, JSON.stringify(parsed)],
      )
      briefId = (briefInsert?.rows ?? briefInsert)?.[0]?.id
      itemsGenerated += 1
    } catch (e) {
      console.error('video_director brief insert failed', e)
    }

    if (videoPrompt) {
      try {
        videoResult = await generateVideo({
          brand_id,
          type: 'text_to_video',
          prompt: videoPrompt,
          sql,
        })
        if (videoResult?.success && briefId && videoResult.url) {
          // Promote the brief row to a real video with the rendered URL.
          await sql.query(
            `UPDATE content SET type='video', script=$1 WHERE id=$2`,
            [videoResult.url, briefId],
          )
        }
      } catch (e) {
        console.error('video_director generateVideo failed', e)
        videoResult = {
          success: true,
          type: 'video_brief',
          message: 'Video brief generated — Higgsfield rendering in progress',
        }
      }
    } else {
      videoResult = {
        success: true,
        type: 'video_brief',
        message: 'Video brief generated — no video_prompt to render yet',
      }
    }
  }

  if (agent_type === 'repurpose' && parsed && typeof parsed === 'object') {
    const platforms = [
      { type: 'instagram', column: 'caption', value: parsed.instagram_caption },
      { type: 'facebook', column: 'caption', value: parsed.facebook_post },
    ]
    for (const p of platforms) {
      if (!p.value) continue
      const insertSQL = `INSERT INTO content (brand_id, type, ${p.column}, status) VALUES ($1, $2, $3, 'pending')`
      await sql.query(insertSQL, [brand_id, p.type, String(p.value)])
      itemsGenerated += 1
    }
  }

  return { parsed, tokensUsed, itemsGenerated, video: videoResult }
}
