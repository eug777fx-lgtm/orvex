// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL    — Neon Postgres connection string
//   ANTHROPIC_API_KEY    — Claude API key (for pipeline script stage)
//   ELEVENLABS_API_KEY   — ElevenLabs TTS (optional; falls back if missing)
//   CREATOMATE_API_KEY   — Creatomate video render API (optional; falls back if missing)
//
// GET  /api/workflow?action=next&brand_id=<uuid>
//   Returns the next approved+unpublished content ready to post.
//   Response: { success, has_content, content? }
//
// GET  /api/workflow?action=pipeline_list&brand_id=<uuid>
//   Returns recent pipelines for the brand (for the UI).
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

async function handleApprove(sql, body) {
  const { content_id, brand_id } = body
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

async function handleEditVideo(sql, body) {
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

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
      return res
        .status(400)
        .json({ error: 'GET requires action=next|pipeline_list&brand_id=...' })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const action = body.action
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
      return res
        .status(400)
        .json({
          error:
            "body.action must be 'approve', 'reject', 'published', 'pipeline_start', 'pipeline_advance', or 'edit_video'",
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
