// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL   — Neon Postgres connection string
//   ANTHROPIC_API_KEY   — Claude API key
//   ELEVENLABS_API_KEY  — ElevenLabs TTS (optional; falls back if missing)
//
// 5-stage content pipeline per brand:
//   POST /api/pipeline           body: { brand_id, type }
//     - type 'full' starts at stage 1 (script)
//     - type 'script_only' / 'audio_only' / 'visuals_only' run that stage only
//   POST /api/pipeline           body: { pipeline_id, stage }
//     - stage 'audio' | 'visuals' | 'assembly' advances an existing pipeline
//   GET  /api/pipeline?brand_id=<uuid>
//     - Recent pipelines for the brand (for the UI)

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

async function getDb() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.VITE_DATABASE_URL)
}

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
    // Storyboard fallback for now — actually triggering Remotion Lambda from
    // inside another Vercel function can exceed timeout; UI offers manual
    // render. The storyboard payload is always usable.
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

  // Build the final post package.
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const sql = await getDb()

    if (req.method === 'GET') {
      const { brand_id } = req.query || {}
      if (!brand_id) return res.status(400).json({ error: 'brand_id required' })
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
      return res.status(200).json(rows?.rows ?? rows ?? [])
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = req.body || {}

    // Resume an existing pipeline at a specific stage
    if (body.pipeline_id && body.stage) {
      if (body.stage === 'audio') {
        const out = await runAudioStage(sql, body.pipeline_id)
        return res.status(200).json({ success: true, pipeline_id: body.pipeline_id, ...out })
      }
      if (body.stage === 'visuals') {
        const out = await runVisualsStage(sql, body.pipeline_id)
        return res.status(200).json({ success: true, pipeline_id: body.pipeline_id, ...out })
      }
      if (body.stage === 'assembly') {
        const out = await runAssemblyStage(sql, body.pipeline_id)
        return res.status(200).json({ success: true, pipeline_id: body.pipeline_id, ...out })
      }
      return res.status(400).json({ error: `unknown stage: ${body.stage}` })
    }

    // Start a new pipeline
    const { brand_id, type } = body
    if (!brand_id) {
      return res.status(400).json({
        error: 'brand_id required. All pipelines must be tied to a brand.',
      })
    }
    const t = type || 'full'
    if (t === 'script_only' || t === 'full') {
      const scriptOut = await runScriptStage(sql, brand_id)
      if (t === 'script_only') {
        return res.status(200).json({ success: true, ...scriptOut })
      }
      // For 'full' the UI advances through audio/visuals/assembly manually so
      // each stage stays inside Vercel's function timeout. Return after script.
      return res.status(200).json({ success: true, ...scriptOut, next: 'audio' })
    }
    return res
      .status(400)
      .json({ error: `unsupported type: ${t}. Use 'full' or 'script_only'` })
  } catch (error) {
    console.error('pipeline handler error:', error.message)
    return res.status(error.status || 500).json({ error: error.message })
  }
}
