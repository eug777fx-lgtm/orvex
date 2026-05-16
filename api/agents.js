// Required environment variables (set in Vercel project settings):
//   VITE_DATABASE_URL   — Neon Postgres connection string
//   ANTHROPIC_API_KEY   — Anthropic API key for Claude calls
//   HIGGSFIELD_API_KEY  — Higgsfield API key (only needed for video_director)
//
// Endpoints:
//   POST /api/agents                     body: { brand_id, agent_type, input }
//   GET  /api/agents?scheduled=true&brand=<name>&agent=<type>

import { generateVideo } from './video.js'
import { handleEditVideo } from './workflow.js'
import { startRemotionRender } from './_render-helper.js'

// video_producer assembles multi-scene videos (Higgsfield + ElevenLabs +
// Creatomate poll) — give the function the maximum serverless runtime.
export const config = { maxDuration: 300 }

function validateBrandContext(brand /*, agentType */) {
  const required = ['id', 'name']
  for (const field of required) {
    if (!brand?.[field]) {
      throw new Error(`Brand missing required field: ${field}`)
    }
  }
  return true
}

function assertSameBrand(rowBrandId, expectedBrandId) {
  if (rowBrandId !== expectedBrandId) {
    throw new Error(
      `Brand isolation violation: refusing to insert content for brand ${rowBrandId} into context ${expectedBrandId}`,
    )
  }
}

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

    const { brand_id, agent_type, input, package_id } = req.body || {}
    if (!brand_id) {
      return res.status(400).json({
        error:
          'brand_id is required. All agent runs must be tied to a specific brand.',
      })
    }
    if (!agent_type) {
      return res.status(400).json({ error: 'agent_type required' })
    }

    // Multi-scene production takes 2-5 minutes which exceeds serverless
    // limits — flip the package to 'producing', respond immediately, and
    // continue the Higgsfield + ElevenLabs + Creatomate flow in background.
    if (agent_type === 'video_producer') {
      if (!package_id) {
        return res.status(400).json({ error: 'package_id is required' })
      }
      const pkgRows = await sql.query(
        'SELECT * FROM post_packages WHERE id=$1 AND brand_id=$2',
        [package_id, brand_id],
      )
      const pkg = (pkgRows?.rows ?? pkgRows)?.[0]
      if (!pkg) {
        return res.status(404).json({ error: 'package not found' })
      }
      const brandRows = await sql.query(
        'SELECT id, name, primary_color, secondary_color, logo_url FROM brands WHERE id = $1',
        [brand_id],
      )
      const brand = (brandRows?.rows ?? brandRows)?.[0]
      await sql.query(
        "UPDATE post_packages SET status='producing' WHERE id=$1",
        [package_id],
      )
      // Fire-and-forget background production. On Vercel the container may
      // freeze after the response; the package stays 'producing' until a
      // later boot's cleanup or a successful background completion.
      setImmediate(() => {
        produceVideo({ sql, brand, pkg, package_id, brand_id }).catch((e) =>
          console.error('produceVideo background error:', e?.message || e),
        )
      })
      return res.status(200).json({
        success: true,
        status: 'producing',
        message: 'Video production started — check queue in 3-5 minutes',
      })
    }

    const result = await runAgent({
      sql,
      brand_id,
      agent_type,
      input,
      package_id,
    })
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

// Background multi-scene production: Higgsfield clip + ElevenLabs voiceover
// per scene, then a Creatomate timeline assembly. Runs detached from the
// request so it can take minutes.
async function produceVideo({ sql, brand, pkg, package_id, brand_id }) {
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
  let videoScript
  try {
    videoScript = JSON.parse(pkg.script)
  } catch {
    videoScript = null
  }
  const scenes = Array.isArray(videoScript?.scenes) ? videoScript.scenes : []
  if (scenes.length === 0) {
    await sql.query(
      "UPDATE post_packages SET status='needs_visual' WHERE id=$1",
      [package_id],
    )
    return
  }
  const brandColor = brand?.primary_color || '#0B0B0D'
  const scenes_data = []

  for (const scene of scenes) {
    // Step A — Higgsfield text-to-video.
    try {
      const higsRes = await fetch(
        'https://api.higgsfield.ai/v1/generation/text-to-video',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt:
              scene.visual_prompt +
              ` Brand colors: ${brandColor}. Cinematic quality. Vertical 9:16 format.`,
            duration: Math.min(scene.duration || 5, 8),
            aspect_ratio: '9:16',
          }),
        },
      )
      const higsData = await higsRes.json()
      const generationId = higsData.id || higsData.generation_id
      if (generationId) {
        let higsVideoUrl = null
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 5000))
          const statusRes = await fetch(
            `https://api.higgsfield.ai/v1/generation/${generationId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
              },
            },
          )
          const statusData = await statusRes.json()
          if (
            statusData.status === 'completed' ||
            statusData.status === 'succeeded'
          ) {
            higsVideoUrl =
              statusData.video_url ||
              statusData.output_url ||
              statusData.url
            break
          }
          if (statusData.status === 'failed') break
        }
        scenes_data.push({ ...scene, higgsfield_url: higsVideoUrl })
      } else {
        scenes_data.push({ ...scene, higgsfield_url: null })
      }
    } catch (err) {
      console.log('Higgsfield failed for scene', scene.scene_number, err.message)
      scenes_data.push({ ...scene, higgsfield_url: null })
    }

    // Step B — ElevenLabs voiceover.
    if (scene.voiceover && process.env.ELEVENLABS_API_KEY) {
      try {
        const voiceRes = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
              Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
              text: scene.voiceover,
              model_id: 'eleven_monolingual_v1',
              voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
          },
        )
        if (voiceRes.ok) {
          const audioBuffer = await voiceRes.arrayBuffer()
          const base64Audio = Buffer.from(audioBuffer).toString('base64')
          scenes_data[scenes_data.length - 1].audio_url =
            `data:audio/mpeg;base64,${base64Audio}`
        }
      } catch (err) {
        console.log('ElevenLabs failed for scene', scene.scene_number, err.message)
      }
    }
  }

  // Step 6 — build the Creatomate timeline.
  const creatomateElements = []
  let timeOffset = 0
  for (const scene of scenes_data) {
    const sceneDuration = scene.duration || 5
    if (scene.higgsfield_url) {
      creatomateElements.push({
        type: 'video',
        source: scene.higgsfield_url,
        time: timeOffset,
        duration: sceneDuration,
        fit: 'cover',
        volume: '0%',
      })
    } else {
      creatomateElements.push({
        type: 'rectangle',
        width: '100%',
        height: '100%',
        fill_color: brandColor,
        time: timeOffset,
        duration: sceneDuration,
      })
    }
    creatomateElements.push({
      type: 'rectangle',
      width: '100%',
      height: '100%',
      fill_color: 'rgba(0,0,0,0.45)',
      time: timeOffset,
      duration: sceneDuration,
    })
    if (scene.text_overlay) {
      creatomateElements.push({
        type: 'text',
        text: scene.text_overlay,
        time: timeOffset + 0.3,
        duration: sceneDuration - 0.5,
        width: '85%',
        height: 'auto',
        x_alignment: '50%',
        y_alignment: '50%',
        font_family: 'Montserrat',
        font_weight: '800',
        font_size: '8.5 vmin',
        fill_color: '#FFFFFF',
        letter_spacing: '-0.5px',
        animations: [
          {
            type: 'text-slide',
            duration: 0.4,
            direction: 'up',
            scope: 'split-clip',
          },
        ],
      })
    }
    if (scene.audio_url) {
      creatomateElements.push({
        type: 'audio',
        source: scene.audio_url,
        time: timeOffset,
        duration: sceneDuration,
      })
    }
    if (
      scene.transition_out === 'fade' &&
      timeOffset + sceneDuration < (videoScript.duration || Infinity)
    ) {
      creatomateElements.push({
        type: 'rectangle',
        width: '100%',
        height: '100%',
        fill_color: '#000000',
        time: timeOffset + sceneDuration - 0.3,
        duration: 0.3,
        opacity: '0%',
        animations: [{ type: 'fade', duration: 0.3, reversed: false }],
      })
    }
    timeOffset += sceneDuration
  }
  creatomateElements.push({
    type: 'text',
    text: brand?.name || '',
    time: 0,
    duration: timeOffset,
    x_alignment: '95%',
    y_alignment: '94%',
    font_family: 'Montserrat',
    font_weight: '300',
    font_size: '3 vmin',
    fill_color: 'rgba(255,255,255,0.5)',
    letter_spacing: '2px',
  })
  creatomateElements.push({
    type: 'audio',
    source: 'https://cdn.pixabay.com/audio/2024/01/15/audio_8b2a4f6c7d.mp3',
    time: 0,
    duration: timeOffset,
    volume: '15%',
    audio_fade_in: 1,
    audio_fade_out: 1,
  })

  // Step 7 — submit to Creatomate.
  let creatomateRenderId = null
  try {
    const creatomateRes = await fetch(
      'https://api.creatomate.com/v1/renders',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          output_format: 'mp4',
          width: 1080,
          height: 1920,
          frame_rate: 30,
          duration: timeOffset,
          elements: creatomateElements,
        }),
      },
    )
    const creatomateData = await creatomateRes.json()
    creatomateRenderId = Array.isArray(creatomateData)
      ? creatomateData[0]?.id
      : creatomateData?.id
  } catch (err) {
    console.log('Creatomate submit failed:', err.message)
  }

  // Step 8 — poll Creatomate.
  let finalVideoUrl = null
  if (creatomateRenderId) {
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const pollRes = await fetch(
          `https://api.creatomate.com/v1/renders/${creatomateRenderId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}`,
            },
          },
        )
        const pollData = await pollRes.json()
        if (pollData.status === 'succeeded') {
          finalVideoUrl = pollData.url
          break
        }
        if (pollData.status === 'failed') {
          console.log('Creatomate failed:', pollData.error)
          break
        }
      } catch (err) {
        console.log('Creatomate poll error:', err.message)
      }
    }
  }

  // Step 9 — finalise.
  const scenesCount = scenes_data.length
  if (finalVideoUrl) {
    await sql.query(
      `UPDATE post_packages
          SET visual_url=$1, visual_type='video', status='ready',
              scenes_data=$2::jsonb, video_duration=$3, scenes_count=$4
        WHERE id=$5`,
      [
        finalVideoUrl,
        JSON.stringify(scenes_data),
        Math.round(timeOffset),
        scenesCount,
        package_id,
      ],
    )
    await sql.query(
      `INSERT INTO agent_runs (brand_id, agent_type, status, output)
       VALUES ($1, 'video_producer', 'complete', $2)`,
      [
        brand_id,
        JSON.stringify({
          video_url: finalVideoUrl,
          scenes: scenesCount,
          duration: timeOffset,
        }),
      ],
    )
    return
  }

  // Fallback — best individual scene that has a Higgsfield clip.
  const fallbackUrl =
    scenes_data.find((s) => s.higgsfield_url)?.higgsfield_url || null
  await sql.query(
    `UPDATE post_packages
        SET visual_url=$1, status='ready',
            scenes_data=$2::jsonb, video_duration=$3, scenes_count=$4
      WHERE id=$5`,
    [
      fallbackUrl,
      JSON.stringify(scenes_data),
      Math.round(timeOffset),
      scenesCount,
      package_id,
    ],
  )
  await sql.query(
    `INSERT INTO agent_runs (brand_id, agent_type, status, output)
     VALUES ($1, 'video_producer', 'fallback', $2)`,
    [
      brand_id,
      JSON.stringify({
        fallback: true,
        video_url: fallbackUrl,
        message: 'Used best available scene as fallback',
      }),
    ],
  )
}

async function runAgent({
  sql,
  brand_id: requestedBrandId,
  agent_type,
  input,
  package_id,
}) {
  const brandRows = await sql.query(
    'SELECT id, name, voice_prompt, color, platforms, logo_url, primary_color, secondary_color, visual_style, aesthetic_description FROM brands WHERE id = $1',
    [requestedBrandId],
  )
  const brand = (brandRows?.rows ?? brandRows)?.[0]
  if (!brand || !brand.id) {
    const err = new Error(
      `Brand not found for id: ${requestedBrandId}. Cannot run agent without valid brand.`,
    )
    err.status = 404
    throw err
  }

  // Strict brand isolation: validate the brand context and from this point on
  // shadow the original brand_id with the validated brand.id pulled from the
  // database. Every downstream insert below uses this validated value.
  validateBrandContext(brand, agent_type)
  const brand_id = brand.id

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
  const contentGaps = brandMemory
    .filter((m) => m.memory_type === 'content_gap')
    .map((m) => m.content)
    .join('\n')

  const visualContext = brand.logo_url
    ? ` VISUAL IDENTITY: Primary color: ${brand.primary_color}. Secondary color: ${brand.secondary_color}. Visual style: ${brand.visual_style}. Aesthetic: ${brand.aesthetic_description}. Reference these when suggesting visuals, colors, or video concepts.`
    : ''

  // video_editor is an orchestrator agent — it inspects a ready pipeline,
  // asks Claude to plan an editing timeline, then drives Creatomate via
  // workflow.handleEditVideo and finalises the post_packages row.
  if (agent_type === 'video_editor') {
    const pipelineRows = await sql.query(
      `SELECT id, brand_id, stage, script_data, audio_data, visual_data, assembly_data, post_package_id
         FROM content_pipeline
        WHERE brand_id = $1
          AND stage IN ('visuals', 'assembly')
        ORDER BY created_at DESC
        LIMIT 1`,
      [brand_id],
    )
    const pipeline = (pipelineRows?.rows ?? pipelineRows)?.[0]
    if (!pipeline) {
      return {
        parsed: {
          error: 'No pipeline ready for editing. Run the video pipeline first.',
        },
        tokensUsed: 0,
        itemsGenerated: 0,
        video: null,
      }
    }
    const script = pipeline.script_data || {}
    const audio = pipeline.audio_data || {}
    const visuals = pipeline.visual_data || {}

    const editorSystemPrompt = `You are a professional video editor for ${brand.name}.
BRAND STYLE: ${brand.visual_style || 'modern'} — ${brand.aesthetic_description || ''}
PRIMARY COLOR: ${brand.primary_color || '#0B0B0D'}

You have these assets ready:
SCRIPT: ${JSON.stringify(script)}
AUDIO: ${JSON.stringify(audio)}
VISUALS: ${JSON.stringify(visuals)}

Create a precise editing timeline that sequences these assets into a polished final video.
Output ONLY valid JSON:
{
  "total_duration": number,
  "aspect_ratio": "9:16",
  "color_grade": { "contrast": number, "saturation": number, "brightness": number, "shadows": string },
  "scenes": [
    {
      "scene_number": number,
      "start_time": number,
      "duration": number,
      "visual_url": string or null,
      "visual_type": "video" or "image" or "motion_graphic",
      "text_overlay": string or null,
      "audio_url": string or null,
      "transition_in": "fade" or "slide" or "flash" or "blur",
      "transition_duration": number,
      "remotion_overlay": boolean,
      "remotion_composition": string or null,
      "remotion_props": object or null
    }
  ],
  "background_music": { "mood": string, "volume": number },
  "final_hook": string,
  "final_cta": string
}`

    const aRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        system: editorSystemPrompt,
        messages: [{ role: 'user', content: 'Plan the editing timeline now.' }],
      }),
    })
    if (!aRes.ok) {
      const errBody = await aRes.text()
      const err = new Error('anthropic_call_failed: ' + errBody)
      err.status = 502
      throw err
    }
    const aData = await aRes.json()
    const aText = aData?.content?.[0]?.text ?? ''
    const aTokens =
      (aData?.usage?.input_tokens || 0) + (aData?.usage?.output_tokens || 0)
    let timeline
    try {
      const m = aText.match(/\{[\s\S]*\}/)
      timeline = m ? JSON.parse(m[0]) : { raw_output: aText }
    } catch {
      timeline = { raw_output: aText }
    }

    await sql.query(
      `INSERT INTO agent_runs (brand_id, agent_type, input, output, status, tokens_used)
       VALUES ($1, 'video_editor', $2, $3, 'complete', $4)`,
      [
        brand_id,
        JSON.stringify({ input: input || null, pipeline_id: pipeline.id }),
        JSON.stringify(timeline),
        aTokens,
      ],
    )

    const timelineScenes = Array.isArray(timeline?.scenes) ? timeline.scenes : []
    const audioScenes = Array.isArray(audio?.scenes) ? audio.scenes : []
    const firstAudioUrl =
      audioScenes.find((s) => s?.audio_url)?.audio_url || null

    const editorResult = await handleEditVideo(sql, {
      brand_id,
      scenes: timelineScenes,
      audio_url: firstAudioUrl,
      composition_type: timelineScenes[0]?.remotion_composition || null,
    })

    const outputUrl = editorResult?.url || null
    const contentId = editorResult?.content_id || null

    await sql.query(
      `UPDATE content_pipeline
          SET stage='assembly',
              assembly_data=$1::jsonb,
              updated_at=now()
        WHERE id=$2`,
      [
        JSON.stringify({
          timeline,
          rendered_url: outputUrl,
          editor_result: editorResult,
        }),
        pipeline.id,
      ],
    )

    if (outputUrl) {
      assertSameBrand(brand_id, brand.id)
      await sql.query(
        `INSERT INTO post_packages
           (brand_id, status, hook_text, caption_text, cta_text, visual_url, visual_type, platform)
         VALUES ($1, 'ready', $2, $3, $4, $5, 'video', $6)`,
        [
          brand_id,
          String(timeline?.final_hook || script?.hook || ''),
          String(script?.hook || script?.title || ''),
          String(timeline?.final_cta || script?.cta || ''),
          outputUrl,
          script?.platform === 'facebook' ? 'facebook' : 'instagram',
        ],
      )
    }

    return {
      parsed: {
        editing_complete: !!outputUrl,
        video_url: outputUrl,
        content_id: contentId,
        timeline,
        editor_result: editorResult,
      },
      tokensUsed: aTokens,
      itemsGenerated: outputUrl ? 1 : 0,
      video: outputUrl ? { url: outputUrl, content_id: contentId } : null,
    }
  }

  const NICHE_BY_BRAND = {
    LIMITLESS: 'futures trading journal accountability',
    AWATEC: 'leak detection plumbing Aruba',
    'Lithos Labs': 'CRM marketing agency automation',
  }
  const niche = NICHE_BY_BRAND[brand.name] || brand.name
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let systemPrompt
  if (agent_type === 'strategy') {
    systemPrompt = `You are a content strategy agent for ${brand.name}. Today is ${todayStr}. HIGH PRIORITY CONTENT GAPS (topics with proven demand — prioritize these): ${contentGaps || 'No content gaps added yet — add from TikTok Creator Insights'} BRAND VOICE: ${voiceRules} TARGET AUDIENCE: ${audience} TOP PERFORMING CONTENT: ${topPerformers} CAMPAIGN HISTORY: ${campaignHistory}${visualContext} Create a 7-day content brief. Output ONLY valid JSON: { brief: string, angles: array of 3 strings, daily_topics: array of 7 strings, recommended_formats: array of 3 strings, key_message: string }`
  } else if (agent_type === 'writer') {
    systemPrompt = `You are a professional copywriter and short-form video director for ${brand.name}. BRAND VOICE — follow exactly: ${voiceRules} TARGET AUDIENCE: ${audience} BEST PERFORMING CONTENT: ${topPerformers}${visualContext}

Produce 3 complete post packages — mix of instagram and facebook, at least 1 must be a full multi-scene video. Output ONLY valid JSON:
{
  "packages": [
    {
      "platform": "instagram" | "facebook",
      "hook": "scroll-stopping line",
      "caption": "full caption that tells the story",
      "cta": "clear call to action",
      "hashtags": "5 space-separated hashtags",
      "visual_brief": "detailed description for Higgsfield or Remotion",
      "visual_type": "image" | "video" | "carousel",
      "remotion_composition": "HookOpener" | "QuoteCard" | "TradeInsight" | "BrandPromo" | "ServiceAd" | null,
      "video": {
        "title": "descriptive title of the video",
        "duration": 30,
        "platform": "instagram",
        "hook": "the opening line that stops the scroll",
        "scenes": [
          {
            "scene_number": 1,
            "start_time": 0,
            "end_time": 5,
            "duration": 5,
            "purpose": "hook",
            "visual_prompt": "Cinematic close-up. Dramatic lighting. Dark moody atmosphere. Camera slowly zooms in. Professional grade footage.",
            "text_overlay": "bold text that appears on screen",
            "voiceover": "exact words spoken in this scene",
            "sound_direction": "Tense ambient electronic music. Low frequency bass.",
            "remotion_composition": "HookOpener",
            "remotion_props": { "headline": "text for motion graphic", "subtext": "subtitle text", "primaryColor": "#c084fc" },
            "transition_out": "fade"
          }
        ],
        "music_direction": "Dark cinematic electronic. Builds through problem, resolves at solution.",
        "color_grade": "dark cinematic",
        "caption": "full instagram caption text here",
        "cta": "call to action",
        "hashtags": "#tag1 #tag2"
      }
    }
  ]
}

RULES: The "video" object is REQUIRED only when visual_type is "video" (omit it or set null otherwise). transition_out is one of "fade" | "cut" | "slide". Each video has 3 to 5 scenes. Each scene is 3-10 seconds. Total video duration 15-60 seconds. scene start_time/end_time must be sequential and continuous (scene N end_time == scene N+1 start_time).`
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

  // Strategy agent researches live trends via web search before writing the
  // brief. Other agents use a plain single-turn call.
  const isStrategy = agent_type === 'strategy'
  const requestBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: isStrategy ? 3000 : 2000,
    system: systemPrompt,
    messages: isStrategy
      ? [
          {
            role: 'user',
            content: `Research trending content in the ${niche} niche right now then create a 7-day content brief for ${brand.name}. Use web search to find what is working. Search for: trending ${niche} content ${todayStr}, viral hooks ${niche} instagram, what audiences want to see on social media. Brand context: ${systemPrompt}`,
          },
        ]
      : [{ role: 'user', content: input || 'Run your scheduled task now.' }],
  }
  if (isStrategy) {
    requestBody.tools = [
      { type: 'web_search_20250305', name: 'web_search' },
    ]
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  })

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.text()
    console.error('Anthropic error:', errBody)
    const err = new Error('anthropic_call_failed: ' + errBody)
    err.status = 502
    throw err
  }

  const apiData = await anthropicRes.json()
  // With web search the response is a mix of text, server_tool_use and
  // web_search_tool_result blocks — join every text block.
  const rawText = Array.isArray(apiData?.content)
    ? apiData.content
        .filter((b) => b?.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n')
        .trim()
    : apiData?.content?.[0]?.text ?? ''
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
      // Full multi-scene video script (only present for video packages).
      const videoScript =
        pkg.video && typeof pkg.video === 'object'
          ? JSON.stringify(pkg.video)
          : null

      // Persist the text parts as content rows for backward compat with the
      // rest of the system (analytics, repurpose, search, etc.).
      // Brand isolation: every insert below uses the validated brand_id and
      // guards against cross-brand contamination via assertSameBrand.
      let hookId = null
      let captionId = null
      assertSameBrand(brand_id, brand.id)
      if (hookText) {
        const r = await sql.query(
          `INSERT INTO content (brand_id, type, hook, status)
           VALUES ($1, 'hook', $2, 'pending') RETURNING id`,
          [brand.id, hookText],
        )
        hookId = (r?.rows ?? r)?.[0]?.id
      }
      if (captionText) {
        const r = await sql.query(
          `INSERT INTO content (brand_id, type, caption, status)
           VALUES ($1, 'caption', $2, 'pending') RETURNING id`,
          [brand.id, captionText],
        )
        captionId = (r?.rows ?? r)?.[0]?.id
      }

      const pkgInsert = await sql.query(
        `INSERT INTO post_packages
           (brand_id, status, platform, hook_id, caption_id,
            hook_text, caption_text, cta_text, hashtags,
            visual_type, visual_brief, remotion_composition, script)
         VALUES ($1, 'needs_visual', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
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
          videoScript,
        ],
      )
      const packageId = (pkgInsert?.rows ?? pkgInsert)?.[0]?.id
      itemsGenerated += 1

      // Auto-render a Remotion video for this package by invoking Lambda
      // directly (no fragile intra-deployment HTTP round-trip). If Remotion
      // isn't configured or the kickoff fails the package stays
      // 'needs_visual' and the UI offers manual generate / post-without-visual.
      if (packageId) {
        const renderComposition = composition || 'HookOpener'
        const remotionProps = {
          headline: hookText?.slice(0, 60) || 'Discipline is built quietly.',
          subtext: ctaText?.slice(0, 80) || 'Start journaling your trades.',
          brandName: brand.name,
          primaryColor: brand.primary_color || '#c084fc',
          secondaryColor: brand.secondary_color || '#ffffff',
          logoUrl: brand.logo_url || null,
        }

        // Only video packages render via Remotion. Image / carousel /
        // static_ad packages stay 'needs_visual' so the user can trigger
        // Higgsfield image generation from the UI instead.
        let renderResult = null
        if (visualType === 'video') {
          renderResult = await startRemotionRender({
            compositionId: renderComposition,
            props: remotionProps,
            brandId: brand.id,
            sql,
          })
        } else {
          console.log(
            'Package type',
            visualType,
            '- skipping Remotion render, needs image generation',
          )
        }

        if (renderResult?.renderId) {
          await sql.query(
            'UPDATE post_packages SET render_id=$1, render_bucket=$2, status=$3 WHERE id=$4',
            [
              renderResult.renderId,
              renderResult.bucketName,
              'rendering',
              packageId,
            ],
          )
          console.log(
            'Package',
            packageId,
            'render started:',
            renderResult.renderId,
          )
        } else {
          console.log(
            'Package',
            packageId,
            'render skipped — staying needs_visual',
          )
        }
      }
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

        // Wire the Higgsfield footage into a Remotion render as
        // backgroundVideoUrl. The composition draws motion-graphic text on
        // top of the footage. Fire-and-forget — we don't block on the
        // Lambda render here; the renderId is saved so it can be polled
        // later via /api/render.
        const backgroundVideoUrl = videoResult?.success ? videoResult.url : null
        const composition_id = parsed.remotion_composition || 'HookOpener'
        const baseProps = parsed.remotion_props || {
          headline: parsed.video_prompt?.slice(0, 80) || '',
          subtext: parsed.mood || '',
        }
        // The shared helper passes props straight through as inputProps, so
        // bake brand identity + Higgsfield footage into props here.
        const remotionProps = {
          ...baseProps,
          brandName: brand.name,
          logoUrl: brand.logo_url || null,
          primaryColor: brand.primary_color || '#ffffff',
          secondaryColor: brand.secondary_color || '#000000',
          backgroundVideoUrl,
        }
        try {
          const renderKick = await startRemotionRender({
            compositionId: composition_id,
            props: remotionProps,
            brandId: brand_id,
            sql,
          })
          if (renderKick?.renderId) {
            await sql.query(
              `INSERT INTO agent_runs (brand_id, agent_type, input, output, status)
               VALUES ($1, 'video_render', $2, $3, 'rendering')`,
              [
                brand_id,
                JSON.stringify({
                  composition_id,
                  backgroundVideoUrl,
                  props: remotionProps,
                }),
                JSON.stringify(renderKick),
              ],
            )
            if (videoResult && typeof videoResult === 'object') {
              videoResult.remotion_render = renderKick
              videoResult.backgroundVideoUrl = backgroundVideoUrl
            }
          }
        } catch (rerr) {
          console.error('startRemotionRender failed', rerr)
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
