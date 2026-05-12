import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda-client'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { composition_id, props, brand_id } = req.body || {}

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

    // Merge brand data with props
    const finalProps = { ...props, ...brandData }

    // Start Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: process.env.REMOTION_AWS_REGION || 'us-east-1',
      functionName: process.env.REMOTION_FUNCTION_NAME,
      serveUrl: process.env.REMOTION_SERVE_URL,
      composition: composition_id,
      inputProps: finalProps,
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      outName: `${brand_id || 'brand'}-${composition_id}-${Date.now()}.mp4`,
    })

    // Log to agent_runs
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

    // Poll for completion (up to 110 seconds — may exceed Vercel function
    // timeout; the 202 branch below is the fallback when we time out).
    const startTime = Date.now()
    let outputUrl = null

    while (Date.now() - startTime < 110000) {
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: process.env.REMOTION_FUNCTION_NAME,
        region: process.env.REMOTION_AWS_REGION || 'us-east-1',
      })

      if (progress.done) {
        outputUrl = progress.outputFile
        break
      }

      if (progress.fatalErrorEncountered) {
        throw new Error(progress.errors?.[0]?.message || 'Render failed')
      }
    }

    if (!outputUrl) {
      return res.status(202).json({
        success: true,
        status: 'rendering',
        renderId,
        message: 'Video is still rendering — check back in 2 minutes',
      })
    }

    // Save to content table
    const contentResult = await sql.query(
      'INSERT INTO content (brand_id, type, script, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [brand_id || null, 'video', outputUrl, 'pending'],
    )

    // Update agent_runs status
    await sql.query(
      'UPDATE agent_runs SET status=$1, output=$2 WHERE output::text LIKE $3',
      [
        'complete',
        JSON.stringify({ renderId, bucketName, outputUrl }),
        `%${renderId}%`,
      ],
    )

    const contentRows = contentResult?.rows ?? contentResult
    return res.status(200).json({
      success: true,
      status: 'complete',
      url: outputUrl,
      content_id: contentRows?.[0]?.id,
      composition: composition_id,
      brand: brandData.brandName,
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
