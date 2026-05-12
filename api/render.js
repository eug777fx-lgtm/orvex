// Required environment variables (set in Vercel project settings):
//   VITE_DATABASE_URL       — Neon Postgres connection string
//   REMOTION_AWS_BUCKET     — S3 bucket for Remotion Lambda renders (optional, future)
//   REMOTION_AWS_ACCESS_KEY — AWS access key for Remotion Lambda (optional, future)
//
// POST /api/render
// Body: { composition_id, props, brand_id }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { composition_id, props, brand_id } = req.body || {}
    if (!composition_id) {
      return res.status(400).json({ error: 'composition_id required' })
    }

    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    let propsWithBrand = props || {}
    if (brand_id) {
      const brandRows = await sql.query(
        'SELECT logo_url, primary_color, secondary_color, name FROM brands WHERE id = $1',
        [brand_id],
      )
      const brand = (brandRows?.rows ?? brandRows)?.[0]
      if (brand) {
        propsWithBrand = {
          ...propsWithBrand,
          logoUrl: brand.logo_url ?? propsWithBrand.logoUrl ?? null,
          brandName: brand.name ?? propsWithBrand.brandName ?? '',
          primaryColor:
            brand.primary_color ?? propsWithBrand.primaryColor ?? '#ffffff',
          secondaryColor:
            brand.secondary_color ?? propsWithBrand.secondaryColor ?? '#000000',
        }
      }
    }

    await sql.query(
      `INSERT INTO agent_runs (brand_id, agent_type, input, output, status, tokens_used)
       VALUES ($1, 'video_render', $2, $3, 'queued', 0)`,
      [
        brand_id || null,
        JSON.stringify({ composition_id, props: propsWithBrand }),
        JSON.stringify({
          status: 'queued',
          message: 'Remotion Lambda not configured yet',
        }),
      ],
    )

    return res.status(200).json({
      success: true,
      status: 'queued',
      composition_id,
      props_with_brand: propsWithBrand,
      message:
        'Remotion Lambda not configured yet — add REMOTION_AWS_BUCKET and REMOTION_AWS_ACCESS_KEY to enable cloud rendering',
      preview_available: false,
    })
  } catch (error) {
    console.error('render handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
