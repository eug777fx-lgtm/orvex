const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const INDUSTRIES = {
  Plumber: 'plumber',
  Electrician: 'electrician',
  HVAC: 'hvac air conditioning',
  'Pest Control': 'pest control',
  Landscaping: 'landscaping',
  Cleaning: 'cleaning service',
  'Clothing Store': 'clothing store boutique',
  'Coffee Shop': 'coffee shop cafe',
  'Smoothie Bar': 'smoothie juice bar',
  'Food Truck': 'food truck',
  Restaurant: 'restaurant',
  Bakery: 'bakery',
  Salon: 'hair salon beauty',
  Barbershop: 'barbershop',
  Gym: 'gym fitness center',
}

export async function searchBusinesses(
  selectedIndustries,
  selectedLocations,
  apiKey,
  onProgress,
) {
  console.log('Starting search with key:', apiKey ? 'KEY_PRESENT' : 'KEY_MISSING')

  const results = []
  const seen = new Set()

  let completed = 0
  const total = selectedIndustries.length * selectedLocations.length

  for (const industry of selectedIndustries) {
    for (const location of selectedLocations) {
      const query = `${INDUSTRIES[industry] || industry} in ${location} Aruba`

      try {
        onProgress?.(`Searching ${industry} in ${location}... (${completed + 1} of ${total})`)

        const searchUrl = `/maps-api/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
        console.log('Searching:', query)

        const response = await fetch(searchUrl)
        const data = await response.json()

        console.log(
          'Results for',
          query,
          ':',
          data.status,
          data.results?.length || 0,
          'places',
        )

        if (data.status === 'REQUEST_DENIED') {
          throw new Error(
            'API key invalid or Places API not enabled: ' +
              (data.error_message || 'unknown'),
          )
        }

        if (data.results && data.results.length > 0) {
          for (const place of data.results) {
            if (seen.has(place.place_id)) continue
            seen.add(place.place_id)

            const hasWebsite = place.website && place.website.length > 0
            if (hasWebsite) continue

            await delay(150)

            let phone = null
            try {
              const detailUrl = `/maps-api/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,rating,user_ratings_total,website,business_status&key=${apiKey}`
              const detailResponse = await fetch(detailUrl)
              const detailData = await detailResponse.json()

              if (detailData.result) {
                if (detailData.result.website) continue
                phone = detailData.result.formatted_phone_number || null
              }
            } catch (e) {
              console.warn('Detail fetch failed for', place.name)
            }

            results.push({
              place_id: place.place_id,
              company_name: place.name,
              phone: phone,
              address: place.formatted_address || place.vicinity || '',
              location: location,
              industry: industry.toLowerCase(),
              rating: place.rating || null,
              review_count: place.user_ratings_total || 0,
              has_website: false,
              website_url: null,
              source: 'google_places',
              opportunity_score: calculateScore(place),
            })

            console.log('No-website businesses found so far:', results.length)

            if (results.length >= 50) break
          }
        }
      } catch (error) {
        console.error(`Search failed for ${industry} in ${location}:`, error)
        onProgress?.(`Error searching ${industry} in ${location}: ${error.message}`)
        if (String(error.message || '').includes('Places API not enabled')) {
          throw error
        }
      }

      completed++
      if (results.length >= 50) break
      await delay(200)
    }
    if (results.length >= 50) break
  }

  return results.sort((a, b) => (a.rating || 5) - (b.rating || 5))
}

function calculateScore(place) {
  let score = 4
  if (!place.rating || place.rating < 4) score += 1
  if (!place.user_ratings_total || place.user_ratings_total < 10) score += 1
  score += 2
  return Math.min(score, 10)
}

export default searchBusinesses
