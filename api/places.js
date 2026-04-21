export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { endpoint, ...params } = req.query
  const apiKey = process.env.VITE_GOOGLE_PLACES_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured' })
  }

  const allowedEndpoints = [
    'maps/api/place/textsearch/json',
    'maps/api/place/details/json',
    'maps/api/place/nearbysearch/json',
  ]

  if (!allowedEndpoints.includes(endpoint)) {
    return res.status(400).json({ error: 'Invalid endpoint' })
  }

  const queryParams = new URLSearchParams({ ...params, key: apiKey })
  const url = `https://maps.googleapis.com/${endpoint}?${queryParams}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
