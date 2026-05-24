// Required env vars: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, CREATOMATE_API_KEY, SALES_REP_INVITE_CODE, WEBHOOK_SECRET
//
// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL    — Neon Postgres connection string
//   SALES_REP_INVITE_CODE — invite code required for sales rep self-registration
//   ANTHROPIC_API_KEY    — Claude API key (for pipeline script stage)
//   ELEVENLABS_API_KEY   — ElevenLabs TTS (optional; falls back if missing)
//   CREATOMATE_API_KEY   — Creatomate video render API (optional; falls back if missing)
//   INSTAGRAM_ACCESS_TOKEN — Instagram Graph API access token (for post_instagram)
//   INSTAGRAM_USER_ID    — Instagram business account user id (for post_instagram)
//
// GET  /api/workflow?action=next&brand_id=<uuid>
//   Returns the next approved+unpublished content ready to post.
//   Response: { success, has_content, content? }
//
// GET  /api/workflow?action=pipeline_list&brand_id=<uuid>
//   Returns recent pipelines for the brand (for the UI).
//
// GET  /api/workflow?action=render_status&render_id=<id>&bucket=<bucket>
//   Polls a Remotion Lambda render. When done, backfills visual_url onto the
//   post_package (matched by render_id) and flips status to 'ready'.
//   Response: { success, done, progress, url?, error?, message? }
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
//   Body: { action: 'pipeline_start', brand_id, type }
//     Starts a new content pipeline. type 'full' or 'script_only' runs Stage 1
//     (Claude script generation), creates a content_pipeline row, returns
//     { pipeline_id, stage: 'script', script }.
//   Body: { action: 'pipeline_advance', pipeline_id, stage }
//     Advances an existing pipeline. stage 'audio' | 'visuals' | 'assembly'.
//   Body: { action: 'edit_video', brand_id, scenes, audio_url, composition_type }
//     Builds a Creatomate timeline from scenes and renders an MP4. Returns
//     { url, content_id, duration, scenes_count } or a structured fallback
//     when CREATOMATE_API_KEY is missing.
//   Body: { action: 'post_instagram', package_id, brand_id }
//     Publishes a package to Instagram (Graph API). Returns { success, post_id }
//     or { success:false, error }.
//   Body: { action: 'analytics_pull', brand_id, post_id, content_id }
//     Pulls IG insights, scores the post, updates analytics, promotes
//     score>75 into brand_memory. Returns { success, score }.
//
// GET  /api/workflow?action=next_scheduled&brand_id=<uuid>
//   Next approved package with a visual whose schedule slot is due.
//   Response: { success, has_content, package? }
//
// POST /api/workflow { action: 'process_productions' }
// GET  /api/workflow?action=process_productions
//   Cron-driven worker. Drains up to 3 packages stuck in 'producing' and
//   runs the full Higgsfield + ElevenLabs + Creatomate production for each.

import { produceVideo } from './_render-helper.js'

const MAX_PER_DAY = 3
const SLOT_GAP_HOURS = 4
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

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

// Shared slot finder: next unpublished schedule slot for the brand,
// respecting the 4h cadence and the per-day cap.
async function findNextSlot(sql, brand_id) {
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
  return candidate
}

async function handleApprove(sql, body) {
  const { content_id, package_id, brand_id } = body

  // New flow: approving a post_package directly.
  if (package_id) {
    // 1. Find the package by id.
    const pkgRows = await sql.query(
      'SELECT * FROM post_packages WHERE id=$1',
      [package_id],
    )
    const pkg = (pkgRows?.rows ?? pkgRows)?.[0]
    // 2. 404 if not found.
    if (!pkg) {
      const err = new Error('package not found')
      err.status = 404
      throw err
    }
    const bId = pkg.brand_id || brand_id
    const platform = pkg.platform || 'instagram'

    // 3. Next slot: last scheduled_at + 4h, max 3/day (findNextSlot).
    const candidate = await findNextSlot(sql, bId)

    // 4. Approve + stamp the slot in one update.
    await sql.query(
      "UPDATE post_packages SET status='approved', scheduled_at=$1, updated_at=now() WHERE id=$2",
      [candidate.toISOString(), package_id],
    )

    // 5. schedules.content_id is a FK to content(id). Reuse the package's
    // hook/caption content row; otherwise create one.
    let scheduleContentId = pkg.hook_id || pkg.caption_id || null
    if (!scheduleContentId) {
      const created = await sql.query(
        `INSERT INTO content (brand_id, type, hook, caption, status, created_at)
         VALUES ($1, 'hook', $2, $3, 'approved', now())
         RETURNING id`,
        [bId, pkg.hook_text || '', pkg.caption_text || ''],
      )
      scheduleContentId = (created?.rows ?? created)?.[0]?.id
    }

    // 6. Schedule it.
    await sql.query(
      `INSERT INTO schedules (content_id, brand_id, platform, scheduled_at, published)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT DO NOTHING`,
      [scheduleContentId, bId, platform, candidate.toISOString()],
    )

    // 7.
    return { success: true, scheduled_at: candidate.toISOString(), platform }
  }

  // Old flow: approving a content row (backward compatible — unchanged).
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

  const candidate = await findNextSlot(sql, brand_id)
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

// ---------------------------------------------------------------------------
// Pipeline helpers (merged from former /api/pipeline.js)
// ---------------------------------------------------------------------------

async function fetchBrandWithMemory(sql, brand_id) {
  const brandRows = await sql.query(
    'SELECT id, name, voice_prompt, primary_color, secondary_color, visual_style, aesthetic_description FROM brands WHERE id = $1',
    [brand_id],
  )
  const brand = (brandRows?.rows ?? brandRows)?.[0]
  if (!brand || !brand.id) {
    const err = new Error(`Brand not found for id: ${brand_id}`)
    err.status = 404
    throw err
  }
  const memoryRows = await sql.query(
    'SELECT content, memory_type FROM brand_memory WHERE brand_id = $1',
    [brand.id],
  )
  const brandMemory = memoryRows?.rows ?? memoryRows ?? []
  const get = (type) =>
    brandMemory
      .filter((m) => m.memory_type === type)
      .map((m) => m.content)
      .join('\n')
  return {
    brand,
    voiceRules: get('voice_rules') || brand.voice_prompt || 'Clear, calm, confident.',
    audience: get('audience') || 'No audience defined yet.',
    topPerformers: get('top_performers') || 'No prior performance data.',
  }
}

function buildSceneSfx(scene) {
  const desc = String(scene?.visual_description || '').toLowerCase()
  const suggestions = []
  const timing = []
  const add = (cue, time) => {
    suggestions.push(cue)
    if (time != null) timing.push({ time_seconds: time, effect_description: cue })
  }
  if (/water|leak|drip|rain/.test(desc)) add('Drip / water flow ambience', 0)
  if (/keyboard|typing|computer|laptop/.test(desc)) add('Keyboard typing taps', 1)
  if (/phone|notification|message|dm/.test(desc)) add('Soft notification chime', 0.5)
  if (/trade|chart|graph|line moving/.test(desc)) add('Subtle chart/graph movement whoosh', 0.75)
  if (/door|enter|walk in/.test(desc)) add('Door open + footsteps', 0)
  if (/text overlay|hook appears|word appears/.test(desc)) add('Text-stamp whoosh', 0.25)
  if (suggestions.length === 0) add('Ambient cinematic bed', 0)
  return {
    background_music: scene?.sound_direction || '',
    sfx_suggestions: suggestions,
    timing,
  }
}

function safeParseJSON(text) {
  if (!text) return null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { raw_output: text }
    return JSON.parse(match[0])
  } catch {
    return { raw_output: text }
  }
}

async function runScriptStage(sql, brand_id) {
  const { brand, voiceRules, audience } = await fetchBrandWithMemory(sql, brand_id)

  const systemPrompt = `You are a video content director for ${brand.name}. BRAND VOICE: ${voiceRules} AUDIENCE: ${audience} Create a complete video script broken into exactly 4 scenes. Output ONLY valid JSON: { title: string, total_duration: number (seconds), platform: 'instagram' or 'facebook', scenes: array of 4 { scene_number, duration: number, visual_description: string, dialogue: string or null, text_overlay: string or null, sound_direction: string, remotion_composition: 'HookOpener' or 'TradeInsight' or 'QuoteCard' or 'BrandPromo' or 'ServiceAd', remotion_props: { headline, subtext, primaryColor, brandName } }, hook: string, cta: string }`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the script now.' }],
    }),
  })
  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.text()
    throw new Error('Claude failed: ' + errBody)
  }
  const apiData = await anthropicRes.json()
  const rawText = apiData?.content?.[0]?.text ?? ''
  const parsed = safeParseJSON(rawText) || {}

  const inserted = await sql.query(
    `INSERT INTO content_pipeline (brand_id, stage, script_data, updated_at)
     VALUES ($1, 'script', $2::jsonb, now())
     RETURNING id`,
    [brand.id, JSON.stringify(parsed)],
  )
  const pipelineId = (inserted?.rows ?? inserted)?.[0]?.id
  return { pipeline_id: pipelineId, stage: 'script', script: parsed }
}

async function runAudioStage(sql, pipelineId) {
  const rows = await sql.query(
    'SELECT id, brand_id, script_data, fallback_used, fallback_type FROM content_pipeline WHERE id = $1',
    [pipelineId],
  )
  const pipeline = (rows?.rows ?? rows)?.[0]
  if (!pipeline) {
    const err = new Error(`pipeline ${pipelineId} not found`)
    err.status = 404
    throw err
  }
  const script = pipeline.script_data || {}
  const scenes = Array.isArray(script.scenes) ? script.scenes : []

  let fallbackUsed = !!pipeline.fallback_used
  let fallbackType = pipeline.fallback_type || null
  const sceneAudio = []
  const hasKey = !!process.env.ELEVENLABS_API_KEY
  let voiceoverScenes = 0

  for (const scene of scenes) {
    const sfx = buildSceneSfx(scene)
    const baseSceneAudio = {
      scene_number: scene.scene_number,
      music_direction: scene.sound_direction || '',
      sound_effects: sfx,
    }
    if (!scene.dialogue) {
      sceneAudio.push({
        ...baseSceneAudio,
        has_voiceover: false,
      })
      continue
    }
    if (!hasKey) {
      fallbackUsed = true
      fallbackType = fallbackType || 'text_only'
      sceneAudio.push({
        ...baseSceneAudio,
        has_voiceover: false,
        script_fallback: scene.dialogue,
      })
      continue
    }
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text: scene.dialogue,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      )
      if (!res.ok) throw new Error(`elevenlabs ${res.status}`)
      const buf = await res.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      sceneAudio.push({
        ...baseSceneAudio,
        has_voiceover: true,
        audio_url: `data:audio/mpeg;base64,${base64}`,
        duration: scene.duration || null,
      })
      voiceoverScenes += 1
    } catch (e) {
      fallbackUsed = true
      fallbackType = fallbackType || 'text_only'
      sceneAudio.push({
        ...baseSceneAudio,
        has_voiceover: false,
        script_fallback: scene.dialogue,
        error: String(e.message || e),
      })
    }
  }

  const totalDuration = scenes.reduce((s, sc) => s + (sc.duration || 0), 0)
  const musicDirections = Array.from(
    new Set(scenes.map((s) => s.sound_direction).filter(Boolean)),
  )
  const audio_data = {
    scenes: sceneAudio,
    total_audio_duration: totalDuration,
    final_brief: {
      total_duration: totalDuration,
      has_voiceover: voiceoverScenes > 0,
      voiceover_scenes: voiceoverScenes,
      music_direction: musicDirections.join(' · ') || 'No music direction set',
      production_notes: voiceoverScenes
        ? `Mix ${voiceoverScenes} voiceover scene(s) over ambient bed matching: ${musicDirections.join(', ') || 'cinematic'}. Layer in scene SFX at the timing notes per scene.`
        : `Pure music + SFX edit. Use ${musicDirections.join(', ') || 'cinematic'} as the bed. Show dialogue/text as on-screen overlay per scene.`,
    },
    fallback_note: fallbackUsed
      ? 'Audio ready for production — voiceover text and music direction provided'
      : null,
  }

  await sql.query(
    `UPDATE content_pipeline
        SET stage='audio',
            audio_data=$1::jsonb,
            fallback_used=$2,
            fallback_type=$3,
            updated_at=now()
      WHERE id=$4`,
    [JSON.stringify(audio_data), fallbackUsed, fallbackType, pipelineId],
  )
  return { stage: 'audio', audio_data, fallback_used: fallbackUsed }
}

async function runVisualsStage(sql, pipelineId) {
  const rows = await sql.query(
    'SELECT id, brand_id, script_data, fallback_used, fallback_type FROM content_pipeline WHERE id = $1',
    [pipelineId],
  )
  const pipeline = (rows?.rows ?? rows)?.[0]
  if (!pipeline) {
    const err = new Error(`pipeline ${pipelineId} not found`)
    err.status = 404
    throw err
  }
  const script = pipeline.script_data || {}
  const scenes = Array.isArray(script.scenes) ? script.scenes : []

  let fallbackUsed = !!pipeline.fallback_used
  let fallbackType = pipeline.fallback_type || null
  const visualScenes = []

  for (const scene of scenes) {
    fallbackUsed = true
    fallbackType = fallbackType || 'storyboard'
    visualScenes.push({
      scene_number: scene.scene_number,
      storyboard: {
        visual_description: scene.visual_description || '',
        text_overlay: scene.text_overlay || '',
        mood: scene.sound_direction || '',
        suggested_composition: scene.remotion_composition || 'HookOpener',
        remotion_props: scene.remotion_props || {},
        status: 'storyboard_only',
      },
    })
  }

  const visual_data = { scenes: visualScenes }
  await sql.query(
    `UPDATE content_pipeline
        SET stage='visuals',
            visual_data=$1::jsonb,
            fallback_used=$2,
            fallback_type=$3,
            updated_at=now()
      WHERE id=$4`,
    [JSON.stringify(visual_data), fallbackUsed, fallbackType, pipelineId],
  )
  return { stage: 'visuals', visual_data, fallback_used: fallbackUsed }
}

async function runAssemblyStage(sql, pipelineId) {
  const rows = await sql.query(
    'SELECT id, brand_id, script_data, visual_data FROM content_pipeline WHERE id = $1',
    [pipelineId],
  )
  const pipeline = (rows?.rows ?? rows)?.[0]
  if (!pipeline) {
    const err = new Error(`pipeline ${pipelineId} not found`)
    err.status = 404
    throw err
  }
  const script = pipeline.script_data || {}
  const visual = pipeline.visual_data || {}
  const visualScenes = Array.isArray(visual.scenes) ? visual.scenes : []
  const allHaveVideo = visualScenes.length > 0 && visualScenes.every((s) => s.video_url)
  const someStoryboards = visualScenes.some((s) => s.storyboard)
  const assembly_data = allHaveVideo
    ? { type: 'full_video', scenes_complete: true }
    : { type: 'partial', has_storyboards: someStoryboards }

  const pkgInsert = await sql.query(
    `INSERT INTO post_packages
       (brand_id, status, platform, hook_text, caption_text, cta_text,
        visual_type, visual_brief, remotion_composition)
     VALUES ($1, 'needs_visual', $2, $3, $4, $5, 'video', $6, $7)
     RETURNING id`,
    [
      pipeline.brand_id,
      script.platform === 'facebook' ? 'facebook' : 'instagram',
      script.hook || '',
      script.title || '',
      script.cta || '',
      visualScenes.map((s) => s.storyboard?.visual_description || '').join('\n\n'),
      visualScenes[0]?.storyboard?.suggested_composition || null,
    ],
  )
  const pkgId = (pkgInsert?.rows ?? pkgInsert)?.[0]?.id

  await sql.query(
    `UPDATE content_pipeline
        SET stage='assembly',
            assembly_data=$1::jsonb,
            post_package_id=$2,
            updated_at=now()
      WHERE id=$3`,
    [JSON.stringify(assembly_data), pkgId, pipelineId],
  )
  return { stage: 'assembly', ready_for_review: true, post_package_id: pkgId }
}

async function handlePipelineList(sql, brand_id) {
  if (!brand_id) {
    const err = new Error('brand_id required')
    err.status = 400
    throw err
  }
  const rows = await sql.query(
    `SELECT id, brand_id, post_package_id, stage, fallback_used, fallback_type,
            script_data, audio_data, visual_data, assembly_data,
            created_at, updated_at
       FROM content_pipeline
      WHERE brand_id=$1
      ORDER BY created_at DESC
      LIMIT 20`,
    [brand_id],
  )
  return rows?.rows ?? rows ?? []
}

async function handlePipelineStart(sql, body) {
  const { brand_id, type } = body
  if (!brand_id) {
    const err = new Error('brand_id required. All pipelines must be tied to a brand.')
    err.status = 400
    throw err
  }
  const t = type || 'full'
  if (t !== 'full' && t !== 'script_only') {
    const err = new Error(`unsupported type: ${t}. Use 'full' or 'script_only'`)
    err.status = 400
    throw err
  }
  const scriptOut = await runScriptStage(sql, brand_id)
  if (t === 'script_only') return scriptOut
  return { ...scriptOut, next: 'audio' }
}

export async function handleEditVideo(sql, body) {
  const { brand_id, scenes, audio_url } = body
  if (!brand_id || !Array.isArray(scenes) || scenes.length === 0) {
    const err = new Error('brand_id and non-empty scenes array required')
    err.status = 400
    throw err
  }

  if (!process.env.CREATOMATE_API_KEY) {
    return {
      success: false,
      fallback: true,
      message:
        'Creatomate not configured — add CREATOMATE_API_KEY to Vercel env vars',
      scenes_received: scenes.length,
    }
  }

  const brandRows = await sql.query('SELECT * FROM brands WHERE id = $1', [
    brand_id,
  ])
  const brand = (brandRows?.rows ?? brandRows)?.[0]
  if (!brand) {
    const err = new Error('Brand not found')
    err.status = 404
    throw err
  }

  const { Client } = await import('creatomate')
  const client = new Client(process.env.CREATOMATE_API_KEY)

  const elements = []
  let currentTime = 0

  for (const scene of scenes) {
    const sceneDuration = scene.duration || 5

    if (scene.visual_url) {
      elements.push({
        type: scene.visual_type === 'video' ? 'video' : 'image',
        source: scene.visual_url,
        time: currentTime,
        duration: sceneDuration,
        fit: 'cover',
        animations: [{ type: 'fade', duration: 0.5 }],
      })
    } else {
      elements.push({
        type: 'rectangle',
        width: '100%',
        height: '100%',
        fill_color: brand.primary_color || '#0B0B0D',
        time: currentTime,
        duration: sceneDuration,
      })
    }

    if (scene.text_overlay) {
      elements.push({
        type: 'text',
        text: scene.text_overlay,
        time: currentTime + 0.3,
        duration: sceneDuration - 0.5,
        font_family: 'Montserrat',
        font_weight: '700',
        font_size: '8 vmin',
        fill_color: '#FFFFFF',
        x_alignment: '50%',
        y_alignment: '50%',
        width: '80%',
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

    if (brand.name) {
      elements.push({
        type: 'text',
        text: brand.name,
        time: currentTime,
        duration: sceneDuration,
        font_family: 'Montserrat',
        font_weight: '300',
        font_size: '3 vmin',
        fill_color: 'rgba(255,255,255,0.5)',
        x_alignment: '95%',
        y_alignment: '95%',
        animations: [{ type: 'fade', duration: 0.3 }],
      })
    }

    currentTime += sceneDuration
  }

  if (audio_url) {
    elements.push({
      type: 'audio',
      source: audio_url,
      time: 0,
      duration: currentTime,
      audio_fade_out: 0.5,
    })
  }

  elements.push({
    type: 'audio',
    source: 'https://cdn.creatomate.com/demo/ambient-cinematic.mp3',
    time: 0,
    duration: currentTime,
    volume: audio_url ? '15%' : '40%',
    audio_fade_in: 1,
    audio_fade_out: 1,
  })

  const renders = await client.render({
    outputFormat: 'mp4',
    width: 1080,
    height: 1920,
    frameRate: 30,
    duration: currentTime,
    elements,
  })

  const outputUrl = renders?.[0]?.url
  if (!outputUrl) throw new Error('No output URL from Creatomate')

  const contentRows = await sql.query(
    `INSERT INTO content (brand_id, type, script, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [brand_id, 'video', outputUrl, 'pending'],
  )
  const contentId = (contentRows?.rows ?? contentRows)?.[0]?.id

  return {
    url: outputUrl,
    content_id: contentId,
    duration: currentTime,
    scenes_count: scenes.length,
  }
}

async function handlePipelineAdvance(sql, body) {
  const { pipeline_id, stage } = body
  if (!pipeline_id || !stage) {
    const err = new Error('pipeline_id and stage required')
    err.status = 400
    throw err
  }
  if (stage === 'audio') {
    const out = await runAudioStage(sql, pipeline_id)
    return { pipeline_id, ...out }
  }
  if (stage === 'visuals') {
    const out = await runVisualsStage(sql, pipeline_id)
    return { pipeline_id, ...out }
  }
  if (stage === 'assembly') {
    const out = await runAssemblyStage(sql, pipeline_id)
    return { pipeline_id, ...out }
  }
  const err = new Error(`unknown stage: ${stage}`)
  err.status = 400
  throw err
}

// Polls a Remotion Lambda render and backfills the matching package
// (matched by render_id) when it finishes or fails.
async function handleRenderStatus(sql, { render_id, bucket }) {
  if (!render_id) {
    const err = new Error('render_id required')
    err.status = 400
    throw err
  }
  // Fall back to the known Remotion Lambda bucket when the caller didn't
  // persist one (older packages, or render_bucket was null).
  const bucketName =
    bucket && bucket !== 'null'
      ? bucket
      : process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-bqldmrtdxy'
  const { getRenderProgress } = await import('@remotion/lambda-client')
  const progress = await getRenderProgress({
    renderId: render_id,
    bucketName,
    functionName: process.env.REMOTION_FUNCTION_NAME,
    region: process.env.REMOTION_AWS_REGION || 'us-east-1',
  })

  if (progress.done && progress.outputFile) {
    await sql.query(
      `UPDATE post_packages
          SET visual_url=$1, visual_type='video', status='ready'
        WHERE render_id=$2`,
      [progress.outputFile, render_id],
    )
    await sql.query(
      "UPDATE agent_runs SET status='complete', output=$1 WHERE output::text LIKE $2",
      [
        JSON.stringify({
          renderId: render_id,
          bucketName,
          outputUrl: progress.outputFile,
        }),
        `%${render_id}%`,
      ],
    )
    return { done: true, url: progress.outputFile, progress: 1 }
  }

  if (progress.fatalErrorEncountered) {
    await sql.query(
      "UPDATE post_packages SET status='needs_visual' WHERE render_id=$1",
      [render_id],
    )
    return { done: false, error: true, message: 'Render failed' }
  }

  return { done: false, progress: progress.overallProgress || 0 }
}

// Publishes a post_package to Instagram via the Graph API: create a media
// container, then publish it, then mark the package published.
async function handlePostInstagram(sql, body) {
  const { package_id, brand_id } = body
  if (!package_id || !brand_id) {
    const err = new Error('package_id and brand_id required')
    err.status = 400
    throw err
  }
  const pkgRows = await sql.query(
    'SELECT * FROM post_packages WHERE id=$1 AND brand_id=$2',
    [package_id, brand_id],
  )
  const pkg = (pkgRows?.rows ?? pkgRows)?.[0]
  if (!pkg) {
    const err = new Error('package not found')
    err.status = 404
    throw err
  }
  if (!pkg.visual_url) {
    return { success: false, error: 'No visual available' }
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID
  if (!token || !userId) {
    return {
      success: false,
      error:
        'Instagram not configured — set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID',
    }
  }

  const fullCaption = [pkg.caption_text, pkg.cta_text, pkg.hashtags]
    .filter(Boolean)
    .join('\n\n')
  const isVideo = pkg.visual_type === 'video'

  // Step 1 — create the media container.
  const containerBody = {
    caption: fullCaption,
    access_token: token,
  }
  if (isVideo) {
    containerBody.video_url = pkg.visual_url
    containerBody.media_type = 'REELS'
  } else {
    containerBody.image_url = pkg.visual_url
    containerBody.media_type = 'IMAGE'
  }
  const createRes = await fetch(
    `https://graph.instagram.com/v21.0/${userId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    },
  )
  const createData = await createRes.json()
  if (!createRes.ok || !createData.id) {
    return {
      success: false,
      error:
        createData?.error?.message || 'Failed to create Instagram media container',
    }
  }

  // Step 2 — publish the container.
  const publishRes = await fetch(
    `https://graph.instagram.com/v21.0/${userId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: token,
      }),
    },
  )
  const publishData = await publishRes.json()
  if (!publishRes.ok || !publishData.id) {
    return {
      success: false,
      error: publishData?.error?.message || 'Failed to publish to Instagram',
    }
  }

  // Step 3 — mark published + ensure an analytics row exists.
  await sql.query(
    "UPDATE post_packages SET status='published', published=true, published_at=now() WHERE id=$1",
    [package_id],
  )
  if (pkg.hook_id) {
    await sql.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS analytics_content_id_unique
         ON analytics(content_id)`,
    )
    await sql.query(
      `INSERT INTO analytics (content_id, brand_id)
       VALUES ($1, $2)
       ON CONFLICT (content_id) DO NOTHING`,
      [pkg.hook_id, brand_id],
    )
  }
  return { success: true, post_id: publishData.id }
}

// Pulls Instagram insights for a published post, scores it, and promotes
// strong performers into brand_memory.
async function handleAnalyticsPull(sql, body) {
  const { brand_id, post_id, content_id } = body
  if (!brand_id || !post_id || !content_id) {
    const err = new Error('brand_id, post_id and content_id required')
    err.status = 400
    throw err
  }
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    return { success: false, error: 'Instagram not configured' }
  }

  const url = `https://graph.instagram.com/v21.0/${post_id}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${token}`
  const igRes = await fetch(url)
  const igData = await igRes.json()
  if (!igRes.ok) {
    return {
      success: false,
      error: igData?.error?.message || 'Instagram insights failed',
    }
  }

  const metrics = {}
  for (const item of igData?.data || []) {
    const v =
      item?.values?.[0]?.value ?? item?.total_value?.value ?? 0
    metrics[item.name] = Number(v) || 0
  }
  const impressions = metrics.impressions || 0
  const reach = metrics.reach || 0
  const likes = metrics.likes || 0
  const comments = metrics.comments || 0
  const shares = metrics.shares || 0
  const saves = metrics.saved || 0
  const denom = reach || impressions || 0
  const engagement_rate = denom
    ? ((likes + comments + shares + saves) / denom) * 100
    : 0
  const score = Math.min(
    engagement_rate * 40 + saves * 0.5 + shares * 0.3,
    100,
  )

  await sql.query(
    'ALTER TABLE analytics ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0',
  )
  await sql.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS analytics_content_id_unique
       ON analytics(content_id)`,
  )
  await sql.query(
    `INSERT INTO analytics (content_id, brand_id)
     VALUES ($1, $2) ON CONFLICT (content_id) DO NOTHING`,
    [content_id, brand_id],
  )
  await sql.query(
    `UPDATE analytics
        SET views=$1, likes=$2, comments=$3, shares=$4, saves=$5,
            engagement_rate=$6, score=$7
      WHERE content_id=$8`,
    [
      impressions || reach,
      likes,
      comments,
      shares,
      saves,
      engagement_rate,
      score,
      content_id,
    ],
  )

  if (score > 75) {
    await sql.query(
      `INSERT INTO brand_memory (brand_id, memory_type, content)
       VALUES ($1, 'top_performers', $2)`,
      [
        brand_id,
        `High performing post scored ${Math.round(score)}/100`,
      ],
    )
  }

  return { success: true, score }
}

// Next approved+visual package whose schedule slot is due.
async function handleNextScheduled(sql, brand_id) {
  if (!brand_id) {
    const err = new Error('brand_id required')
    err.status = 400
    throw err
  }
  const result = await sql.query(
    `SELECT pp.* FROM post_packages pp
       JOIN schedules s
         ON s.content_id = pp.hook_id OR s.content_id = pp.caption_id
      WHERE pp.brand_id=$1
        AND pp.status='approved'
        AND pp.visual_url IS NOT NULL
        AND s.scheduled_at <= NOW()
        AND s.published=false
      ORDER BY s.scheduled_at ASC
      LIMIT 1`,
    [brand_id],
  )
  const row = (result?.rows ?? result)?.[0]
  if (!row) return { has_content: false }
  return { has_content: true, package: row }
}

// ===== Sales Rep System =====
// Bumps a single rep_kpis counter for today, creating the row if absent.
async function bumpKpi(sql, repId, column, amount = 1) {
  const allowed = new Set([
    'calls_made',
    'emails_sent',
    'leads_added',
    'demos_booked',
    'proposals_sent',
    'deals_closed',
    'revenue_generated',
  ])
  if (!allowed.has(column)) return
  await sql.query(
    `INSERT INTO rep_kpis (rep_id, date, ${column})
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (rep_id, date)
     DO UPDATE SET ${column} = rep_kpis.${column} + $2`,
    [repId, amount],
  )
}

const rowsOf = (r) => r?.rows ?? r ?? []
const firstOf = (r) => rowsOf(r)?.[0]

// Cron worker: drain packages stuck in 'producing' and run the full
// multi-scene production for each. Bounded to 3 per run so a single
// invocation stays within the serverless time budget.
async function handleProcessProductions(sql) {
  const rows = await sql.query(
    `SELECT id, brand_id FROM post_packages
      WHERE status='producing'
        AND updated_at < now() - interval '30 seconds'
      ORDER BY updated_at ASC
      LIMIT 3`,
  )
  const pkgs = rowsOf(rows)
  const results = []
  for (const p of pkgs) {
    try {
      const r = await produceVideo({
        packageId: p.id,
        brandId: p.brand_id,
        sql,
      })
      results.push({ package_id: p.id, ...r })
    } catch (e) {
      await sql.query(
        "UPDATE post_packages SET status='needs_visual', updated_at=now() WHERE id=$1",
        [p.id],
      )
      results.push({ package_id: p.id, success: false, error: e?.message })
    }
  }
  return { success: true, processed: pkgs.length, results }
}

async function handleSales(sql, { method, action, query, body }) {
  // ---- GET actions ----
  if (method === 'GET') {
    if (action === 'rep_profile') {
      const r = await sql.query(
        `SELECT sr.*,
                COUNT(DISTINCT sl.id) AS total_leads,
                COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('approved','commission_paid')) AS deals_closed,
                COALESCE(SUM(d.commission_amount) FILTER (WHERE d.status IN ('approved','commission_paid')), 0) AS total_earnings
           FROM sales_reps sr
           LEFT JOIN sales_leads sl ON sl.rep_id = sr.id
           LEFT JOIN deals d ON d.rep_id = sr.id
          WHERE sr.id = $1
          GROUP BY sr.id`,
        [query.rep_id],
      )
      return { handled: true, payload: { success: true, profile: firstOf(r) || null } }
    }
    if (action === 'rep_leads') {
      // Never run unscoped: without a rep_id this must return nothing
      // rather than risk leaking another rep's leads.
      if (!query.rep_id) {
        return { handled: true, payload: { success: true, leads: [] } }
      }
      const r = await sql.query(
        `SELECT sl.*,
                COUNT(la.id) AS activity_count,
                MAX(la.created_at) AS last_activity
           FROM sales_leads sl
           LEFT JOIN lead_activities la ON la.lead_id = sl.id
          WHERE sl.rep_id = $1 AND ($2::text IS NULL OR sl.status = $2)
          GROUP BY sl.id
          ORDER BY sl.updated_at DESC`,
        [query.rep_id, query.status || null],
      )
      return { handled: true, payload: { success: true, leads: rowsOf(r) } }
    }
    if (action === 'rep_deals') {
      const r = await sql.query(
        `SELECT d.*, sl.company_name, sl.contact_name
           FROM deals d
           JOIN sales_leads sl ON d.lead_id = sl.id
          WHERE d.rep_id = $1
          ORDER BY d.created_at DESC`,
        [query.rep_id],
      )
      return { handled: true, payload: { success: true, deals: rowsOf(r) } }
    }
    if (action === 'leaderboard') {
      const r = await sql.query(
        `SELECT sr.name, sr.id,
                COUNT(DISTINCT sl.id) AS total_leads,
                COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('approved','commission_paid')) AS deals_closed,
                COALESCE(SUM(d.deal_value) FILTER (WHERE d.status IN ('approved','commission_paid')), 0) AS revenue,
                COALESCE(SUM(d.commission_amount) FILTER (WHERE d.status IN ('approved','commission_paid')), 0) AS earnings
           FROM sales_reps sr
           LEFT JOIN sales_leads sl ON sl.rep_id = sr.id
           LEFT JOIN deals d ON d.rep_id = sr.id
          WHERE sr.role = 'sales' AND sr.is_active = true
          GROUP BY sr.id, sr.name
          ORDER BY revenue DESC`,
      )
      return { handled: true, payload: { success: true, leaderboard: rowsOf(r) } }
    }
    if (action === 'services_catalog') {
      const r = await sql.query(
        `SELECT * FROM services_catalog WHERE is_active = true ORDER BY category, name`,
      )
      return { handled: true, payload: { success: true, services: rowsOf(r) } }
    }
    if (action === 'admin_deals') {
      const r = await sql.query(
        `SELECT d.*, sr.name AS rep_name,
                COALESCE(sl.company_name, 'Unknown') AS company_name,
                sl.contact_name
           FROM deals d
           LEFT JOIN sales_reps sr ON d.rep_id = sr.id
           LEFT JOIN sales_leads sl ON d.lead_id = sl.id
          WHERE ($1::text IS NULL OR d.status = $1)
          ORDER BY d.created_at DESC`,
        [query.status || null],
      )
      return { handled: true, payload: { success: true, deals: rowsOf(r) } }
    }
    if (action === 'sales_notifications') {
      const r = await sql.query(
        `SELECT * FROM sales_notifications
          WHERE recipient_id = $1
          ORDER BY created_at DESC LIMIT 20`,
        [query.rep_id],
      )
      return { handled: true, payload: { success: true, notifications: rowsOf(r) } }
    }
    if (action === 'overdue_followups') {
      const r = await sql.query(
        `SELECT company_name, contact_name, next_followup, status
           FROM sales_leads
          WHERE rep_id = $1 AND next_followup <= now()
            AND status NOT IN ('closed_won','closed_lost','not_interested')
          ORDER BY next_followup ASC`,
        [query.rep_id],
      )
      return { handled: true, payload: { success: true, overdue: rowsOf(r) } }
    }
    if (action === 'admin_all_reps') {
      const r = await sql.query(
        `SELECT sr.*,
                COUNT(DISTINCT sl.id) AS total_leads,
                COUNT(DISTINCT d.id) FILTER (WHERE d.status IN ('approved','commission_paid')) AS deals_closed,
                COALESCE(SUM(d.commission_amount) FILTER (WHERE d.status = 'commission_paid'), 0) AS paid_commission,
                COALESCE(SUM(d.commission_amount) FILTER (WHERE d.status = 'approved'), 0) AS pending_commission
           FROM sales_reps sr
           LEFT JOIN sales_leads sl ON sl.rep_id = sr.id
           LEFT JOIN deals d ON d.rep_id = sr.id
          WHERE sr.role = 'sales'
          GROUP BY sr.id
          ORDER BY sr.created_at ASC`,
      )
      return { handled: true, payload: { success: true, reps: rowsOf(r) } }
    }
    if (action === 'rep_kpis') {
      const week = await sql.query(
        `SELECT COALESCE(SUM(calls_made),0)::int AS calls_made,
                COALESCE(SUM(emails_sent),0)::int AS emails_sent,
                COALESCE(SUM(leads_added),0)::int AS leads_added,
                COALESCE(SUM(demos_booked),0)::int AS demos_booked,
                COALESCE(SUM(proposals_sent),0)::int AS proposals_sent,
                COALESCE(SUM(deals_closed),0)::int AS deals_closed,
                COALESCE(SUM(revenue_generated),0) AS revenue_generated
           FROM rep_kpis
          WHERE rep_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'`,
        [query.rep_id],
      )
      const today = await sql.query(
        `SELECT COALESCE(SUM(leads_added),0)::int AS leads_added,
                COALESCE(SUM(calls_made),0)::int AS calls_made
           FROM rep_kpis WHERE rep_id = $1 AND date = CURRENT_DATE`,
        [query.rep_id],
      )
      return {
        handled: true,
        payload: {
          success: true,
          week: firstOf(week) || {},
          today: firstOf(today) || {},
        },
      }
    }
    if (action === 'rep_activities') {
      const r = await sql.query(
        `SELECT la.*, sl.company_name
           FROM lead_activities la
           JOIN sales_leads sl ON la.lead_id = sl.id
          WHERE la.rep_id = $1
          ORDER BY la.created_at DESC LIMIT 10`,
        [query.rep_id],
      )
      return { handled: true, payload: { success: true, activities: rowsOf(r) } }
    }
    if (action === 'lead_activities') {
      const r = await sql.query(
        `SELECT * FROM lead_activities
          WHERE lead_id = $1
          ORDER BY created_at DESC`,
        [query.lead_id],
      )
      return { handled: true, payload: { success: true, activities: rowsOf(r) } }
    }
    if (action === 'rep_tasks') {
      const r = await sql.query(
        `SELECT t.*, sl.company_name AS lead_company
           FROM rep_tasks t
           LEFT JOIN sales_leads sl ON t.lead_id = sl.id
          WHERE t.rep_id = $1 AND ($2::text IS NULL OR t.status = $2)
          ORDER BY (t.due_date IS NULL), t.due_date ASC, t.created_at DESC`,
        [query.rep_id, query.status || null],
      )
      return { handled: true, payload: { success: true, tasks: rowsOf(r) } }
    }
    if (action === 'admin_all_leads') {
      const r = await sql.query(
        `SELECT sl.*, sr.name AS rep_name
           FROM sales_leads sl
           LEFT JOIN sales_reps sr ON sl.rep_id = sr.id
          ORDER BY sl.updated_at DESC
          LIMIT 300`,
      )
      return { handled: true, payload: { success: true, leads: rowsOf(r) } }
    }
    if (action === 'admin_leads_pool') {
      const r = await sql.query(
        `SELECT sl.*, sr.name AS rep_name, sr.id AS rep_id
           FROM sales_leads sl
           LEFT JOIN sales_reps sr ON sl.rep_id = sr.id
          ORDER BY sl.created_at DESC`,
      )
      return { handled: true, payload: { success: true, leads: rowsOf(r) } }
    }
    if (action === 'team_overview') {
      const r = await sql.query(
        `SELECT sr.id, sr.name, sr.email, sr.commission_rate,
                COUNT(sl.id) AS total_leads,
                COUNT(sl.id) FILTER (WHERE sl.status='closed_won') AS closed,
                COUNT(sl.id) FILTER (WHERE sl.status='new') AS new_leads,
                COUNT(sl.id) FILTER (WHERE sl.status='interested') AS interested,
                COUNT(sl.id) FILTER (WHERE sl.status IN ('contacted','followed_up')) AS in_progress
           FROM sales_reps sr
           LEFT JOIN sales_leads sl ON sl.rep_id = sr.id
          WHERE sr.role = 'sales' AND sr.is_active = true
          GROUP BY sr.id, sr.name, sr.email, sr.commission_rate
          ORDER BY closed DESC`,
      )
      return { handled: true, payload: { success: true, team: rowsOf(r) } }
    }
    if (action === 'rep_assigned_leads') {
      const r = await sql.query(
        `SELECT sl.*, COUNT(la.id) AS activity_count
           FROM sales_leads sl
           LEFT JOIN lead_activities la ON la.lead_id = sl.id
          WHERE sl.rep_id = $1
          GROUP BY sl.id
          ORDER BY sl.updated_at DESC`,
        [query.rep_id],
      )
      return { handled: true, payload: { success: true, leads: rowsOf(r) } }
    }
    if (action === 'get_sales_reps') {
      const r = await sql.query(
        `SELECT id, name, email, role
           FROM sales_reps
          WHERE is_active = true AND role = 'sales'
          ORDER BY name`,
      )
      return { handled: true, payload: { success: true, reps: rowsOf(r) } }
    }
    if (action === 'get_all_reps') {
      // Per-rep subqueries — avoids every cross-table column-name conflict.
      try {
        const reps = await sql.query(`SELECT id, name, email, role, is_active, commission_rate, created_at FROM sales_reps ORDER BY created_at DESC`)
        const repRows = reps.rows || reps

        const result = await Promise.all(repRows.map(async (rep) => {
          const leads = await sql.query(`SELECT COUNT(*) as count FROM sales_leads WHERE rep_id = $1`, [rep.id])
          const dealsResult = await sql.query(`SELECT COUNT(*) as count, COALESCE(SUM(commission_amount), 0) as total FROM deals WHERE rep_id = $1 AND status = ANY($2)`, [rep.id, ['approved', 'commission_paid']])
          const leadsRow = (leads.rows || leads)[0]
          const dealsRow = (dealsResult.rows || dealsResult)[0]
          return {
            ...rep,
            total_leads: parseInt(leadsRow?.count || 0),
            deals_closed: parseInt(dealsRow?.count || 0),
            total_commission: parseFloat(dealsRow?.total || 0)
          }
        }))

        return { handled: true, payload: { success: true, reps: result } }
      } catch(e) {
        return { handled: true, payload: { success: false, error: e.message } }
      }
    }
    if (action === 'get_clients') {
      const r = await sql.query(
        `SELECT * FROM clients ORDER BY created_at DESC`,
      )
      return { handled: true, payload: { success: true, clients: rowsOf(r) } }
    }
    if (action === 'get_documents') {
      const r = await sql.query(
        `SELECT * FROM documents WHERE client_id = $1 ORDER BY created_at DESC`,
        [query.client_id],
      )
      return { handled: true, payload: { success: true, documents: rowsOf(r) } }
    }
    if (action === 'get_automations') {
      const r = await sql.query(
        `SELECT * FROM automation_workflows
          WHERE ($1::uuid IS NULL OR client_id = $1)
          ORDER BY created_at DESC`,
        [query.client_id || null],
      )
      return { handled: true, payload: { success: true, automations: rowsOf(r) } }
    }
    return { handled: false }
  }

  // ---- POST actions ----
  if (method === 'POST') {
    if (action === 'rep_login') {
      const email = String(body.email || '').trim()
      const password = body.password

      // Hard CEO bypass — no database required, so the admin can never be
      // locked out even on a fresh / unreachable database.
      if (
        email.toLowerCase() === 'admin@lithoslabs.com' &&
        password === 'admin123'
      ) {
        return {
          handled: true,
          payload: {
            success: true,
            rep: {
              id: 'admin',
              name: 'Eugene',
              email: 'admin@lithoslabs.com',
              role: 'admin',
              commission_rate: 0,
            },
          },
        }
      }

      const r = await sql.query(
        'SELECT * FROM sales_reps WHERE LOWER(email) = LOWER($1) AND is_active = true',
        [email],
      )
      const rep = firstOf(r)
      if (!rep || rep.password_hash !== password) {
        return {
          handled: true,
          payload: { success: false, error: 'Invalid credentials' },
        }
      }
      // Roles: admin | manager | sales. Legacy 'rep' rows normalize to 'sales'.
      const role =
        rep.role === 'admin'
          ? 'admin'
          : rep.role === 'manager'
            ? 'manager'
            : 'sales'
      return {
        handled: true,
        payload: {
          success: true,
          rep: {
            id: rep.id,
            name: rep.name,
            email: rep.email,
            role,
            commission_rate: rep.commission_rate,
          },
        },
      }
    }
    if (action === 'rep_register') {
      const name = String(body.name || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const { password, invite_code } = body
      if (invite_code !== process.env.SALES_REP_INVITE_CODE) {
        return {
          handled: true,
          payload: { success: false, error: 'Invalid invite code' },
        }
      }
      if (!name || !email || !password) {
        return {
          handled: true,
          payload: { success: false, error: 'Name, email and password required' },
        }
      }
      const existing = await sql.query(
        'SELECT id FROM sales_reps WHERE lower(email)=$1',
        [email],
      )
      if (firstOf(existing)) {
        return {
          handled: true,
          payload: { success: false, error: 'Email already registered' },
        }
      }
      try {
        const r = await sql.query(
          `INSERT INTO sales_reps (name, email, password_hash, role, is_active)
           VALUES ($1, $2, $3, 'sales', true)
           RETURNING id, name, email, role`,
          [name, email, password],
        )
        const rep = firstOf(r)
        return {
          handled: true,
          payload: {
            success: true,
            rep: {
              id: rep.id,
              name: rep.name,
              email: rep.email,
              role: 'sales',
            },
          },
        }
      } catch (e) {
        return {
          handled: true,
          payload: { success: false, error: 'Email already registered' },
        }
      }
    }
    if (action === 'add_lead') {
      const {
        rep_id,
        company_name,
        contact_name,
        contact_email,
        contact_phone,
        contact_whatsapp,
        industry,
        location,
        source,
        service_interest,
        estimated_value,
        notes,
      } = body
      const r = await sql.query(
        `INSERT INTO sales_leads
           (rep_id, company_name, contact_name, contact_email, contact_phone,
            contact_whatsapp, industry, location, source, service_interest,
            estimated_value, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::text[],$11,$12)
         RETURNING id`,
        [
          rep_id,
          company_name,
          contact_name || null,
          contact_email || null,
          contact_phone || null,
          contact_whatsapp || null,
          industry || null,
          location || null,
          source || 'cold_outreach',
          Array.isArray(service_interest) ? service_interest : null,
          estimated_value || null,
          notes || null,
        ],
      )
      const leadId = firstOf(r)?.id
      await sql.query(
        `INSERT INTO lead_activities (lead_id, rep_id, activity_type, description)
         VALUES ($1, $2, 'note', 'Lead added')`,
        [leadId, rep_id],
      )
      await bumpKpi(sql, rep_id, 'leads_added', 1)
      // Mirror into the unified app's main `leads` table so the rep sees it
      // on the Leads / Dashboard pages (filtered by assigned_to). Best-effort.
      try {
        await sql.query(
          `INSERT INTO leads
             (company_name, owner_name, location, industry, source,
              notes, status, assigned_to, rep_id)
           VALUES ($1,$2,$3,$4,$5,$6,'new',$7,$7)`,
          [
            company_name,
            contact_name || null,
            location || null,
            industry || null,
            source || 'discover',
            notes || null,
            rep_id || null,
          ],
        )
      } catch (e) {
        /* main leads table mirror is best-effort — non-fatal */
      }

      const repResult = await sql.query('SELECT name FROM sales_reps WHERE id=$1', [rep_id])
      const repName = (repResult.rows || repResult)[0]?.name || 'Sales Rep'

      if (process.env.MAKE_WEBHOOK_NEW_LEAD) {
        try {
          fetch(process.env.MAKE_WEBHOOK_NEW_LEAD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company_name: company_name || 'Unknown',
              contact_name: contact_name || '',
              rep_name: repName,
              industry: industry || '',
              estimated_value: estimated_value || 0,
              source: source || 'manual',
              timestamp: new Date().toISOString()
            })
          }).catch(e => console.log('Webhook error:', e.message))
        } catch(e) {}
      }

      return { handled: true, payload: { success: true, lead_id: leadId } }
    }
    if (action === 'update_lead_status') {
      const { lead_id, rep_id, status, notes, next_followup } = body
      await sql.query(
        `UPDATE sales_leads
            SET status=$1, next_followup=$2, notes=COALESCE($5, notes), updated_at=now()
          WHERE id=$3 AND rep_id=$4`,
        [status, next_followup || null, lead_id, rep_id, notes || null],
      )
      await sql.query(
        `INSERT INTO lead_activities (lead_id, rep_id, activity_type, description)
         VALUES ($1, $2, 'status_change', $3)`,
        [lead_id, rep_id, 'Status changed to ' + status],
      )
      if (status === 'demo_booked') await bumpKpi(sql, rep_id, 'demos_booked', 1)
      if (status === 'proposal_sent')
        await bumpKpi(sql, rep_id, 'proposals_sent', 1)
      return { handled: true, payload: { success: true } }
    }
    if (action === 'add_activity') {
      const { lead_id, rep_id, activity_type, description, outcome } = body
      await sql.query(
        `INSERT INTO lead_activities
           (lead_id, rep_id, activity_type, description, outcome)
         VALUES ($1,$2,$3,$4,$5)`,
        [lead_id, rep_id, activity_type, description || null, outcome || null],
      )
      if (activity_type === 'call') await bumpKpi(sql, rep_id, 'calls_made', 1)
      if (activity_type === 'email') await bumpKpi(sql, rep_id, 'emails_sent', 1)
      return { handled: true, payload: { success: true } }
    }
    if (action === 'submit_deal') {
      // Slimmed to match the live Neon DB `deals` schema, which lacks
      // service_name / deal_value / commission_rate / payment_proof_url.
      // The live column for deal value is `proposed_price` (integer); the
      // client still sends `deal_value` so we map it. KPI bumps, lead-table
      // bridging, and admin notifications were dropped to keep this safe —
      // re-add them once the columns are confirmed to exist.
      const { rep_id, lead_id, company_name, service_name, deal_value, commission_rate } = body

      // Resolve rep_id — handle the hardcoded CEO bypass which returns
      // id:'admin' (see rep_login around line 1440) instead of a real UUID.
      let resolved_rep_id = rep_id
      if (!rep_id || rep_id === 'admin' || String(rep_id).length < 10) {
        const adminRep = await sql.query("SELECT id FROM sales_reps WHERE role='admin' LIMIT 1")
        resolved_rep_id = (adminRep.rows || adminRep)[0]?.id || null
      }

      const commission_amount = Math.round((Number(deal_value) || 0) * ((Number(commission_rate) || 10) / 100))

      // Only insert columns that exist in the live DB.
      const insertResult = await sql.query(
        `INSERT INTO deals (rep_id, lead_id, proposed_price, commission_amount, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending_approval', NOW())
         RETURNING id`,
        [resolved_rep_id, lead_id, Math.round(Number(deal_value) || 0), commission_amount],
      )

      const dealId = (insertResult.rows || insertResult)[0]?.id

      // Fire the deal-approval webhook (non-blocking — submit_deal returns
      // immediately; webhook errors are logged but never surface to the user).
      if (process.env.MAKE_WEBHOOK_DEAL_APPROVAL) {
        fetch(process.env.MAKE_WEBHOOK_DEAL_APPROVAL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rep_name: 'Sales Rep',
            company_name: company_name || 'Unknown',
            service_name: service_name || '',
            deal_value: deal_value || 0,
            commission_amount,
            timestamp: new Date().toISOString(),
          }),
        }).catch((e) => console.log('Deal webhook error:', e.message))
      }

      return { handled: true, payload: { success: true, deal_id: dealId } }
    }
    if (action === 'approve_deal') {
      // Live DB deals table is the legacy prospector schema — it has no
      // service_name, approved_by, approved_at, or admin_notes columns. We
      // only update `status` here and skip persisting admin_notes / admin_id;
      // the rep notification message still includes admin_notes from the
      // request body even though it isn't stored.
      const { deal_id, approved, admin_notes } = body
      const deal = firstOf(
        await sql.query('SELECT rep_id FROM deals WHERE id=$1', [deal_id]),
      )
      if (approved) {
        await sql.query(`UPDATE deals SET status='approved' WHERE id=$1`, [deal_id])
        // Try to backfill commission_amount in case submit_deal didn't write
        // it (older rows). The try/catch covers schema variants where this
        // expression isn't valid.
        try {
          await sql.query(
            `UPDATE deals
                SET commission_amount = deal_value * commission_rate / 100
              WHERE id=$1 AND commission_amount IS NULL`,
            [deal_id],
          )
        } catch {
          /* deal_value / commission_rate columns absent in live DB — non-fatal */
        }
      } else {
        await sql.query(`UPDATE deals SET status='rejected' WHERE id=$1`, [deal_id])
      }
      // Always notify the rep of the approve/reject decision.
      if (deal?.rep_id) {
        await sql.query(
          `INSERT INTO sales_notifications (recipient_id, type, title, message, link)
           VALUES ($1,'deal_status',$2,$3,'/sales')`,
          [
            deal.rep_id,
            approved ? 'Deal approved' : 'Deal rejected',
            approved
              ? 'Your deal was approved'
              : `Your deal was rejected${admin_notes ? ': ' + admin_notes : ''}`,
          ],
        )
      }
      return { handled: true, payload: { success: true } }
    }
    if (action === 'mark_commission_paid') {
      const { deal_id } = body
      await sql.query(
        `UPDATE deals SET status='commission_paid', commission_paid_at=now() WHERE id=$1`,
        [deal_id],
      )
      return { handled: true, payload: { success: true } }
    }
    if (action === 'delete_deal') {
      const { deal_id } = body
      if (!deal_id) {
        return { handled: true, payload: { success: false, error: 'deal_id required' } }
      }
      await sql.query('DELETE FROM deals WHERE id=$1', [deal_id])
      return { handled: true, payload: { success: true } }
    }
    if (action === 'mark_notifications_read') {
      const { rep_id } = body
      await sql.query(
        `UPDATE sales_notifications SET read=true WHERE recipient_id=$1 AND read=false`,
        [rep_id],
      )
      return { handled: true, payload: { success: true } }
    }
    if (action === 'objection_help') {
      // Server-side Anthropic proxy so the API key never reaches the browser.
      const { objection } = body
      if (!objection) {
        return { handled: true, payload: { success: false, error: 'objection required' } }
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          handled: true,
          payload: { success: false, error: 'AI not configured' },
        }
      }
      const aRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          system:
            'You are an expert sales assistant for Lithos Labs, a premium CRM and AI marketing agency in Aruba. Help sales reps handle objections professionally and persuasively. Keep response under 3 sentences. Be confident and value-focused.',
          messages: [
            {
              role: 'user',
              content:
                "The prospect said: '" +
                objection +
                "'. Give me a professional response.",
            },
          ],
        }),
      })
      const aData = await aRes.json()
      const text = aData?.content?.[0]?.text || ''
      return {
        handled: true,
        payload: { success: !!text, response: text },
      }
    }
    if (action === 'add_task') {
      const { rep_id, lead_id, title, description, priority, due_date } = body
      if (!rep_id || !title) {
        return {
          handled: true,
          payload: { success: false, error: 'rep_id and title required' },
        }
      }
      const r = await sql.query(
        `INSERT INTO rep_tasks
           (rep_id, lead_id, title, description, priority, due_date)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [
          rep_id,
          lead_id || null,
          title,
          description || null,
          priority || 'medium',
          due_date || null,
        ],
      )
      return {
        handled: true,
        payload: { success: true, task_id: firstOf(r)?.id },
      }
    }
    if (action === 'update_task') {
      const { task_id, status, completed_at } = body
      await sql.query(
        `UPDATE rep_tasks
            SET status = COALESCE($2, status),
                completed_at = $3
          WHERE id = $1`,
        [task_id, status || null, completed_at || null],
      )
      return { handled: true, payload: { success: true } }
    }
    if (action === 'delete_task') {
      const { task_id } = body
      await sql.query('DELETE FROM rep_tasks WHERE id=$1', [task_id])
      return { handled: true, payload: { success: true } }
    }
    if (action === 'reassign_lead') {
      const { lead_id, rep_id } = body
      await sql.query(
        `UPDATE sales_leads SET rep_id=$1, updated_at=now() WHERE id=$2`,
        [rep_id, lead_id],
      )
      return { handled: true, payload: { success: true } }
    }
    if (action === 'assign_lead') {
      const { lead_id, rep_id, admin_id } = body
      if (!lead_id || !rep_id) {
        return {
          handled: true,
          payload: { success: false, error: 'lead_id and rep_id required' },
        }
      }
      // The unified app's Leads page works off the main `leads` table, while
      // the legacy pipeline uses `sales_leads`. Assign in both so the rep
      // filter (assigned_to / rep_id) resolves wherever the row lives.
      try {
        await sql.query(
          `UPDATE leads SET assigned_to=$1, rep_id=$1 WHERE id=$2`,
          [rep_id, lead_id],
        )
      } catch (e) {
        /* leads table / row may not exist — non-fatal */
      }
      try {
        await sql.query(
          `UPDATE sales_leads SET rep_id=$1, updated_at=now() WHERE id=$2`,
          [rep_id, lead_id],
        )
        await sql.query(
          `INSERT INTO lead_activities (lead_id, rep_id, activity_type, description)
           SELECT $1, $2, 'note', $3
            WHERE EXISTS (SELECT 1 FROM sales_leads WHERE id = $1)`,
          [
            lead_id,
            rep_id,
            admin_id
              ? `Lead assigned by admin (${admin_id})`
              : 'Lead assigned by admin',
          ],
        )
      } catch (e) {
        /* not a sales_leads row — non-fatal */
      }
      try {
        await sql.query(
          `INSERT INTO sales_notifications (recipient_id, type, title, message)
           VALUES ($1, 'lead_assigned', 'New lead assigned', 'A new lead has been assigned to you')`,
          [rep_id],
        )
      } catch (e) {
        /* non-fatal */
      }
      const rn = await sql.query(
        'SELECT name FROM sales_reps WHERE id=$1',
        [rep_id],
      )
      return {
        handled: true,
        payload: { success: true, rep_name: firstOf(rn)?.name || null },
      }
    }
    if (action === 'bulk_assign_leads') {
      const { lead_ids, rep_id } = body
      const ids = Array.isArray(lead_ids) ? lead_ids : []
      if (!rep_id || ids.length === 0) {
        return {
          handled: true,
          payload: { success: false, error: 'rep_id and lead_ids required' },
        }
      }
      for (const id of ids) {
        await sql.query(
          `UPDATE sales_leads SET rep_id=$1, updated_at=now() WHERE id=$2`,
          [rep_id, id],
        )
      }
      await sql.query(
        `INSERT INTO sales_notifications (recipient_id, type, title, message)
         VALUES ($1, 'lead_assigned', 'New leads assigned', $2)`,
        [rep_id, `${ids.length} new leads have been assigned to you`],
      )
      return {
        handled: true,
        payload: { success: true, assigned: ids.length },
      }
    }
    if (action === 'notify_admin') {
      const { title, message, link } = body
      const admins = rowsOf(
        await sql.query("SELECT id FROM sales_reps WHERE role='admin'"),
      )
      for (const a of admins) {
        await sql.query(
          `INSERT INTO sales_notifications (recipient_id, type, title, message, link)
           VALUES ($1,'request',$2,$3,$4)`,
          [a.id, title || 'Rep request', message || null, link || '/sales'],
        )
      }
      return { handled: true, payload: { success: true } }
    }
    if (action === 'discover_leads') {
      const { query: q, industry, location, mode, business } = body
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          handled: true,
          payload: { success: false, error: 'AI not configured' },
        }
      }
      const isRecommend = mode === 'recommendation'
      const system = isRecommend
        ? 'You are a sales advisor for Lithos Labs, a CRM and AI marketing agency in Aruba. Services: CRM Setup, AI Marketing System, Website Development, Lead Generation System, Full Business Operating System, Brand Identity, Monthly Retainers. Given a prospect business description, recommend the single best-fit service. Return ONLY valid JSON, no prose: {"recommended_service": string, "why": string, "pitch": string}'
        : 'You are a sales research assistant for Lithos Labs, a CRM and AI marketing agency in Aruba. Generate realistic potential client profiles for the query provided. Return ONLY valid JSON array, no prose: [{"company_name": string, "industry": string, "location": string, "estimated_size": string, "potential_need": string, "contact_title": string, "estimated_value": number, "why_good_fit": string, "outreach_angle": string}]'
      const userContent = isRecommend
        ? `Prospect business: ${business || q || ''}`
        : `Query: ${q || ''}. Industry filter: ${
            industry || 'any'
          }. Location: ${location || 'Aruba'}. Generate 5-8 profiles.`
      const aRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system,
          messages: [{ role: 'user', content: userContent }],
        }),
      })
      const aData = await aRes.json()
      const raw = aData?.content?.[0]?.text || ''
      let parsed = null
      try {
        const start = raw.search(/[[{]/)
        const end = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'))
        parsed =
          start !== -1 && end !== -1
            ? JSON.parse(raw.slice(start, end + 1))
            : null
      } catch {
        parsed = null
      }
      if (!parsed) {
        return {
          handled: true,
          payload: { success: false, error: 'AI returned no usable result' },
        }
      }
      if (isRecommend) {
        return {
          handled: true,
          payload: { success: true, recommendation: parsed },
        }
      }
      return {
        handled: true,
        payload: {
          success: true,
          results: Array.isArray(parsed) ? parsed : [],
        },
      }
    }
    // ---- Clients & documents ----
    if (action === 'add_client') {
      const {
        company_name,
        contact_name,
        contact_email,
        contact_phone,
        contact_whatsapp,
        address,
        industry,
        service_package,
        monthly_retainer,
        setup_fee,
        start_date,
        notes,
      } = body
      if (!company_name) {
        return {
          handled: true,
          payload: { success: false, error: 'company_name required' },
        }
      }
      const r = await sql.query(
        `INSERT INTO clients
           (company_name, contact_name, contact_email, contact_phone,
            contact_whatsapp, address, industry, service_package,
            monthly_retainer, setup_fee, start_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          company_name,
          contact_name || '',
          contact_email || '',
          contact_phone || null,
          contact_whatsapp || null,
          address || null,
          industry || null,
          service_package || null,
          Number(monthly_retainer) || 0,
          Number(setup_fee) || 0,
          start_date || null,
          notes || null,
        ],
      )
      return { handled: true, payload: { success: true, client: firstOf(r) } }
    }
    if (action === 'save_document') {
      const { client_id, type, title, content } = body
      const r = await sql.query(
        `INSERT INTO documents (client_id, type, title, content)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [client_id, type, title, content || ''],
      )
      return { handled: true, payload: { success: true, document: firstOf(r) } }
    }
    if (action === 'delete_document') {
      await sql.query('DELETE FROM documents WHERE id=$1', [body.document_id])
      return { handled: true, payload: { success: true } }
    }
    // ---- Automations ----
    if (action === 'save_automation') {
      const { client_id, name, type, trigger_type, steps } = body
      const r = await sql.query(
        `INSERT INTO automation_workflows
           (client_id, name, type, status, trigger_type, steps)
         VALUES ($1,$2,$3,'inactive',$4,$5)
         RETURNING *`,
        [
          client_id || null,
          name,
          type,
          trigger_type || null,
          steps ? JSON.stringify(steps) : null,
        ],
      )
      return {
        handled: true,
        payload: { success: true, automation: firstOf(r) },
      }
    }
    if (action === 'toggle_automation') {
      const { automation_id, status } = body
      await sql.query(
        `UPDATE automation_workflows SET status=$1 WHERE id=$2`,
        [status, automation_id],
      )
      return { handled: true, payload: { success: true } }
    }
    if (action === 'delete_automation') {
      await sql.query('DELETE FROM automation_workflows WHERE id=$1', [
        body.automation_id,
      ])
      return { handled: true, payload: { success: true } }
    }
    if (action === 'voice_agent_request') {
      const {
        client_id,
        business_name,
        phone_number,
        business_hours,
        services,
        booking_link,
      } = body
      await sql.query(
        `INSERT INTO voice_agent_requests
           (client_id, business_name, phone_number, business_hours, services, booking_link)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          client_id || null,
          business_name || null,
          phone_number || null,
          business_hours || null,
          services || null,
          booking_link || null,
        ],
      )
      try {
        const admins = rowsOf(
          await sql.query("SELECT id FROM sales_reps WHERE role='admin'"),
        )
        for (const a of admins) {
          await sql.query(
            `INSERT INTO sales_notifications (recipient_id, type, title, message, link)
             VALUES ($1,'request','Voice agent setup requested',$2,'/automations')`,
            [a.id, `Voice agent request for ${business_name || 'a client'}`],
          )
        }
      } catch (e) {
        /* non-fatal */
      }
      return { handled: true, payload: { success: true } }
    }
    // ---- Server-side Claude proxy for document/text generation ----
    if (action === 'ai_generate') {
      const { system, prompt, max_tokens } = body
      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          handled: true,
          payload: { success: false, error: 'AI not configured' },
        }
      }
      const aRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: Number(max_tokens) || 2000,
          system:
            system ||
            'You are a professional document writer for Lithos Labs, a CRM and AI marketing agency in Aruba. Generate complete, professional documents. Return ONLY the document text.',
          messages: [{ role: 'user', content: prompt || '' }],
        }),
      })
      const aData = await aRes.json()
      const text = aData?.content?.[0]?.text || ''
      if (!text) {
        return {
          handled: true,
          payload: {
            success: false,
            error: aData?.error?.message || 'AI returned no content',
          },
        }
      }
      return { handled: true, payload: { success: true, text } }
    }
    // ---- Team management (admin only) ----
    if (action === 'update_rep_role') {
      const { rep_id, role } = body
      const validRoles = ['sales', 'manager', 'admin']
      if (!validRoles.includes(role))
        return { handled: true, payload: { success: false, error: 'Invalid role' } }
      await sql.query('UPDATE sales_reps SET role=$1 WHERE id=$2', [role, rep_id])
      return { handled: true, payload: { success: true } }
    }
    if (action === 'toggle_rep_status') {
      const { rep_id, is_active } = body
      if (!rep_id) {
        return {
          handled: true,
          payload: { success: false, error: 'rep_id required' },
        }
      }
      await sql.query('UPDATE sales_reps SET is_active=$1 WHERE id=$2', [
        !!is_active,
        rep_id,
      ])
      return { handled: true, payload: { success: true } }
    }
    if (action === 'reset_rep_password') {
      const { rep_id } = body
      if (!rep_id) {
        return {
          handled: true,
          payload: { success: false, error: 'rep_id required' },
        }
      }
      await sql.query(
        "UPDATE sales_reps SET password_hash='reset123' WHERE id=$1",
        [rep_id],
      )
      return { handled: true, payload: { success: true } }
    }
    if (action === 'delete_rep') {
      const { rep_id } = body
      if (!rep_id)
        return { handled: true, payload: { success: false, error: 'rep_id required' } }

      await sql.query('DELETE FROM sales_notifications WHERE recipient_id=$1', [rep_id])
      await sql.query('DELETE FROM rep_kpis WHERE rep_id=$1', [rep_id])
      await sql.query('DELETE FROM lead_activities WHERE rep_id=$1', [rep_id])
      await sql.query('DELETE FROM rep_tasks WHERE rep_id=$1', [rep_id])
      await sql.query('DELETE FROM deals WHERE rep_id=$1', [rep_id])
      await sql.query('DELETE FROM sales_leads WHERE rep_id=$1', [rep_id])
      await sql.query('DELETE FROM sales_reps WHERE id=$1', [rep_id])
      return { handled: true, payload: { success: true } }
    }
    if (action === 'seed_offers') {
      // Server-side refresh of both `offers` (6 entries: 3 packages + 3 add-ons)
      // and `services_catalog` (6 entries) to match the official Lithos Labs
      // pricing. Idempotent — upserts by name and retires legacy rows.
      const offers = [
        {
          name: 'Landing Page',
          description:
            'A single high-converting page designed to turn visitors into leads.',
          price_min: 500,
          price_max: 500,
          delivery_days: 7,
          included: [
            'Single-page design',
            'Mobile responsive',
            'Contact form',
            'Basic SEO',
            'Social media integration',
            'WhatsApp button',
            'Google Analytics',
          ],
        },
        {
          name: 'Business Website',
          description:
            'A full multi-page website that builds credibility and generates leads.',
          price_min: 700,
          price_max: 700,
          delivery_days: 14,
          included: [
            'Up to 5 pages',
            'Mobile responsive',
            'Contact form',
            'Basic SEO',
            'Social media integration',
            'WhatsApp button',
            'Google Analytics',
          ],
        },
        {
          name: 'Premium Custom Website',
          description:
            'A fully custom-built website with advanced features built for growth.',
          price_min: 1200,
          price_max: 1200,
          delivery_days: 21,
          included: [
            'Up to 10 pages',
            'Custom animations',
            'Full SEO setup',
            'Blog section',
            'Speed optimization',
            'Google Analytics + Search Console',
          ],
        },
        {
          name: 'Booking System',
          description:
            'Let customers book online with automated confirmations and reminders.',
          price_min: 300,
          price_max: 300,
          delivery_days: 5,
          included: [
            'Online booking calendar',
            'Automated email confirmations',
            'WhatsApp reminders',
            'Admin booking dashboard',
          ],
        },
        {
          name: 'Automation System',
          description:
            'Business workflow automation — follow-ups, reminders, and more.',
          price_min: 300,
          price_max: 300,
          delivery_days: 5,
          included: [
            'Missed call text-back',
            'Lead follow-up sequences',
            'Appointment reminders',
            'Review request automation',
          ],
        },
        {
          name: 'CRM Setup & Integrations',
          description:
            'Complete CRM to manage leads, clients, deals, and team.',
          price_min: 1000,
          price_max: 1000,
          delivery_days: 14,
          included: [
            'Custom CRM setup',
            'Pipeline configuration',
            'Automation triggers',
            'Team access',
            'Lead tracking',
          ],
        },
      ]

      for (const p of offers) {
        const existing = firstOf(
          await sql.query('SELECT id FROM offers WHERE name = $1', [p.name]),
        )
        if (existing?.id) {
          await sql.query(
            `UPDATE offers
                SET description=$1, price_min=$2, price_max=$3,
                    delivery_days=$4, is_active=true, included=$5
              WHERE id=$6`,
            [p.description, p.price_min, p.price_max, p.delivery_days, p.included, existing.id],
          )
        } else {
          await sql.query(
            `INSERT INTO offers (name, description, price_min, price_max, delivery_days, is_active, included)
             VALUES ($1,$2,$3,$4,$5,true,$6)`,
            [p.name, p.description, p.price_min, p.price_max, p.delivery_days, p.included],
          )
        }
      }
      await sql.query(
        `UPDATE offers SET is_active = false
          WHERE name NOT IN (
            'Landing Page','Business Website','Premium Custom Website',
            'Booking System','Automation System','CRM Setup & Integrations'
          )`,
      )

      const services = [
        ['Landing Page',             'A single high-converting page designed to turn visitors into leads.', 'Web Development', 500, 500, 10],
        ['Business Website',         'A full multi-page website that builds credibility and generates leads.', 'Web Development', 700, 700, 10],
        ['Premium Custom Website',   'A fully custom-built website with advanced features built for growth.', 'Web Development', 1200, 1200, 10],
        ['Booking System',           'Let customers book online with automated confirmations and reminders.', 'Add-On',          300, 300, 10],
        ['Automation System',        'Business workflow automation — follow-ups, reminders, and more.',       'Automation',      300, 300, 15],
        ['CRM Setup & Integrations', 'Complete CRM to manage leads, clients, deals, and team.',               'CRM',             1000, 1000, 12],
      ]
      for (const [name, description, category, pmin, pmax, rate] of services) {
        await sql.query(
          `INSERT INTO services_catalog (name, description, category, price_min, price_max, commission_rate, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,true)
           ON CONFLICT (name) DO UPDATE SET
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             price_min = EXCLUDED.price_min,
             price_max = EXCLUDED.price_max,
             commission_rate = EXCLUDED.commission_rate,
             is_active = true`,
          [name, description, category, pmin, pmax, rate],
        )
      }
      await sql.query(
        `UPDATE services_catalog SET is_active = false
          WHERE name NOT IN (
            'Landing Page','Business Website','Premium Custom Website',
            'Booking System','Automation System','CRM Setup & Integrations'
          )`,
      )

      const offerCount = firstOf(await sql.query('SELECT COUNT(*)::int AS c FROM offers WHERE is_active = true'))
      const svcCount = firstOf(await sql.query('SELECT COUNT(*)::int AS c FROM services_catalog WHERE is_active = true'))
      return {
        handled: true,
        payload: {
          success: true,
          active_offers: offerCount?.c || 0,
          active_services: svcCount?.c || 0,
        },
      }
    }
    return { handled: false }
  }

  return { handled: false }
}

// process_productions runs the long Higgsfield + Creatomate flow — give the
// function the maximum serverless runtime.
export const config = { maxDuration: 300 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Handled before the GET/POST split so it works with either method.
  const action = req.body?.action || req.query?.action

  // Retell webhook handler — lives BEFORE the GET/POST split so it works for
  // POST /api/workflow?action=retell_webhook (action via query string, since
  // Retell's webhook payload is flat `{event, call, ...}` with no `action`
  // field in the body).
  if (action === 'retell_webhook') {
    try {
      const sql = await getDb()
      const { event, call } = req.body || {}
      if (event === 'call_ended' && call) {
        const agentRows = await sql.query(
          'SELECT * FROM ai_agents WHERE retell_agent_id = $1',
          [call.agent_id],
        )
        const agent = (agentRows.rows || agentRows)[0]
        if (agent) {
          const durationSec = call.duration_ms ? Math.round(call.duration_ms / 1000) : 0
          const durationMin = call.duration_ms ? call.duration_ms / 60000 : 0
          await sql.query(
            `INSERT INTO ai_call_logs (
               agent_id, retell_call_id, caller_number, duration_seconds,
               status, transcript, summary, started_at, ended_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,
               COALESCE(to_timestamp($8 / 1000.0), NOW()),
               COALESCE(to_timestamp($9 / 1000.0), NOW()))`,
            [
              agent.id,
              call.call_id || null,
              call.from_number || null,
              durationSec,
              call.call_status || null,
              call.transcript || null,
              call.call_analysis?.call_summary || null,
              call.start_timestamp || null,
              call.end_timestamp || null,
            ],
          )
          await sql.query(
            `UPDATE ai_agents
                SET total_calls   = total_calls + 1,
                    total_minutes = total_minutes + $1,
                    updated_at    = NOW()
              WHERE id = $2`,
            [durationMin, agent.id],
          )
        }
      }
      return res.json({ success: true })
    } catch (e) {
      console.error('retell_webhook error:', e.message)
      return res.json({ success: false, error: e.message })
    }
  }

  // PDF generation by overlaying text on Figma templates in `public/templates/`.
  // Lives inside workflow.js to stay under the Vercel Hobby 12-function ceiling.
  // pdf-lib is lazy-imported so cold start stays fast for every other action.
  //
  // Note: `public/` files are NOT bundled into Vercel serverless functions by
  // default — they're static CDN assets. So we fetch the template over HTTP
  // from the same deployment instead of reading from disk. Works in both
  // `vercel dev` (serves public/ over HTTP) and production (CDN).
  if (action === 'generate_pdf') {
    try {
      const { type, data } = req.body || {}
      if (!type || !['invoice', 'proposal', 'contract'].includes(type)) {
        return res.status(400).json({ error: 'type must be invoice|proposal|contract' })
      }

      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

      const host = req.headers.host
      const proto =
        req.headers['x-forwarded-proto'] ||
        (host && host.includes('localhost') ? 'http' : 'https')
      const templateUrl = `${proto}://${host}/templates/${type}-template.pdf`

      const templateRes = await fetch(templateUrl)
      if (!templateRes.ok) {
        return res.status(404).json({
          error: `Template not found: ${templateUrl} (HTTP ${templateRes.status})`,
        })
      }
      const templateBytes = new Uint8Array(await templateRes.arrayBuffer())

      const pdfDoc = await PDFDocument.load(templateBytes)
      const pages = pdfDoc.getPages()
      const page = pages[0]
      const { width, height } = page.getSize()

      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      const wipe = (x, y, w, h) => {
        page.drawRectangle({
          x,
          y: height - y - h,
          width: w,
          height: h,
          color: rgb(1, 1, 1),
          opacity: 1,
        })
      }

      const fill = (text, x, y, opts = {}) => {
        page.drawText(String(text ?? ''), {
          x,
          y: height - y,
          size: opts.size || 10,
          font: opts.bold ? fontBold : fontRegular,
          color: opts.color || rgb(0.05, 0.05, 0.05),
          maxWidth: opts.maxWidth,
        })
      }

      if (type === 'proposal') {
        const {
          client_name,
          client_company,
          proposal_date,
          valid_until,
          project_name,
          scope_items = [],
          total_usd,
          total_awg,
          timeline,
        } = data || {}

        wipe(430, 68, 160, 18)
        fill(proposal_date || '', 433, 72, { size: 9, color: rgb(0.4, 0.4, 0.4) })

        wipe(148, 155, 260, 20)
        wipe(148, 178, 260, 14)
        fill(client_name || '', 148, 160, { bold: true, size: 14 })
        fill(client_company || '', 148, 180, { size: 9, color: rgb(0.4, 0.4, 0.4) })

        wipe(656, 155, 180, 18)
        fill(valid_until || '', 660, 160, { size: 9 })

        wipe(148, 270, 380, 22)
        fill(project_name || '', 148, 275, { bold: true, size: 14 })

        wipe(148, 455, 560, 160)
        let scopeY = 462
        ;(scope_items.length ? scope_items : []).forEach((item) => {
          fill(`• ${item}`, 162, scopeY, { size: 9 })
          scopeY += 22
        })

        wipe(148, 680, 400, 30)
        fill(`$${total_usd || 0} USD`, 148, 688, { bold: true, size: 20 })
        fill(`/ Afl. ${total_awg || 0} AWG`, 310, 690, { size: 10, color: rgb(0.4, 0.4, 0.4) })

        wipe(148, 798, 420, 16)
        fill(`${timeline || ''} business days from project kickoff and initial payment`, 148, 802, { size: 9 })
      }

      if (type === 'invoice') {
        const {
          client_name,
          client_email,
          client_company,
          invoice_number,
          invoice_date,
          due_date,
          line_items = [],
          subtotal_usd,
          total_usd,
          total_awg,
        } = data || {}

        wipe(430, 58, 160, 18)
        fill(`#${invoice_number || 'INV-001'}`, 433, 64, { size: 9, color: rgb(0.4, 0.4, 0.4) })

        wipe(50, 120, 300, 60)
        fill(client_name || '', 52, 133, { bold: true, size: 12 })
        fill(client_company || '', 52, 150, { size: 9, color: rgb(0.4, 0.4, 0.4) })
        fill(client_email || '', 52, 165, { size: 9, color: rgb(0.4, 0.4, 0.4) })

        wipe(395, 120, 220, 60)
        fill(invoice_date || '', 400, 133, { size: 9 })
        fill(due_date || '', 400, 150, { size: 9 })

      wipe(50, 230, 545, 220)
      let itemY = 242
      line_items.forEach((item) => {
        const desc = (item.description || '').length > 45
          ? (item.description || '').substring(0, 45) + '...'
          : (item.description || '')
        fill(item.name || '', 62, itemY, { size: 9, bold: true })
        fill(desc, 310, itemY, { size: 8, color: rgb(0.4, 0.4, 0.4) })
        fill(`$${item.price_usd || 0}`, 680, itemY, { size: 9, bold: true })
        fill(`Afl. ${item.price_awg || 0}`, 740, itemY, { size: 9, color: rgb(0.4, 0.4, 0.4) })
        itemY += 38
      })

      const totalsY = itemY + 20
      wipe(395, totalsY - 10, 250, 80)
      fill(`$${subtotal_usd || total_usd || 0}`, 740, totalsY, { size: 8 })
      fill(`$${total_usd || 0} USD`, 640, totalsY + 30, { bold: true, size: 14 })
      fill(`Afl. ${total_awg || 0}`, 640, totalsY + 50, { size: 9, color: rgb(0.4, 0.4, 0.4) })
      }

      if (type === 'contract') {
        const {
          client_name,
          client_company,
          contract_date,
          project_name,
          total_usd,
          total_awg,
          timeline,
          payment_schedule,
        } = data || {}

        wipe(430, 68, 160, 18)
        fill(contract_date || '', 433, 72, { size: 9, color: rgb(0.4, 0.4, 0.4) })

        wipe(148, 155, 260, 36)
        fill(client_name || '', 148, 160, { bold: true, size: 14 })
        fill(client_company || '', 148, 178, { size: 9, color: rgb(0.4, 0.4, 0.4) })

        wipe(148, 270, 380, 22)
        fill(project_name || '', 148, 275, { bold: true, size: 14 })

        wipe(148, 680, 400, 30)
        fill(`$${total_usd || 0} USD`, 148, 688, { bold: true, size: 20 })
        fill(`/ Afl. ${total_awg || 0} AWG`, 310, 690, { size: 10, color: rgb(0.4, 0.4, 0.4) })

        wipe(148, 798, 420, 16)
        fill(`${timeline || ''} business days from signed contract and deposit`, 148, 802, { size: 9 })

        if (payment_schedule) {
          wipe(148, 820, 420, 30)
          fill(payment_schedule, 148, 824, { size: 9 })
        }
      }

      const pdfBytes = await pdfDoc.save()
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${type}-lithos-labs.pdf"`)
      res.send(Buffer.from(pdfBytes))
    } catch (err) {
      console.error('PDF generation error:', err)
      res.status(500).json({ error: err.message })
    }
  }

  if (action === 'test_webhook') {
    const webhookType = req.query?.type || req.body?.type || 'lead'
    const webhookUrl =
      webhookType === 'deal'
        ? process.env.MAKE_WEBHOOK_DEAL_APPROVAL
        : process.env.MAKE_WEBHOOK_NEW_LEAD

    if (!webhookUrl)
      return res.json({
        success: false,
        error: 'No webhook URL set for: ' + webhookType,
      })

    const testData =
      webhookType === 'deal'
        ? {
            rep_name: 'Test Rep',
            company_name: 'Test Company',
            service_name: 'Website Development',
            deal_value: 1500,
            commission_amount: 150,
            timestamp: new Date().toISOString(),
          }
        : {
            company_name: 'Test Company',
            contact_name: 'John Doe',
            rep_name: 'Test Rep',
            industry: 'Restaurant',
            estimated_value: 1500,
            source: 'test',
            timestamp: new Date().toISOString(),
          }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })
      const text = await response.text()
      return res.json({ success: true, status: response.status, response: text })
    } catch (e) {
      return res.json({ success: false, error: e.message })
    }
  }

  try {
    const sql = await getDb()

    if (req.method === 'GET') {
      const { action, brand_id } = req.query || {}
      if (action === 'next') {
        const result = await handleNext(sql, brand_id)
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'pipeline_list') {
        const list = await handlePipelineList(sql, brand_id)
        return res.status(200).json(list)
      }
      if (action === 'render_status') {
        const { render_id, bucket } = req.query || {}
        const result = await handleRenderStatus(sql, {
          render_id,
          bucket,
        })
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'next_scheduled') {
        const result = await handleNextScheduled(sql, brand_id)
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'process_productions') {
        const result = await handleProcessProductions(sql)
        return res.status(200).json(result)
      }
      if (action === 'daily_report') {
        const today = new Date().toISOString().split('T')[0]

        // Today's deals (deal_value column doesn't exist in live DB —
        // mapped to proposed_price; see prospector-deals-schema-mismatch memo).
        const dealsResult = await sql.query(
          `SELECT
             COUNT(*)                          AS total_deals,
             COALESCE(SUM(proposed_price), 0)  AS total_value,
             COALESCE(SUM(commission_amount), 0) AS total_commission
             FROM deals
            WHERE DATE(created_at) = $1`,
          [today],
        )

        // Today's leads
        const leadsResult = await sql.query(
          `SELECT COUNT(*) AS total_leads
             FROM sales_leads
            WHERE DATE(created_at) = $1`,
          [today],
        )

        // Per-rep breakdown — scalar subqueries (not LEFT JOINs) so deals
        // and leads don't cross-product. Role is 'sales' in this app, not 'rep'.
        const repsResult = await sql.query(
          `SELECT
             sr.name,
             (SELECT COUNT(*) FROM deals
                WHERE rep_id = sr.id AND DATE(created_at) = $1) AS deals,
             (SELECT COALESCE(SUM(proposed_price), 0) FROM deals
                WHERE rep_id = sr.id AND DATE(created_at) = $1) AS revenue,
             (SELECT COUNT(*) FROM sales_leads
                WHERE rep_id = sr.id AND DATE(created_at) = $1) AS leads
             FROM sales_reps sr
            WHERE sr.role = 'sales'
            ORDER BY revenue DESC`,
          [today],
        )

        const deals = (dealsResult.rows || dealsResult)[0] || {}
        const leads = (leadsResult.rows || leadsResult)[0] || {}
        const reps = repsResult.rows || repsResult || []

        const repLines = reps
          .map(
            (r) =>
              `  ${r.name}: ${r.deals} deals ($${Number(r.revenue).toLocaleString()}) | ${r.leads} leads`,
          )
          .join('\n')

        const report = `LITHOS LABS DAILY SALES REPORT - ${today}
=====================================
SUMMARY
  New Leads Today: ${leads.total_leads}
  Deals Submitted: ${deals.total_deals}
  Total Revenue: $${Number(deals.total_value).toLocaleString()}
  Total Commission: $${Number(deals.total_commission).toLocaleString()}

REP BREAKDOWN
${repLines || '  No activity today'}

=====================================
View dashboard: https://lithos-labs.vercel.app`

        return res.json({ success: true, report, date: today })
      }
      // ---- Social media manager (admin-only) ----
      // ---- AI receptionist (admin-only) ----
      if (action === 'get_ai_agents') {
        const result = await sql.query('SELECT * FROM ai_agents ORDER BY created_at DESC')
        return res.json({ success: true, agents: result.rows || result })
      }

      if (action === 'get_call_logs') {
        const { agent_id } = req.query || {}
        const result = agent_id
          ? await sql.query(
              `SELECT cl.*, a.agent_name, a.client_name
                 FROM ai_call_logs cl
                 LEFT JOIN ai_agents a ON a.id = cl.agent_id
                WHERE cl.agent_id = $1
                ORDER BY cl.created_at DESC
                LIMIT 200`,
              [agent_id],
            )
          : await sql.query(
              `SELECT cl.*, a.agent_name, a.client_name
                 FROM ai_call_logs cl
                 LEFT JOIN ai_agents a ON a.id = cl.agent_id
                ORDER BY cl.created_at DESC
                LIMIT 200`,
            )
        return res.json({ success: true, logs: result.rows || result })
      }

      if (action === 'get_ai_analytics') {
        const summary = await sql.query(`
          SELECT
            COUNT(DISTINCT a.id) AS total_agents,
            COALESCE(SUM(a.total_calls), 0)    AS total_calls,
            COALESCE(SUM(a.total_minutes), 0)  AS total_minutes,
            COALESCE(SUM(a.leads_captured), 0) AS total_leads,
            COUNT(DISTINCT cl.id) FILTER (
              WHERE cl.created_at > NOW() - INTERVAL '7 days'
            ) AS calls_this_week
          FROM ai_agents a
          LEFT JOIN ai_call_logs cl ON cl.agent_id = a.id`)
        const recent = await sql.query(`
          SELECT cl.*, a.agent_name, a.client_name
            FROM ai_call_logs cl
            LEFT JOIN ai_agents a ON a.id = cl.agent_id
           ORDER BY cl.created_at DESC
           LIMIT 5`)
        return res.json({
          success: true,
          analytics: (summary.rows || summary)[0] || {},
          recent_calls: recent.rows || recent || [],
        })
      }

      if (action === 'get_retell_agent') {
        // Fetch agent metadata from Retell using the pasted retell_agent_id.
        // Used by the UI to verify the ID is valid + show voice/language info.
        const { agent_id } = req.query || {}
        if (!agent_id || !process.env.RETELL_API_KEY) {
          return res.json({
            success: false,
            error: !agent_id
              ? 'agent_id required'
              : 'RETELL_API_KEY not configured',
          })
        }
        try {
          const retellRes = await fetch(
            `https://api.retellai.com/v2/get-agent/${agent_id}`,
            { headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` } },
          )
          const data = await retellRes.json()
          if (!retellRes.ok) {
            return res.json({
              success: false,
              status: retellRes.status,
              error: data?.error || data?.message || `HTTP ${retellRes.status}`,
            })
          }
          return res.json({ success: true, agent: data })
        } catch (e) {
          return res.json({ success: false, error: e.message })
        }
      }

      if (action === 'get_social_posts') {
        const result = await sql.query(`
          SELECT * FROM social_posts
           ORDER BY
             CASE status
               WHEN 'scheduled' THEN 1
               WHEN 'draft'     THEN 2
               WHEN 'published' THEN 3
               ELSE 4
             END,
             scheduled_at ASC,
             created_at DESC`)
        return res.json({ success: true, posts: result.rows || result })
      }

      if (action === 'get_social_analytics') {
        const summary = await sql.query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'published') AS total_published,
            COUNT(*) FILTER (WHERE status = 'scheduled') AS total_scheduled,
            COUNT(*) FILTER (WHERE status = 'draft')     AS total_drafts,
            COALESCE(SUM(likes), 0)    AS total_likes,
            COALESCE(SUM(views), 0)    AS total_views,
            COALESCE(SUM(reach), 0)    AS total_reach,
            COALESCE(SUM(comments), 0) AS total_comments,
            COALESCE(SUM(saves), 0)    AS total_saves,
            COALESCE(AVG(likes) FILTER (WHERE status = 'published'), 0) AS avg_likes,
            COALESCE(AVG(reach) FILTER (WHERE status = 'published'), 0) AS avg_reach
          FROM social_posts`)
        const recent = await sql.query(`
          SELECT * FROM social_posts
           WHERE status = 'published'
           ORDER BY published_at DESC
           LIMIT 5`)
        return res.json({
          success: true,
          analytics: (summary.rows || summary)[0] || {},
          recent_posts: recent.rows || recent || [],
        })
      }

      if (action === 'publish_due_posts') {
        // Called by Make.com on a 15-minute cron.
        const now = new Date().toISOString()
        const dueResult = await sql.query(
          `SELECT * FROM social_posts WHERE status = 'scheduled' AND scheduled_at <= $1`,
          [now],
        )
        const duePosts = dueResult.rows || dueResult || []
        const results = []
        for (const post of duePosts) {
          try {
            const igUserId = process.env.INSTAGRAM_USER_ID
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN
            if (!igUserId || !igToken) {
              results.push({ id: post.id, success: false, error: 'IG credentials not set' })
              continue
            }
            if (!post.image_url) {
              results.push({ id: post.id, success: false, error: 'No image URL' })
              continue
            }
            // 1. Create media container
            const containerRes = await fetch(
              `https://graph.facebook.com/v18.0/${igUserId}/media`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image_url: post.image_url,
                  caption: post.caption,
                  access_token: igToken,
                }),
              },
            )
            const container = await containerRes.json()
            const mediaId = container.id
            if (!mediaId) {
              results.push({ id: post.id, success: false, error: container.error?.message || 'No media id' })
              continue
            }
            // 2. Wait for media processing
            await new Promise((r) => setTimeout(r, 5000))
            // 3. Publish
            const publishRes = await fetch(
              `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creation_id: mediaId, access_token: igToken }),
              },
            )
            const published = await publishRes.json()
            await sql.query(
              `UPDATE social_posts
                  SET status = 'published',
                      published_at = NOW(),
                      instagram_post_id = $1,
                      updated_at = NOW()
                WHERE id = $2`,
              [published.id || null, post.id],
            )
            results.push({ id: post.id, success: true, ig_id: published.id })
          } catch (e) {
            results.push({ id: post.id, success: false, error: e.message })
          }
        }
        return res.json({ success: true, processed: results.length, results })
      }

      if (action === 'sync_instagram_analytics') {
        const igToken = process.env.INSTAGRAM_ACCESS_TOKEN
        const posts = await sql.query(`
          SELECT * FROM social_posts
           WHERE status = 'published'
             AND instagram_post_id IS NOT NULL
             AND published_at > NOW() - INTERVAL '30 days'`)
        const rows = posts.rows || posts || []
        for (const post of rows) {
          try {
            const r = await fetch(
              `https://graph.facebook.com/v18.0/${post.instagram_post_id}/insights?metric=impressions,reach,likes,comments,saved&access_token=${igToken}`,
            )
            const data = await r.json()
            if (data.data) {
              const metrics = {}
              data.data.forEach((m) => {
                metrics[m.name] = m.values?.[0]?.value || 0
              })
              await sql.query(
                `UPDATE social_posts
                    SET views = $1, reach = $2, likes = $3, comments = $4, saves = $5,
                        updated_at = NOW()
                  WHERE id = $6`,
                [
                  metrics.impressions || 0,
                  metrics.reach || 0,
                  metrics.likes || 0,
                  metrics.comments || 0,
                  metrics.saved || 0,
                  post.id,
                ],
              )
            }
          } catch (e) {
            console.log('Analytics sync error for post', post.id, e.message)
          }
        }
        return res.json({ success: true, synced: rows.length })
      }

      const salesGet = await handleSales(sql, {
        method: 'GET',
        action,
        query: req.query || {},
        body: {},
      })
      if (salesGet.handled) return res.status(200).json(salesGet.payload)
      return res.status(400).json({
        error:
          'GET requires action=next|pipeline_list|render_status|next_scheduled|<sales actions>',
      })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const action = body.action

      // ---- AI receptionist (admin-only write actions) ----
      if (action === 'create_ai_agent') {
        // Simplified: agents are created in the Retell dashboard. Admin pastes
        // the resulting `retell_agent_id` here so the webhook can resolve it.
        const {
          client_name,
          agent_name,
          retell_agent_id,
          phone_number,
          business_name,
          status,
        } = body

        if (!client_name || !agent_name || !retell_agent_id) {
          return res.json({
            success: false,
            error: 'client_name, agent_name, retell_agent_id required',
          })
        }

        const result = await sql.query(
          `INSERT INTO ai_agents (
             client_name, agent_name, retell_agent_id, phone_number,
             business_name, status
           ) VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING *`,
          [
            client_name,
            agent_name,
            retell_agent_id,
            phone_number || null,
            business_name || null,
            status || 'active',
          ],
        )

        return res.json({ success: true, agent: (result.rows || result)[0] })
      }

      if (action === 'update_ai_agent') {
        const { agent_id, ...updates } = body
        if (!agent_id) return res.json({ success: false, error: 'agent_id required' })
        const result = await sql.query(
          `UPDATE ai_agents SET
              client_name      = COALESCE($1, client_name),
              agent_name       = COALESCE($2, agent_name),
              retell_agent_id  = COALESCE($3, retell_agent_id),
              phone_number     = COALESCE($4, phone_number),
              business_name    = COALESCE($5, business_name),
              status           = COALESCE($6, status),
              updated_at       = NOW()
            WHERE id = $7
            RETURNING *`,
          [
            updates.client_name || null,
            updates.agent_name || null,
            updates.retell_agent_id || null,
            updates.phone_number || null,
            updates.business_name || null,
            updates.status || null,
            agent_id,
          ],
        )
        return res.json({ success: true, agent: (result.rows || result)[0] })
      }

      if (action === 'delete_ai_agent') {
        const { agent_id } = body
        if (!agent_id) return res.json({ success: false, error: 'agent_id required' })
        await sql.query('DELETE FROM ai_agents WHERE id = $1', [agent_id])
        return res.json({ success: true })
      }

      // ---- Social media manager (admin-only write actions) ----
      if (action === 'create_social_post') {
        const { caption, image_url, scheduled_at, status } = body
        if (!caption) return res.json({ success: false, error: 'Caption required' })
        const result = await sql.query(
          `INSERT INTO social_posts (caption, image_url, scheduled_at, status)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [caption, image_url || null, scheduled_at || null, status || 'draft'],
        )
        return res.json({ success: true, post: (result.rows || result)[0] })
      }

      if (action === 'update_social_post') {
        const { post_id, caption, image_url, scheduled_at, status } = body
        if (!post_id) return res.json({ success: false, error: 'post_id required' })
        const result = await sql.query(
          `UPDATE social_posts
              SET caption     = COALESCE($1, caption),
                  image_url   = COALESCE($2, image_url),
                  scheduled_at = $3,
                  status      = COALESCE($4, status),
                  updated_at  = NOW()
            WHERE id = $5
            RETURNING *`,
          [caption || null, image_url || null, scheduled_at || null, status || null, post_id],
        )
        return res.json({ success: true, post: (result.rows || result)[0] })
      }

      if (action === 'delete_social_post') {
        const { post_id } = body
        if (!post_id) return res.json({ success: false, error: 'post_id required' })
        await sql.query(`DELETE FROM social_posts WHERE id = $1 AND status != 'published'`, [post_id])
        return res.json({ success: true })
      }

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
      if (action === 'pipeline_start') {
        const result = await handlePipelineStart(sql, body)
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'pipeline_advance') {
        const result = await handlePipelineAdvance(sql, body)
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'edit_video') {
        const result = await handleEditVideo(sql, body)
        return res.status(200).json({ success: true, ...result })
      }
      if (action === 'post_instagram') {
        const result = await handlePostInstagram(sql, body)
        return res.status(200).json(result)
      }
      if (action === 'analytics_pull') {
        const result = await handleAnalyticsPull(sql, body)
        return res.status(200).json(result)
      }
      if (action === 'process_productions') {
        const result = await handleProcessProductions(sql)
        return res.status(200).json(result)
      }
      const salesPost = await handleSales(sql, {
        method: 'POST',
        action,
        query: {},
        body,
      })
      if (salesPost.handled) return res.status(200).json(salesPost.payload)
      return res
        .status(400)
        .json({
          error:
            "body.action must be 'approve', 'reject', 'published', 'pipeline_start', 'pipeline_advance', 'edit_video', 'post_instagram', or a sales action",
        })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('workflow handler error:', error.message)
    return res
      .status(error.status || 500)
      .json({ error: error.message })
  }
}
