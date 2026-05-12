// Required env vars (set in Vercel project settings):
//   VITE_DATABASE_URL — Neon Postgres connection string
//
// GET /api/brands
// Returns: [{ id, name, color, brand_type }, ...]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.VITE_DATABASE_URL)

    const result = await sql.query(
      `SELECT id, name, color, COALESCE(brand_type, 'own') AS brand_type
         FROM brands
        ORDER BY brand_type ASC, created_at ASC`,
    )
    const rows = result?.rows ?? result ?? []
    return res.status(200).json(rows)
  } catch (error) {
    console.error('brands handler error:', error.message)
    return res.status(500).json({ error: error.message })
  }
}
