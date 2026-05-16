import { startRemotionRender } from './_render-helper.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { composition_id, props, brand_id, backgroundVideoUrl } = req.body || {}

  if (!composition_id) return res.status(400).json({ error: 'composition_id required' })

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    // Fetch brand data
    let brandData = {}
    if (brand_id) {
      const brandResult = await sql.query(
        'SELECT name, logo_url, primary_color, secondary_color, visual_style FROM brands WHERE id = $1',
        [brand_id],
      )
      const brand = (brandResult?.rows ?? brandResult)?.[0]
      if (brand) {
        brandData = {
          brandName: brand.name,
          logoUrl: brand.logo_url,
          primaryColor: brand.primary_color || '#ffffff',
          secondaryColor: brand.secondary_color || '#000000',
        }
      }
    }

    // Merge brand data with props. backgroundVideoUrl (Higgsfield footage)
    // is passed explicitly so callers can supply it at the top level without
    // nesting it inside props. Falls back to null when missing — the
    // composition then renders on its dark base layer.
    const finalProps = {
      ...props,
      ...brandData,
      backgroundVideoUrl:
        backgroundVideoUrl ?? props?.backgroundVideoUrl ?? null,
    }

    // Start Lambda render via the shared helper.
    const started = await startRemotionRender({
      compositionId: composition_id,
      props: finalProps,
      brandId: brand_id,
      sql,
    })
    if (!started?.renderId) {
      return res.status(200).json({
        success: false,
        status: 'skipped',
        message:
          'Render not started — Remotion not configured or kickoff failed',
      })
    }
    const { renderId, bucketName } = started

    // Fire-and-forget: log the render and return immediately. The Lambda
    // render keeps running on AWS (up to 300s). Completion is backfilled by
    // polling GET /api/workflow?action=render_status which reads
    // getRenderProgress and writes visual_url onto the package.
    await sql.query(
      'INSERT INTO agent_runs (brand_id, agent_type, input, output, status) VALUES ($1, $2, $3, $4, $5)',
      [
        brand_id || null,
        'video_render',
        JSON.stringify({ composition_id, props: finalProps }),
        JSON.stringify({ renderId, bucketName }),
        'rendering',
      ],
    )

    return res.status(200).json({
      success: true,
      status: 'rendering',
      renderId,
      bucketName,
      message: 'Render started',
    })
  } catch (error) {
    console.error('Render error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check REMOTION_FUNCTION_NAME, REMOTION_SERVE_URL, and AWS credentials in Vercel env vars',
    })
  }
}
