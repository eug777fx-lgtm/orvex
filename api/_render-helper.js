// Shared Remotion render kickoff. Underscore-prefixed so Vercel does NOT
// treat this as a Serverless Function (keeps us under the 12-function cap).
import { renderMediaOnLambda } from '@remotion/lambda-client'

export async function startRemotionRender({ compositionId, props, brandId, sql }) {
  if (!process.env.REMOTION_FUNCTION_NAME || !process.env.REMOTION_SERVE_URL) {
    console.log('Remotion not configured — skipping render')
    return null
  }

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.REMOTION_AWS_REGION || 'us-east-1',
      functionName: process.env.REMOTION_FUNCTION_NAME,
      serveUrl: process.env.REMOTION_SERVE_URL,
      composition: compositionId,
      inputProps: props,
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 1,
      framesPerLambda: 40,
      concurrencyPerLambda: 1,
      privacy: 'public',
    })

    console.log('Render started:', renderId, 'bucket:', bucketName)
    return { renderId, bucketName }
  } catch (err) {
    console.error('Remotion render failed:', err.message)
    return null
  }
}

// Full multi-scene production: Higgsfield clip + ElevenLabs voiceover per
// scene, then a Creatomate timeline assembly. Self-contained — fetches the
// package + brand from ids so it can be driven by the cron worker or any
// caller. Returns { success, video_url, scenes_count, duration } and writes
// the result back onto the package. On hard failure flips the package back
// to 'needs_visual' so it can be retried.
export async function produceVideo({ packageId, brandId, sql }) {
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
  const fail = async (msg) => {
    await sql.query(
      "UPDATE post_packages SET status='needs_visual', updated_at=now() WHERE id=$1",
      [packageId],
    )
    return { success: false, error: msg || 'production failed' }
  }

  const pkgRows = await sql.query(
    'SELECT * FROM post_packages WHERE id=$1 AND brand_id=$2',
    [packageId, brandId],
  )
  const pkg = (pkgRows?.rows ?? pkgRows)?.[0]
  if (!pkg) return { success: false, error: 'package not found' }

  let videoScript
  try {
    videoScript = JSON.parse(pkg.script)
  } catch {
    videoScript = null
  }
  const scenes = Array.isArray(videoScript?.scenes) ? videoScript.scenes : []
  if (scenes.length === 0) return fail('no scenes in script')

  const brandRows = await sql.query(
    'SELECT id, name, primary_color, secondary_color, logo_url FROM brands WHERE id=$1',
    [brandId],
  )
  const brand = (brandRows?.rows ?? brandRows)?.[0] || {}
  const brandColor = brand.primary_color || '#0B0B0D'
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
              statusData.video_url || statusData.output_url || statusData.url
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

  // Build the Creatomate timeline.
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

  // Submit to Creatomate.
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

  // Poll Creatomate.
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

  const scenesCount = scenes_data.length
  if (finalVideoUrl) {
    await sql.query(
      `UPDATE post_packages
          SET visual_url=$1, visual_type='video', status='ready',
              scenes_data=$2::jsonb, video_duration=$3, scenes_count=$4,
              updated_at=now()
        WHERE id=$5`,
      [
        finalVideoUrl,
        JSON.stringify(scenes_data),
        Math.round(timeOffset),
        scenesCount,
        packageId,
      ],
    )
    await sql.query(
      `INSERT INTO agent_runs (brand_id, agent_type, status, output)
       VALUES ($1, 'video_producer', 'complete', $2)`,
      [
        brandId,
        JSON.stringify({
          video_url: finalVideoUrl,
          scenes: scenesCount,
          duration: timeOffset,
        }),
      ],
    )
    return {
      success: true,
      video_url: finalVideoUrl,
      scenes_count: scenesCount,
      duration: Math.round(timeOffset),
    }
  }

  // Fallback — best individual scene that has a Higgsfield clip.
  const fallbackUrl =
    scenes_data.find((s) => s.higgsfield_url)?.higgsfield_url || null
  if (fallbackUrl) {
    await sql.query(
      `UPDATE post_packages
          SET visual_url=$1, status='ready',
              scenes_data=$2::jsonb, video_duration=$3, scenes_count=$4,
              updated_at=now()
        WHERE id=$5`,
      [
        fallbackUrl,
        JSON.stringify(scenes_data),
        Math.round(timeOffset),
        scenesCount,
        packageId,
      ],
    )
    await sql.query(
      `INSERT INTO agent_runs (brand_id, agent_type, status, output)
       VALUES ($1, 'video_producer', 'fallback', $2)`,
      [
        brandId,
        JSON.stringify({
          fallback: true,
          video_url: fallbackUrl,
          message: 'Used best available scene as fallback',
        }),
      ],
    )
    return {
      success: true,
      fallback: true,
      video_url: fallbackUrl,
      scenes_count: scenesCount,
      duration: Math.round(timeOffset),
    }
  }

  // Nothing usable — bounce back to needs_visual so it can be retried.
  return fail('creatomate failed and no usable scene clip')
}
