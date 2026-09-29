// ============================================================================
// Lead Intelligence — business data providers.
//
// Every provider returns records in ONE normalized shape so the rest of the
// system never depends on a specific vendor:
//
//   { provider, provider_id, business_name, category, types, address, city,
//     region, country, country_code, postal_code, phone, phone_intl, website,
//     email, rating, review_count, hours, description, business_status,
//     source_url, lat, lng, raw_data }
//
// Missing values are null. Nothing is inferred or invented.
//
// Providers:
//   google_places         Google Places API (New): Text Search + Place Details
//   google_places_legacy  Google Places API (legacy) fallback
//   manual                business data typed in by the user
//
// Env:  GOOGLE_PLACES_API_KEY (preferred) or VITE_GOOGLE_PLACES_KEY (legacy
//       name, read server-side only).
// ============================================================================

export class ProviderError extends Error {
  constructor(code, message, detail) {
    super(message)
    this.code = code // not_configured | service_disabled | auth | quota | bad_request | timeout | upstream
    this.detail = detail
  }
}

export const googleKey = () => process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_KEY || ''

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url, init = {}, { timeoutMs = 12000, retries = 2 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      const text = await res.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        data = { _raw: text.slice(0, 300) }
      }
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(600 * (attempt + 1) ** 2)
        continue
      }
      return { status: res.status, data }
    } catch (e) {
      lastErr = e
      if (attempt < retries) {
        await sleep(600 * (attempt + 1) ** 2)
        continue
      }
    } finally {
      clearTimeout(t)
    }
  }
  if (lastErr?.name === 'AbortError') throw new ProviderError('timeout', 'Provider request timed out')
  throw new ProviderError('upstream', 'Provider request failed', lastErr?.message)
}

function parseComponents(comps, longKey, shortKey) {
  const out = { city: null, region: null, region_name: null, country: null, country_code: null, postal_code: null }
  const find = (type) => (comps || []).find((c) => (c.types || []).includes(type))
  const city = find('locality') || find('postal_town') || find('sublocality_level_1') || find('sublocality') || find('administrative_area_level_2')
  if (city) out.city = city[longKey] || null
  const reg = find('administrative_area_level_1')
  if (reg) {
    out.region = reg[shortKey] || reg[longKey] || null
    out.region_name = reg[longKey] || null
  }
  const c = find('country')
  if (c) {
    out.country = c[longKey] || null
    out.country_code = c[shortKey] || null
  }
  const pc = find('postal_code')
  if (pc) out.postal_code = pc[longKey] || null
  return out
}

// ---------------------------------------------------------------------------
// Google Places API (New)
// ---------------------------------------------------------------------------

const NEW_FIELDS = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'location', 'types', 'primaryType',
  'primaryTypeDisplayName', 'businessStatus', 'googleMapsUri', 'websiteUri', 'nationalPhoneNumber',
  'internationalPhoneNumber', 'rating', 'userRatingCount', 'regularOpeningHours', 'pureServiceAreaBusiness',
]

function newApiError(status, data) {
  const msg = data?.error?.message || `HTTP ${status}`
  const details = JSON.stringify(data?.error?.details || [])
  if (status === 403 && /SERVICE_DISABLED|has not been used|is disabled|API_KEY_SERVICE_BLOCKED|are blocked/i.test(msg + details)) {
    return new ProviderError('service_disabled', 'Places API (New) is not enabled for this key', msg)
  }
  if (status === 400 && /API key not valid|API_KEY_INVALID/i.test(msg + details)) return new ProviderError('auth', 'Invalid Google API key', msg)
  if (status === 401 || status === 403) return new ProviderError('auth', 'Google rejected the API key', msg)
  if (status === 429) return new ProviderError('quota', 'Google API quota exceeded', msg)
  if (status === 400) return new ProviderError('bad_request', 'Invalid search request', msg)
  return new ProviderError('upstream', 'Google Places request failed', msg)
}

function normalizeNewPlace(p) {
  const comp = parseComponents(p.addressComponents, 'longText', 'shortText')
  return {
    provider: 'google_places',
    provider_id: p.id,
    business_name: p.displayName?.text || 'Unnamed business',
    category: p.primaryTypeDisplayName?.text || null,
    types: Array.isArray(p.types) ? p.types.slice(0, 12) : [],
    address: p.formattedAddress || null,
    city: comp.city,
    region: comp.region,
    country: comp.country,
    country_code: comp.country_code,
    postal_code: comp.postal_code,
    phone: p.nationalPhoneNumber || null,
    phone_intl: p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    email: null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    review_count: typeof p.userRatingCount === 'number' ? p.userRatingCount : p.rating ? null : 0,
    hours: p.regularOpeningHours?.weekdayDescriptions || null,
    description: null,
    business_status: p.businessStatus || null,
    source_url: p.googleMapsUri || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    raw_data: {
      primaryType: p.primaryType || null,
      pureServiceAreaBusiness: !!p.pureServiceAreaBusiness,
    },
  }
}

export const googlePlacesNew = {
  key: 'google_places',
  label: 'Google Places',
  configured: () => !!googleKey(),

  async search({ textQuery, regionCode, minRating, bias, pageToken }) {
    const body = {
      textQuery,
      pageSize: 20,
      languageCode: 'en',
      includePureServiceAreaBusinesses: true,
    }
    if (regionCode) body.regionCode = regionCode
    if (minRating) body.minRating = Math.max(0, Math.min(5, Math.floor(Number(minRating) * 2) / 2))
    if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: Math.min(50000, bias.radiusM) } }
    if (pageToken) body.pageToken = pageToken
    const { status, data } = await fetchJson('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey(),
        'X-Goog-FieldMask': NEW_FIELDS.map((f) => `places.${f}`).concat('nextPageToken').join(','),
      },
      body: JSON.stringify(body),
    })
    if (status !== 200) throw newApiError(status, data)
    return {
      items: (data.places || []).map(normalizeNewPlace),
      nextPageToken: data.nextPageToken || null,
      requests: [{ kind: 'search' }],
    }
  },

  async details(providerId) {
    const { status, data } = await fetchJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(providerId)}`, {
      headers: { 'X-Goog-Api-Key': googleKey(), 'X-Goog-FieldMask': NEW_FIELDS.join(',') },
    })
    if (status !== 200) throw newApiError(status, data)
    return { item: normalizeNewPlace(data), requests: [{ kind: 'details' }] }
  },

  async geocode(text, regionCode) {
    const body = { textQuery: text, pageSize: 1, languageCode: 'en' }
    if (regionCode) body.regionCode = regionCode
    const { status, data } = await fetchJson('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleKey(),
        'X-Goog-FieldMask': 'places.location,places.displayName',
      },
      body: JSON.stringify(body),
    })
    if (status !== 200) throw newApiError(status, data)
    const loc = data.places?.[0]?.location
    return { point: loc ? { lat: loc.latitude, lng: loc.longitude } : null, requests: [{ kind: 'geocode' }] }
  },
}

// ---------------------------------------------------------------------------
// Google Places API (legacy) — fallback when the New API isn't enabled.
// Text Search does not return phone/website, so the top results are enriched
// with Place Details (staged, capped by settings.provider.legacy_enrich_count).
// ---------------------------------------------------------------------------

function legacyError(data) {
  const st = data?.status
  const msg = data?.error_message || st || 'unknown'
  if (st === 'REQUEST_DENIED') {
    if (/not authorized|not enabled|legacy/i.test(msg)) return new ProviderError('service_disabled', 'Places API (legacy) is not enabled for this key', msg)
    return new ProviderError('auth', 'Google rejected the API key', msg)
  }
  if (st === 'OVER_QUERY_LIMIT') return new ProviderError('quota', 'Google API quota exceeded', msg)
  if (st === 'INVALID_REQUEST') return new ProviderError('bad_request', 'Invalid search request', msg)
  return new ProviderError('upstream', 'Google Places request failed', msg)
}

function normalizeLegacy(p) {
  const comp = parseComponents(p.address_components, 'long_name', 'short_name')
  return {
    provider: 'google_places_legacy',
    provider_id: p.place_id,
    business_name: p.name || 'Unnamed business',
    category: null,
    types: Array.isArray(p.types) ? p.types.slice(0, 12) : [],
    address: p.formatted_address || p.vicinity || null,
    city: comp.city,
    region: comp.region,
    country: comp.country,
    country_code: comp.country_code,
    postal_code: comp.postal_code,
    phone: p.formatted_phone_number || null,
    phone_intl: p.international_phone_number || null,
    website: p.website || null,
    email: null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    review_count: typeof p.user_ratings_total === 'number' ? p.user_ratings_total : p.rating ? null : 0,
    hours: p.opening_hours?.weekday_text || null,
    description: null,
    business_status: p.business_status || null,
    source_url: p.url || (p.place_id ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}` : null),
    lat: p.geometry?.location?.lat ?? null,
    lng: p.geometry?.location?.lng ?? null,
    raw_data: { enriched: !!(p.formatted_phone_number || p.website || p.address_components) },
  }
}

export const googlePlacesLegacy = {
  key: 'google_places_legacy',
  label: 'Google Places (legacy)',
  configured: () => !!googleKey(),
  // Legacy text search never includes phone/website; callers must enrich.
  needsEnrichment: true,

  async search({ textQuery, regionCode, bias, pageToken }) {
    const params = new URLSearchParams({ key: googleKey() })
    if (pageToken) {
      params.set('pagetoken', pageToken)
    } else {
      params.set('query', textQuery)
      params.set('language', 'en')
      if (regionCode) params.set('region', regionCode.toLowerCase())
      if (bias) {
        params.set('location', `${bias.lat},${bias.lng}`)
        params.set('radius', String(Math.min(50000, bias.radiusM)))
      }
    }
    let attempt = 0
    for (;;) {
      const { data } = await fetchJson(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`)
      // A fresh next_page_token needs a moment before Google accepts it.
      if (data.status === 'INVALID_REQUEST' && pageToken && attempt < 3) {
        attempt++
        await sleep(1500)
        continue
      }
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw legacyError(data)
      return {
        items: (data.results || []).map(normalizeLegacy),
        nextPageToken: data.next_page_token || null,
        nextPageDelayMs: 2000,
        requests: [{ kind: 'search' }],
      }
    }
  },

  async details(providerId) {
    const params = new URLSearchParams({
      key: googleKey(),
      place_id: providerId,
      language: 'en',
      fields: [
        'place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'formatted_phone_number',
        'international_phone_number', 'website', 'url', 'opening_hours', 'business_status', 'rating',
        'user_ratings_total', 'types',
      ].join(','),
    })
    const { data } = await fetchJson(`https://maps.googleapis.com/maps/api/place/details/json?${params}`)
    if (data.status !== 'OK') throw legacyError(data)
    return { item: normalizeLegacy(data.result || {}), requests: [{ kind: 'details' }] }
  },

  async geocode(text, regionCode) {
    const params = new URLSearchParams({ key: googleKey(), query: text, language: 'en' })
    if (regionCode) params.set('region', regionCode.toLowerCase())
    const { data } = await fetchJson(`https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`)
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw legacyError(data)
    const loc = data.results?.[0]?.geometry?.location
    return { point: loc ? { lat: loc.lat, lng: loc.lng } : null, requests: [{ kind: 'geocode' }] }
  },
}

// ---------------------------------------------------------------------------
// Manual (user-provided) businesses
// ---------------------------------------------------------------------------

export function manualBusiness(input, idHash) {
  const clean = (v, max = 300) => {
    const s = String(v ?? '').trim()
    return s ? s.slice(0, max) : null
  }
  let website = clean(input.website, 500)
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`
  return {
    provider: 'manual',
    provider_id: idHash,
    business_name: clean(input.business_name, 200) || 'Unnamed business',
    category: clean(input.category, 100),
    types: [],
    address: clean(input.address),
    city: clean(input.city, 120),
    region: clean(input.region, 120),
    country: clean(input.country, 120),
    country_code: clean(input.country_code, 2),
    postal_code: clean(input.postal_code, 20),
    phone: clean(input.phone, 40),
    phone_intl: null,
    website,
    email: clean(input.email, 200),
    rating: input.rating === '' || input.rating === undefined || input.rating === null ? null : Number(input.rating),
    review_count: input.review_count === '' || input.review_count === undefined || input.review_count === null ? null : Number(input.review_count),
    hours: null,
    description: clean(input.description, 1000),
    business_status: null,
    source_url: null,
    lat: null,
    lng: null,
    raw_data: { entered_manually: true },
  }
}

export const PROVIDERS = {
  google_places: googlePlacesNew,
  google_places_legacy: googlePlacesLegacy,
}

export function providerStatus() {
  return [
    { key: 'google_places', label: 'Google Places (New)', configured: googlePlacesNew.configured() },
    { key: 'google_places_legacy', label: 'Google Places (legacy fallback)', configured: googlePlacesLegacy.configured() },
    { key: 'manual', label: 'Manual entry', configured: true },
  ]
}
