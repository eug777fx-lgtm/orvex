// ============================================================================
// Lead Intelligence — pure domain logic (no I/O).
//
// Catalogs (markets, industries), default settings, normalization,
// deduplication keys, opportunity analysis, Lead Intelligence Score,
// pricing and package recommendation.
//
// Everything here is deterministic and unit-testable. Nothing in this file
// invents business data: every statement is derived from a provider field or
// a website-analysis signal, and unknowns stay unknown.
// ============================================================================

// ---------------------------------------------------------------------------
// Markets
// ---------------------------------------------------------------------------

export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }))

export const CARIBBEAN_COUNTRIES = [
  ['AW', 'Aruba'], ['CW', 'Curaçao'], ['BQ', 'Bonaire'], ['SX', 'Sint Maarten'], ['MF', 'Saint Martin'],
  ['PR', 'Puerto Rico'], ['DO', 'Dominican Republic'], ['JM', 'Jamaica'], ['BS', 'Bahamas'],
  ['BB', 'Barbados'], ['TT', 'Trinidad and Tobago'], ['KY', 'Cayman Islands'],
  ['TC', 'Turks and Caicos Islands'], ['VI', 'U.S. Virgin Islands'], ['VG', 'British Virgin Islands'],
  ['LC', 'Saint Lucia'], ['AG', 'Antigua and Barbuda'], ['GD', 'Grenada'], ['KN', 'Saint Kitts and Nevis'],
  ['VC', 'Saint Vincent and the Grenadines'], ['DM', 'Dominica'], ['AI', 'Anguilla'], ['BM', 'Bermuda'],
  ['GP', 'Guadeloupe'], ['MQ', 'Martinique'], ['HT', 'Haiti'],
].map(([code, name]) => ({ code, name }))

export const MARKETS = [
  {
    key: 'US',
    label: 'United States',
    countryCode: 'US',
    country: 'United States',
    regionLabel: 'State',
    regions: US_STATES,
    supportsPostal: true,
    supportsRadius: true,
  },
  {
    key: 'AW',
    label: 'Aruba',
    countryCode: 'AW',
    country: 'Aruba',
    cities: ['Oranjestad', 'San Nicolas', 'Noord', 'Santa Cruz', 'Paradera', 'Savaneta', 'Palm Beach', 'Eagle Beach'],
    supportsRadius: true,
  },
  {
    key: 'CW',
    label: 'Curaçao',
    countryCode: 'CW',
    country: 'Curaçao',
    cities: ['Willemstad', 'Jan Thiel', 'Sint Michiel', 'Barber', 'Westpunt'],
    supportsRadius: true,
  },
  {
    key: 'BQ',
    label: 'Bonaire',
    countryCode: 'BQ',
    country: 'Bonaire',
    cities: ['Kralendijk', 'Rincon', 'Antriol', 'Nikiboko'],
    supportsRadius: true,
  },
  {
    key: 'CARIBBEAN',
    label: 'Caribbean',
    countries: CARIBBEAN_COUNTRIES,
    regionLabel: 'Region / Parish',
    supportsRadius: true,
  },
  {
    key: 'INTL',
    label: 'International',
    freeCountry: true,
    regionLabel: 'State / Province / Region',
    supportsPostal: true,
    supportsRadius: true,
  },
]

export const marketByKey = (k) => MARKETS.find((m) => m.key === k) || null

// ---------------------------------------------------------------------------
// Industries
//   booking: how appointment-driven the business model is (0..1)
//   crm:     how lead-heavy / follow-up driven the business is (0..1)
//   ecom:    how naturally online sales/ordering fit (0..1)
// ---------------------------------------------------------------------------

const I = (key, label, group, query, booking, crm, ecom = 0.1) => ({ key, label, group, query, booking, crm, ecom })

export const INDUSTRY_GROUPS = [
  { key: 'home_services', label: 'Home Services' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'automotive', label: 'Automotive' },
  { key: 'health_fitness', label: 'Health & Fitness' },
  { key: 'professional', label: 'Professional Services' },
  { key: 'hospitality', label: 'Hospitality / Food' },
]

export const INDUSTRIES = [
  I('plumbing', 'Plumbing', 'home_services', 'plumber', 0.6, 1),
  I('hvac', 'HVAC', 'home_services', 'HVAC air conditioning contractor', 0.6, 1),
  I('electrical', 'Electrical', 'home_services', 'electrician', 0.6, 1),
  I('roofing', 'Roofing', 'home_services', 'roofing contractor', 0.5, 1),
  I('landscaping', 'Landscaping', 'home_services', 'landscaping company', 0.6, 0.9),
  I('cleaning', 'Cleaning', 'home_services', 'cleaning service', 0.9, 0.9),
  I('pest_control', 'Pest Control', 'home_services', 'pest control service', 0.8, 0.9),
  I('pressure_washing', 'Pressure Washing', 'home_services', 'pressure washing service', 0.8, 0.9),
  I('painting', 'Painting', 'home_services', 'painting contractor', 0.5, 1),
  I('flooring', 'Flooring', 'home_services', 'flooring contractor', 0.5, 1),
  I('remodeling', 'Remodeling', 'home_services', 'remodeling contractor', 0.5, 1),
  I('handyman', 'Handyman', 'home_services', 'handyman service', 0.7, 0.9),
  I('garage_door', 'Garage Door', 'home_services', 'garage door repair', 0.6, 0.9),
  I('moving', 'Moving', 'home_services', 'moving company', 0.7, 1),

  I('barber', 'Barber', 'beauty', 'barber shop', 1, 0.5, 0.2),
  I('hair_salon', 'Hair Salon', 'beauty', 'hair salon', 1, 0.6, 0.3),
  I('nail_salon', 'Nail Salon', 'beauty', 'nail salon', 1, 0.5, 0.2),
  I('med_spa', 'Med Spa', 'beauty', 'med spa medical aesthetics', 1, 0.9, 0.3),
  I('tattoo', 'Tattoo', 'beauty', 'tattoo shop', 0.9, 0.6, 0.2),
  I('beauty_services', 'Beauty Services', 'beauty', 'beauty salon', 1, 0.6, 0.3),

  I('mechanic', 'Mechanic', 'automotive', 'auto repair shop', 0.7, 0.8),
  I('auto_detailing', 'Auto Detailing', 'automotive', 'auto detailing', 0.9, 0.7, 0.2),
  I('body_shop', 'Body Shop', 'automotive', 'auto body shop', 0.5, 0.8),
  I('tire_shop', 'Tire Shop', 'automotive', 'tire shop', 0.5, 0.6, 0.5),
  I('car_wash', 'Car Wash', 'automotive', 'car wash', 0.3, 0.4, 0.3),
  I('automotive_services', 'Automotive Services', 'automotive', 'automotive service', 0.6, 0.7),

  I('dentist', 'Dentist', 'health_fitness', 'dentist', 1, 0.7),
  I('chiropractor', 'Chiropractor', 'health_fitness', 'chiropractor', 1, 0.7),
  I('physical_therapy', 'Physical Therapy', 'health_fitness', 'physical therapy clinic', 1, 0.7),
  I('gym', 'Gym', 'health_fitness', 'gym fitness center', 0.6, 0.7, 0.5),
  I('personal_trainer', 'Personal Trainer', 'health_fitness', 'personal trainer', 1, 0.8, 0.4),
  I('wellness', 'Wellness', 'health_fitness', 'wellness center', 0.9, 0.7, 0.3),

  I('accounting', 'Accounting', 'professional', 'accounting firm', 0.6, 0.9),
  I('law', 'Law', 'professional', 'law firm attorney', 0.6, 0.9),
  I('insurance', 'Insurance', 'professional', 'insurance agency', 0.5, 1),
  I('consulting', 'Consulting', 'professional', 'business consulting firm', 0.6, 0.9),
  I('real_estate', 'Real Estate', 'professional', 'real estate agency', 0.5, 1),
  I('financial_services', 'Financial Services', 'professional', 'financial advisor', 0.6, 0.9),

  I('restaurant', 'Restaurant', 'hospitality', 'restaurant', 0.6, 0.3, 0.6),
  I('cafe', 'Cafe', 'hospitality', 'cafe coffee shop', 0.2, 0.2, 0.5),
  I('hotel', 'Hotel', 'hospitality', 'hotel', 1, 0.6, 0.3),
  I('catering', 'Catering', 'hospitality', 'catering service', 0.6, 0.9, 0.4),
]

export const industryByKey = (k) => INDUSTRIES.find((i) => i.key === k) || null

// Custom search terms get neutral fit values.
export const CUSTOM_INDUSTRY_FIT = { booking: 0.5, crm: 0.6, ecom: 0.2 }

export function industryFit(key) {
  const ind = industryByKey(key)
  return ind ? { booking: ind.booking, crm: ind.crm, ecom: ind.ecom } : { ...CUSTOM_INDUSTRY_FIT }
}

// ---------------------------------------------------------------------------
// Pricing items (labels are code; VALUES live in settings and are editable)
// ---------------------------------------------------------------------------

export const PRICE_ITEMS = [
  { key: 'landing_page', label: 'Landing Page', short: 'Landing Page', kind: 'website' },
  { key: 'business_website', label: 'Business Website', short: 'Website', kind: 'website' },
  { key: 'premium_website', label: 'Premium Website', short: 'Premium Website', kind: 'website' },
  { key: 'booking', label: 'Booking System', short: 'Booking', kind: 'addon' },
  { key: 'crm', label: 'CRM', short: 'CRM', kind: 'addon' },
  { key: 'automation', label: 'Automation', short: 'Automation', kind: 'addon' },
  { key: 'custom_dashboard', label: 'Custom Dashboard', short: 'Custom Dashboard', kind: 'addon' },
  { key: 'custom_software', label: 'Custom Software', short: 'Custom Software', kind: 'quote' },
]
export const priceItem = (k) => PRICE_ITEMS.find((p) => p.key === k)

// ---------------------------------------------------------------------------
// Default settings (stored in intel_settings; everything is editable)
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS = {
  version: 1,
  scoring: {
    max: { activity: 20, website: 25, booking: 15, crm: 15, automation: 15, confidence: 10 },
    high_opportunity_threshold: 70,
    review_saturation: 300, // reviews at which the activity volume factor maxes out
    unanalyzed_website_ratio: 0.35, // share of website points while a site is not yet analyzed
    stale_copyright_years: 3,
    slow_load_ms: 3000,
  },
  pricing: {
    USD: {
      landing_page: { low: 750, high: 1000 },
      business_website: { low: 1500, high: 2000 },
      premium_website: { low: 2500, high: 3500 },
      booking: { low: 300, high: 500 },
      crm: { low: 750, high: 1500 },
      automation: { low: 300, high: 1000 },
      custom_dashboard: { low: 1000, high: null },
      custom_software: { quote: true },
      management_monthly: 150,
    },
    // Starting AWG values (Afl.). Review and edit in Settings; no automatic
    // currency conversion is applied anywhere.
    AWG: {
      landing_page: { low: 1500, high: 1800 },
      business_website: { low: 2700, high: 3600 },
      premium_website: { low: 4500, high: 6300 },
      booking: { low: 550, high: 900 },
      crm: { low: 1350, high: 2700 },
      automation: { low: 550, high: 1800 },
      custom_dashboard: { low: 1800, high: null },
      custom_software: { quote: true },
      management_monthly: 150,
    },
  },
  currencies: ['USD', 'AWG'],
  timezone: 'America/Aruba', // defines "today" for dashboard + daily limits
  market_currency: { US: 'USD', AW: 'AWG', CW: 'USD', BQ: 'USD', CARIBBEAN: 'USD', INTL: 'USD' },
  limits: {
    max_searches_per_day: 40,
    max_results_per_search: 60,
    auto_analyze_count: 12,
    max_analyses_per_day: 300,
    max_industries_per_search: 3,
  },
  provider: {
    primary: 'google_places',
    allow_legacy_fallback: true,
    legacy_enrich_count: 15,
  },
  // Estimated USD cost per provider request. Estimates only; your Google Cloud
  // billing is the source of truth. Update if your pricing tier differs.
  provider_costs: {
    google_places: { search: 0.035, details: 0.025, geocode: 0.032 },
    google_places_legacy: { search: 0.032, details: 0.02, geocode: 0.005 },
    manual: { search: 0, details: 0, geocode: 0 },
  },
}

export function deepMerge(base, over) {
  if (Array.isArray(base) || Array.isArray(over)) return over === undefined ? base : over
  if (typeof base !== 'object' || base === null) return over === undefined ? base : over
  const out = { ...base }
  for (const k of Object.keys(over || {})) {
    const bv = base[k]
    const ov = over[k]
    out[k] = bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)
      ? deepMerge(bv, ov)
      : ov
  }
  return out
}

const num = (v, { min = -Infinity, max = Infinity, allowNull = false } = {}) => {
  if (v === null || v === '' || v === undefined) {
    if (allowNull) return null
    throw new Error('value required')
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`invalid number: ${v}`)
  return n
}

// Validates + normalizes a settings object coming from the admin UI.
export function sanitizeSettings(input) {
  const s = deepMerge(DEFAULT_SETTINGS, input || {})
  const out = deepMerge(DEFAULT_SETTINGS, {})
  for (const k of Object.keys(out.scoring.max)) out.scoring.max[k] = num(s.scoring.max[k], { min: 0, max: 100 })
  out.scoring.high_opportunity_threshold = num(s.scoring.high_opportunity_threshold, { min: 1, max: 100 })
  out.scoring.review_saturation = num(s.scoring.review_saturation, { min: 10, max: 100000 })
  out.scoring.unanalyzed_website_ratio = num(s.scoring.unanalyzed_website_ratio, { min: 0, max: 1 })
  out.scoring.stale_copyright_years = num(s.scoring.stale_copyright_years, { min: 1, max: 20 })
  out.scoring.slow_load_ms = num(s.scoring.slow_load_ms, { min: 500, max: 30000 })

  const currencies = Array.from(
    new Set((Array.isArray(s.currencies) ? s.currencies : ['USD']).map((c) => String(c).trim().toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c))),
  )
  if (!currencies.length) currencies.push('USD')
  out.currencies = currencies
  out.pricing = {}
  for (const cur of currencies) {
    const src = s.pricing?.[cur] || {}
    const table = {}
    for (const item of PRICE_ITEMS) {
      if (item.kind === 'quote') {
        table[item.key] = { quote: true }
        continue
      }
      const r = src[item.key] || {}
      const low = num(r.low ?? 0, { min: 0, max: 10_000_000 })
      const high = num(r.high, { min: 0, max: 10_000_000, allowNull: true })
      if (high !== null && high < low) throw new Error(`${cur} ${item.label}: high must be ≥ low`)
      table[item.key] = { low, high }
    }
    table.management_monthly = num(src.management_monthly ?? 0, { min: 0, max: 1_000_000 })
    out.pricing[cur] = table
  }
  const tz = String(s.timezone || 'America/Aruba')
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    out.timezone = tz
  } catch {
    throw new Error(`unknown timezone: ${tz}`)
  }
  out.market_currency = {}
  for (const m of MARKETS) {
    const c = String(s.market_currency?.[m.key] || 'USD').toUpperCase()
    out.market_currency[m.key] = currencies.includes(c) ? c : currencies[0]
  }
  out.limits = {
    max_searches_per_day: num(s.limits.max_searches_per_day, { min: 1, max: 1000 }),
    max_results_per_search: num(s.limits.max_results_per_search, { min: 20, max: 60 }),
    auto_analyze_count: num(s.limits.auto_analyze_count, { min: 0, max: 60 }),
    max_analyses_per_day: num(s.limits.max_analyses_per_day, { min: 0, max: 5000 }),
    max_industries_per_search: num(s.limits.max_industries_per_search, { min: 1, max: 5 }),
  }
  out.provider = {
    primary: ['google_places', 'google_places_legacy'].includes(s.provider?.primary) ? s.provider.primary : 'google_places',
    allow_legacy_fallback: s.provider?.allow_legacy_fallback !== false,
    legacy_enrich_count: num(s.provider?.legacy_enrich_count ?? 15, { min: 0, max: 60 }),
  }
  out.provider_costs = {}
  for (const p of Object.keys(DEFAULT_SETTINGS.provider_costs)) {
    const c = s.provider_costs?.[p] || {}
    out.provider_costs[p] = {
      search: num(c.search ?? 0, { min: 0, max: 10 }),
      details: num(c.details ?? 0, { min: 0, max: 10 }),
      geocode: num(c.geocode ?? 0, { min: 0, max: 10 }),
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Built-in search presets (users can add their own)
// ---------------------------------------------------------------------------

export const BUILTIN_PRESETS = [
  {
    key: 'us_home_services',
    name: 'US Home Services',
    criteria: {
      market: 'US',
      industries: ['plumbing', 'hvac', 'roofing'],
      filters: { min_reviews: 30, min_rating: 4.0, website_quality: 'poor_or_none', open_only: true },
    },
  },
  {
    key: 'us_no_website',
    name: 'US Businesses Without Websites',
    criteria: { market: 'US', filters: { website: 'none', open_only: true } },
  },
  {
    key: 'no_booking',
    name: 'Businesses Without Booking',
    criteria: { filters: { website: 'has', booking: 'none', open_only: true } },
  },
  {
    key: 'high_opportunity',
    name: 'High Opportunity Businesses',
    criteria: {
      filters: { min_reviews: 50, min_rating: 4.0, website_quality: 'poor_or_none', booking: 'none', open_only: true },
    },
  },
  {
    key: 'aruba',
    name: 'Aruba Businesses',
    criteria: { market: 'AW', filters: { open_only: true } },
  },
]

// ---------------------------------------------------------------------------
// Normalization + dedupe keys
// ---------------------------------------------------------------------------

const LEGAL_SUFFIXES = new Set([
  'llc', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited', 'the',
  'nv', 'bv', 'vof', 'pllc', 'pc', 'lp', 'llp', 'sa', 'srl',
])

export function stripAccents(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function normalizeName(name) {
  const words = stripAccents(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !LEGAL_SUFFIXES.has(w))
  return words.join(' ')
}

export function phoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '')
}

// Canonical key: last 10 digits (US numbers drop the leading 1; international
// numbers keep country code + subscriber digits up to 10).
export function phoneKey(phone) {
  const d = phoneDigits(phone)
  if (d.length < 7) return null
  return d.length > 10 ? d.slice(-10) : d
}

// Two phone numbers match when the shorter (≥7 digits) is a suffix of the
// longer one. Handles "+297 582 1234" vs "582-1234" and "+1 (813) ..." vs "813...".
export function phonesMatch(a, b) {
  const x = phoneDigits(a)
  const y = phoneDigits(b)
  if (x.length < 7 || y.length < 7) return false
  const [s, l] = x.length <= y.length ? [x, y] : [y, x]
  return l.endsWith(s)
}

const SHARED_HOSTS = [
  'facebook.com', 'fb.com', 'instagram.com', 'linktr.ee', 'linkedin.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com', 'yelp.com', 'google.com', 'goo.gl', 'g.page', 'maps.app.goo.gl',
  'wa.me', 'whatsapp.com', 'booksy.com', 'vagaro.com', 'fresha.com', 'square.site', 'squareup.com',
  'nextdoor.com', 'angi.com', 'homeadvisor.com', 'thumbtack.com', 'bbb.org', 'yellowpages.com',
]
const SOCIAL_HOSTS = ['facebook.com', 'fb.com', 'instagram.com', 'linktr.ee', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'wa.me', 'whatsapp.com']

export function hostOf(url) {
  if (!url || typeof url !== 'string' || !url.trim()) return null
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    const h = u.hostname.toLowerCase().replace(/^www\./, '')
    return h.includes('.') ? h : null
  } catch {
    return null
  }
}

const hostIs = (host, list) => !!host && list.some((h) => host === h || host.endsWith(`.${h}`))

// Domain dedupe key. Shared platforms (Facebook pages, Booksy profiles…) are
// not unique per business, so they never act as a dedupe key.
export function domainKey(url) {
  const h = hostOf(url)
  if (!h || hostIs(h, SHARED_HOSTS)) return null
  return h
}

export const isSocialUrl = (url) => hostIs(hostOf(url), SOCIAL_HOSTS)

const ADDRESS_ABBR = [
  [/\bstreet\b/g, 'st'], [/\bavenue\b/g, 'ave'], [/\broad\b/g, 'rd'], [/\bboulevard\b/g, 'blvd'],
  [/\bdrive\b/g, 'dr'], [/\bsuite\b/g, 'ste'], [/\blane\b/g, 'ln'], [/\bhighway\b/g, 'hwy'],
  [/\bparkway\b/g, 'pkwy'], [/\bcourt\b/g, 'ct'], [/\bplace\b/g, 'pl'], [/\bnorth\b/g, 'n'],
  [/\bsouth\b/g, 's'], [/\beast\b/g, 'e'], [/\bwest\b/g, 'w'], [/\bunit\b/g, 'ste'], [/#/g, ' ste '],
]

export function normalizeAddress(addr) {
  let s = stripAccents(addr).toLowerCase()
  for (const [re, rep] of ADDRESS_ABBR) s = s.replace(re, rep)
  return s.replace(/[^a-z0-9]+/g, ' ').trim()
}

// Street-level address key: first address segment (before the first comma),
// normalized. Pure service-area businesses often have no street address.
export function addressKey(addr) {
  const firstSeg = String(addr || '').split(',')[0]
  const k = normalizeAddress(firstSeg)
  return k && /\d/.test(k) ? k : null
}

export function dedupeKeys(b) {
  return {
    name_key: normalizeName(b.business_name) || null,
    phone_key: phoneKey(b.phone_intl || b.phone),
    domain: domainKey(b.website),
    addr_key: addressKey(b.address),
  }
}

// Are two normalized business records the same business?
export function sameBusiness(a, b) {
  if (a.provider && a.provider === b.provider && a.provider_id && a.provider_id === b.provider_id) return true
  const ka = a._keys || dedupeKeys(a)
  const kb = b._keys || dedupeKeys(b)
  if (ka.domain && ka.domain === kb.domain) return true
  if ((a.phone_intl || a.phone) && (b.phone_intl || b.phone) && phonesMatch(a.phone_intl || a.phone, b.phone_intl || b.phone)) {
    // Shared call-center numbers exist; require a loose name match too.
    return namesOverlap(ka.name_key, kb.name_key)
  }
  if (ka.name_key && ka.name_key === kb.name_key && ka.addr_key && ka.addr_key === kb.addr_key) return true
  return false
}

export function namesOverlap(a, b) {
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const A = new Set(a.split(' ').filter((w) => w.length > 2))
  const B = new Set(b.split(' ').filter((w) => w.length > 2))
  if (!A.size || !B.size) return false
  let inter = 0
  for (const w of A) if (B.has(w)) inter++
  return inter / Math.min(A.size, B.size) >= 0.5
}

// In-memory dedupe of a list (keeps the first, merges missing fields from
// later duplicates). Returns { items, duplicates }.
export function dedupeList(list) {
  const out = []
  let duplicates = 0
  for (const raw of list) {
    const b = { ...raw, _keys: dedupeKeys(raw) }
    const hit = out.find((x) => sameBusiness(x, b))
    if (hit) {
      duplicates++
      for (const [k, v] of Object.entries(b)) {
        if ((hit[k] === null || hit[k] === undefined || hit[k] === '') && v !== null && v !== undefined && v !== '') hit[k] = v
      }
      continue
    }
    out.push(b)
  }
  return { items: out, duplicates }
}

// Match a discovered business against existing CRM leads (rows from `leads`).
export function findLeadMatch(b, leads) {
  const keys = b._keys || dedupeKeys(b)
  for (const l of leads || []) {
    const lName = normalizeName(l.company_name)
    const lDomain = domainKey(l.website_url)
    if (keys.domain && lDomain && keys.domain === lDomain) return { lead: l, reason: 'Same website domain' }
    if ((b.phone || b.phone_intl) && l.phone && phonesMatch(b.phone_intl || b.phone, l.phone)) {
      return { lead: l, reason: 'Same phone number' }
    }
    if (keys.name_key && lName && keys.name_key === lName) {
      const loc = normalizeAddress(l.location || '')
      const city = normalizeAddress(b.city || '')
      if (!loc || !city || loc.includes(city) || (keys.addr_key && loc.includes(keys.addr_key))) {
        return { lead: l, reason: 'Same business name and location' }
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Search filters (cheap, provider-level). Website-dependent filters are applied
// by the UI once analysis is known, and "unknown" is never treated as "no".
// ---------------------------------------------------------------------------

export function passesBaseFilters(b, f = {}) {
  const reasons = []
  const reviews = b.review_count ?? null
  const rating = b.rating ?? null
  if (f.open_only !== false && b.business_status && b.business_status !== 'OPERATIONAL') reasons.push('not operational')
  if (num0(f.min_reviews) > 0 && (reviews === null || reviews < Number(f.min_reviews))) reasons.push('reviews below minimum')
  if (f.max_reviews !== undefined && f.max_reviews !== null && f.max_reviews !== '' && reviews !== null && reviews > Number(f.max_reviews)) reasons.push('reviews above maximum')
  if (num0(f.min_rating) > 0 && (rating === null || rating < Number(f.min_rating))) reasons.push('rating below minimum')
  if (f.max_rating !== undefined && f.max_rating !== null && f.max_rating !== '' && rating !== null && rating > Number(f.max_rating)) reasons.push('rating above maximum')
  const websiteUnknown = !b.website && b.raw_data?.enriched === false
  if (!websiteUnknown) {
    if (f.website === 'has' && !b.website) reasons.push('no website listed')
    if (f.website === 'none' && b.website && !isSocialUrl(b.website)) reasons.push('has website')
  }
  return { ok: reasons.length === 0, reasons }
}
const num0 = (v) => (v === undefined || v === null || v === '' ? 0 : Number(v) || 0)

export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ---------------------------------------------------------------------------
// Opportunity analysis
//   status vocabulary for detections: 'detected' | 'not_detected' | 'unknown'
// ---------------------------------------------------------------------------

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const level = (f) => (f >= 0.7 ? 'strong' : f >= 0.4 ? 'moderate' : f > 0.05 ? 'low' : 'none')
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

// Derives the website state from the provider record + (optional) analysis row.
export function websiteState(b, a) {
  // Legacy-provider results arrive without website/phone until enriched.
  if (!b.website && b.raw_data?.enriched === false) return 'not_enriched'
  if (!b.website) return 'none_listed'
  if (isSocialUrl(b.website)) return 'social_only'
  if (!a || !a.website_status || a.website_status === 'not_analyzed') return 'not_analyzed'
  return a.website_status // reachable | unreachable | blocked_robots | social_only | none_listed
}

// Individual website checks (pass/fail/unknown) for the detail view.
export function websiteChecks(b, a, settings = DEFAULT_SETTINGS) {
  const st = websiteState(b, a)
  if (st !== 'reachable') return []
  const s = a.website_signals || {}
  const year = new Date().getUTCFullYear()
  const staleYears = settings.scoring?.stale_copyright_years ?? 3
  const slow = settings.scoring?.slow_load_ms ?? 3000
  const checks = [
    { key: 'https', label: 'Served over HTTPS', pass: s.https === true, weight: 0.15, fail: 'Website is not served over HTTPS' },
    { key: 'viewport', label: 'Mobile viewport configured', pass: s.viewport === true, weight: 0.25, fail: 'No mobile viewport tag detected (weak mobile experience likely)' },
    { key: 'phone_cta', label: 'Click-to-call phone link', pass: s.phone_cta === true, weight: 0.1, fail: 'No click-to-call phone link detected' },
    { key: 'contact_form', label: 'Contact / lead form', pass: s.contact_form === true, weight: 0.15, fail: 'No contact or lead form detected on the homepage' },
    { key: 'title', label: 'Page title', pass: !!s.title, weight: 0.05, fail: 'Missing page title' },
    { key: 'meta_description', label: 'Meta description', pass: !!s.meta_description, weight: 0.05, fail: 'Missing meta description (basic SEO signal)' },
    {
      key: 'copyright',
      label: 'Recently updated footer',
      pass: s.copyright_year ? year - s.copyright_year < staleYears : null,
      weight: 0.1,
      fail: s.copyright_year ? `Footer copyright shows ${s.copyright_year} (possible outdated site)` : null,
    },
    {
      key: 'speed',
      label: 'Responds quickly',
      pass: typeof s.load_ms === 'number' ? s.load_ms <= slow : null,
      weight: 0.1,
      fail: typeof s.load_ms === 'number' ? `Homepage took ${(s.load_ms / 1000).toFixed(1)}s to load during analysis` : null,
    },
    {
      key: 'weight',
      label: 'Reasonable page size',
      pass: typeof s.html_bytes === 'number' ? s.html_bytes <= 1_500_000 : null,
      weight: 0.05,
      fail: 'Homepage HTML is very large (over 1.5 MB)',
    },
    {
      key: 'links',
      label: 'Internal links working',
      pass: typeof s.broken_links === 'number' ? s.broken_links === 0 : null,
      weight: 0.05,
      fail: s.broken_links ? `${plural(s.broken_links, 'internal link')} returned an error (of ${s.links_checked} checked)` : null,
    },
  ]
  return checks
}

export function analyzeOpportunities(b, a, settings = DEFAULT_SETTINGS) {
  const fit = industryFit(b.industry)
  const st = websiteState(b, a)
  const s = (a && a.website_signals) || {}
  const tech = (a && a.technology_data) || []
  const techIn = (cat) => tech.filter((t) => t.category === cat)
  const reviews = b.review_count ?? 0
  const rating = b.rating ?? null
  const sc = settings.scoring || DEFAULT_SETTINGS.scoring

  // ---- Business activity -------------------------------------------------
  const activity = { findings: [] }
  {
    const sat = sc.review_saturation || 300
    const vol = clamp01(Math.log10(reviews + 1) / Math.log10(sat + 1))
    const rat = rating === null ? 0 : rating >= 4.5 ? 1 : rating >= 4.0 ? 0.8 : rating >= 3.5 ? 0.5 : 0.25
    const op = b.business_status ? (b.business_status === 'OPERATIONAL' ? 1 : 0.2) : 0.6
    const hours = Array.isArray(b.hours) && b.hours.length ? 1 : 0
    activity.fraction = clamp01(0.6 * vol + 0.25 * rat + 0.1 * op + 0.05 * hours)
    if (b.review_count !== null && b.review_count !== undefined) {
      activity.findings.push(
        rating !== null
          ? `${plural(reviews, 'review')} at a ${rating.toFixed(1)} rating`
          : `${plural(reviews, 'review')}`,
      )
    } else activity.findings.push('Review data not available')
    if (reviews >= 100 && (rating ?? 0) >= 4) activity.findings.push('Established customer base')
    if (b.business_status === 'OPERATIONAL') activity.findings.push('Listed as operational')
    else if (b.business_status) activity.findings.push(`Listed as ${String(b.business_status).toLowerCase().replace(/_/g, ' ')}`)
  }

  // ---- Website -------------------------------------------------------------
  const website = { findings: [], state: st }
  if (st === 'none_listed') {
    website.fraction = 1
    website.findings.push('No website listed on the business profile')
  } else if (st === 'social_only') {
    website.fraction = 0.9
    website.findings.push('Listed website is a social media page, not a standalone website')
  } else if (st === 'unreachable') {
    website.fraction = 0.8
    website.findings.push(`Listed website did not load during analysis${a?.error ? ` (${a.error})` : ''}`)
  } else if (st === 'blocked_robots') {
    website.fraction = sc.unanalyzed_website_ratio
    website.findings.push("The site's robots.txt does not permit automated analysis, so it was not analyzed")
  } else if (st === 'not_analyzed') {
    website.fraction = sc.unanalyzed_website_ratio
    website.findings.push('Website listed, not analyzed yet')
  } else if (st === 'not_enriched') {
    website.fraction = sc.unanalyzed_website_ratio
    website.findings.push('Website and phone not loaded yet (use Refresh data to check)')
  } else {
    let f = 0
    for (const c of websiteChecks(b, a, settings)) {
      if (c.pass === false) {
        f += c.weight
        if (c.fail) website.findings.push(c.fail)
      }
    }
    website.fraction = clamp01(f)
    if (!website.findings.length) website.findings.push('No significant website issues detected by automated checks')
  }
  website.quality = websiteQuality(st, website.fraction, s, a?.booking_status)

  // ---- Booking -------------------------------------------------------------
  const booking = { findings: [] }
  const bookingStatus = st === 'none_listed' || st === 'social_only' ? 'not_detected' : a?.booking_status || 'unknown'
  booking.status = bookingStatus
  if (bookingStatus === 'detected') {
    booking.fraction = 0
    const names = techIn('booking').map((t) => t.name)
    booking.findings.push(`Online booking detected${names.length ? `: ${names.join(', ')}` : ''}`)
  } else if (bookingStatus === 'not_detected') {
    booking.fraction = fit.booking
    booking.findings.push(
      st === 'none_listed' || st === 'social_only'
        ? 'No online booking found (no standalone website)'
        : 'No online booking detected on the website',
    )
    if (fit.booking >= 0.8) booking.findings.push('Appointment-based business model')
  } else {
    booking.fraction = fit.booking * 0.5
    booking.findings.push('Booking status unknown (website not analyzed)')
  }

  // ---- CRM -----------------------------------------------------------------
  const crm = { findings: [] }
  {
    const volume = clamp01(reviews / 150)
    const base = fit.crm * (0.5 + 0.5 * volume)
    const crmTools = [...techIn('crm'), ...techIn('field_service')]
    if (crmTools.length) {
      crm.fraction = base * 0.2
      crm.findings.push(`CRM / customer-management tool detected: ${crmTools.map((t) => t.name).join(', ')}`)
      crm.status = 'detected'
    } else if (st === 'none_listed' || st === 'social_only') {
      crm.fraction = base * 0.8
      crm.findings.push('No CRM publicly detectable; leads likely arrive by phone or walk-in')
      crm.status = 'not_detected'
    } else if (st === 'reachable') {
      crm.fraction = base * (s.contact_form ? 1 : 0.85)
      crm.findings.push(
        s.contact_form
          ? 'Website lead form found; no CRM detected from publicly observable information'
          : 'No CRM detected from publicly observable information',
      )
      crm.status = 'not_detected'
    } else {
      crm.fraction = base * 0.5
      crm.findings.push('CRM not publicly detectable yet (website not analyzed)')
      crm.status = 'unknown'
    }
    if (fit.crm >= 0.9) crm.findings.push('Lead-driven business: quotes and follow-ups are central to sales')
    if (reviews >= 150) crm.findings.push('High customer volume')
  }

  // ---- Automation ----------------------------------------------------------
  const automation = { findings: [] }
  if (st === 'reachable') {
    let f = 0
    const chat = techIn('chat')
    const email = techIn('email_marketing')
    if (a?.booking_status === 'not_detected') { f += 0.3; automation.findings.push('Booking/contact flow appears manual (no scheduling tool detected)') }
    if (!chat.length) { f += 0.2; automation.findings.push('No live chat or messaging widget detected') }
    if (!s.contact_form) { f += 0.2; automation.findings.push('No web form; inquiries depend on phone or email') }
    const channels = [s.phone_cta, s.email_cta, s.contact_form, Object.keys(s.social || {}).length > 0, chat.length > 0].filter(Boolean).length
    if (channels >= 3) { f += 0.2; automation.findings.push(`${channels} separate contact channels to monitor`) }
    if (!email.length && !techIn('crm').length) { f += 0.1; automation.findings.push('No automated follow-up / email tool detected') }
    automation.fraction = clamp01(f * (0.6 + 0.4 * fit.crm))
  } else if (st === 'none_listed' || st === 'social_only') {
    // Mostly already counted under Website; keep this moderate to avoid double counting.
    automation.fraction = clamp01(0.45 * (0.6 + 0.4 * fit.crm))
    automation.findings.push('No website-based intake; inquiries appear to be handled manually')
  } else {
    automation.fraction = 0.4 * (0.6 + 0.4 * fit.crm)
    automation.findings.push('Automation opportunity not yet assessed (website not analyzed)')
  }

  // ---- E-commerce (tag only) ----------------------------------------------
  const ecommerce = { findings: [] }
  {
    const shop = [...techIn('ecommerce'), ...techIn('ordering')]
    if (shop.length) {
      ecommerce.fraction = 0
      ecommerce.findings.push(`Online sales/ordering detected: ${shop.map((t) => t.name).join(', ')}`)
    } else if (fit.ecom >= 0.5 && (st === 'reachable' || st === 'none_listed' || st === 'social_only')) {
      ecommerce.fraction = fit.ecom
      ecommerce.findings.push('No online ordering or store detected for a business type where it is common')
    } else ecommerce.fraction = 0
  }

  // ---- Custom software (tag only, only with a clear reason) ----------------
  const custom = { findings: [], fraction: 0 }
  if (reviews >= 500 && fit.crm >= 0.7 && (rating ?? 0) >= 4) {
    custom.fraction = 0.6
    custom.findings.push(`Very high customer volume (${reviews} reviews) may justify a custom operations dashboard`)
  }

  // ---- Data confidence -----------------------------------------------------
  const confidence = { findings: [] }
  {
    let f = 0
    if (b.phone || b.phone_intl) f += 0.3
    else confidence.findings.push('Phone not available')
    if (b.address || b.city) f += 0.2
    if (b.rating !== null && b.rating !== undefined) f += 0.2
    if (st === 'none_listed' || st === 'reachable' || st === 'unreachable') f += 0.2
    else confidence.findings.push('Website not verified')
    if (Array.isArray(b.hours) && b.hours.length) f += 0.1
    confidence.fraction = clamp01(f)
    if (f >= 0.8) confidence.findings.unshift('Business data is fairly complete')
  }

  for (const o of [activity, website, booking, crm, automation, ecommerce, custom, confidence]) o.level = level(o.fraction)
  return { activity, website, booking, crm, automation, ecommerce, custom, confidence }
}

export function websiteQuality(state, websiteFraction, signals = {}, bookingStatus = 'unknown') {
  if (state === 'none_listed') return 'none'
  if (state === 'social_only') return 'social_only'
  if (state === 'unreachable') return 'unreachable'
  if (state !== 'reachable') return 'unknown'
  if (websiteFraction >= 0.4) return 'needs_improvement'
  if (!signals.contact_form && bookingStatus !== 'detected') return 'limited_conversion'
  if (websiteFraction >= 0.2) return 'adequate'
  return 'strong'
}

export const WEBSITE_QUALITY_LABEL = {
  none: 'No website listed',
  social_only: 'Social page only',
  unreachable: 'Website not loading',
  needs_improvement: 'Needs improvement',
  limited_conversion: 'Limited conversion functionality',
  adequate: 'Adequate',
  strong: 'Strong',
  unknown: 'Not analyzed',
}

// ---------------------------------------------------------------------------
// Lead Intelligence Score (0–100, transparent components)
// ---------------------------------------------------------------------------

export function computeScore(opps, settings = DEFAULT_SETTINGS) {
  const max = settings.scoring?.max || DEFAULT_SETTINGS.scoring.max
  const parts = {
    activity: opps.activity.fraction * max.activity,
    website: opps.website.fraction * max.website,
    booking: opps.booking.fraction * max.booking,
    crm: opps.crm.fraction * max.crm,
    automation: opps.automation.fraction * max.automation,
    confidence: opps.confidence.fraction * max.confidence,
  }
  const totalMax = Object.values(max).reduce((a, b) => a + Number(b || 0), 0) || 100
  const raw = Object.values(parts).reduce((a, b) => a + b, 0)
  const score = Math.round((raw / totalMax) * 100)
  const components = Object.fromEntries(
    Object.entries(parts).map(([k, v]) => [k, { points: Math.round(v * 10) / 10, max: max[k], findings: opps[k].findings }]),
  )
  return { score, components }
}

export function opportunityTags(b, opps, a) {
  const tags = []
  const st = opps.website.state
  if (st === 'none_listed') tags.push('No website')
  else if (st === 'social_only') tags.push('Social page only')
  else if (st === 'unreachable') tags.push('Website down')
  else if (opps.website.quality === 'needs_improvement') tags.push('Website needs improvement')
  else if (opps.website.quality === 'limited_conversion') tags.push('Limited conversion')
  if (opps.booking.status === 'not_detected' && opps.booking.fraction >= 0.5) tags.push('No booking detected')
  if (opps.crm.status !== 'detected' && opps.crm.level === 'strong') tags.push('CRM opportunity')
  if (opps.automation.level === 'strong') tags.push('Automation opportunity')
  if (opps.ecommerce.fraction >= 0.5) tags.push('Online ordering opportunity')
  if (opps.custom.fraction > 0) tags.push('Custom dashboard candidate')
  if ((b.review_count ?? 0) >= 100 && (b.rating ?? 0) >= 4) tags.push('Established')
  if (st === 'not_analyzed' || st === 'not_enriched' || (a && a.website_status === 'blocked_robots')) tags.push('Not analyzed')
  return tags
}

// ---------------------------------------------------------------------------
// Package recommendation + pricing
// ---------------------------------------------------------------------------

export function currencyForMarket(market, settings = DEFAULT_SETTINGS) {
  const c = settings.market_currency?.[market] || 'USD'
  return settings.pricing?.[c] ? c : Object.keys(settings.pricing || { USD: 1 })[0]
}

export function recommendPackage(b, opps, settings = DEFAULT_SETTINGS, currency = 'USD') {
  const table = settings.pricing?.[currency] || settings.pricing?.USD || DEFAULT_SETTINGS.pricing.USD
  const services = []
  const because = []
  const reviews = b.review_count ?? 0
  const rating = b.rating ?? 0
  const st = opps.website.state
  const established = reviews >= 100 && rating >= 4

  if (established) because.push(`an established customer base (${reviews} reviews${rating ? ` at ${rating.toFixed(1)}` : ''})`)

  // Website line
  if (st === 'none_listed' || st === 'social_only') {
    services.push(reviews < 15 && opps.crm.fraction < 0.5 ? 'landing_page' : 'business_website')
    because.push(st === 'none_listed' ? 'no website listed' : 'only a social media page instead of a website')
  } else if (st === 'unreachable') {
    services.push('business_website')
    because.push('a listed website that did not load')
  } else if (st === 'reachable' && opps.website.fraction >= 0.4) {
    services.push(established && reviews >= 300 ? 'premium_website' : 'business_website')
    because.push('a website with several improvement signals')
  } else if (st === 'reachable' && opps.website.quality === 'limited_conversion') {
    services.push('landing_page')
    because.push('a website with limited conversion functionality')
  }

  if (opps.booking.status !== 'detected' && opps.booking.fraction >= 0.6) {
    services.push('booking')
    because.push(opps.booking.status === 'not_detected' ? 'no online booking detected' : 'an appointment-based model with booking status unknown')
  }
  if (opps.crm.status !== 'detected' && opps.crm.fraction >= 0.6) {
    services.push('crm')
    because.push('lead volume with no CRM publicly detectable')
  }
  if (opps.automation.fraction >= 0.6) {
    services.push('automation')
    because.push('manual-looking intake and follow-up')
  }
  if (opps.custom.fraction > 0) {
    services.push('custom_dashboard')
    because.push('very high customer volume')
  }

  const lines = services.map((key) => {
    const item = priceItem(key)
    const p = table[key] || {}
    return { key, label: item.label, short: item.short, low: p.low ?? null, high: p.high ?? null, quote: !!p.quote }
  })
  const hasWebsite = lines.some((l) => priceItem(l.key).kind === 'website')
  const monthly = hasWebsite ? Number(table.management_monthly || 0) : 0

  let low = 0
  let high = 0
  let openEnded = false
  let quote = false
  for (const l of lines) {
    if (l.quote) { quote = true; continue }
    low += Number(l.low || 0)
    if (l.high === null || l.high === undefined) { openEnded = true; high += Number(l.low || 0) } else high += Number(l.high)
  }
  const suggested = lines.length ? Math.round((low + high) / 2 / 50) * 50 : 0

  let name = lines.map((l) => l.short).join(' + ')
  if (!lines.length) name = 'No clear package yet'

  const reasoning = lines.length
    ? `Recommended because this business has ${joinList(because)}.`
    : 'Available data does not show a clear need yet. Analyze the website or review manually.'

  return {
    package_name: name,
    services: lines,
    currency,
    price_low: lines.length ? low : null,
    price_high: lines.length ? high : null,
    open_ended: openEnded,
    quote_required: quote,
    suggested_price: lines.length ? suggested : null,
    monthly: monthly || null,
    reasoning,
  }
}

function joinList(arr) {
  if (arr.length <= 1) return arr.join('')
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`
}

// One-stop evaluation used everywhere (search, analyze, read).
export function evaluateBusiness(b, a, settings = DEFAULT_SETTINGS) {
  const opps = analyzeOpportunities(b, a, settings)
  const { score, components } = computeScore(opps, settings)
  const currency = currencyForMarket(b.market, settings)
  const pricing = recommendPackage(b, opps, settings, currency)
  return {
    score,
    components,
    high_opportunity: score >= (settings.scoring?.high_opportunity_threshold ?? 70),
    website_quality: opps.website.quality,
    website_state: opps.website.state,
    booking_status: opps.booking.status,
    crm_status: opps.crm.status || 'unknown',
    tags: opportunityTags(b, opps, a),
    opportunities: opps,
    pricing,
  }
}

// Website-dependent filters, applied once analysis is known. Returns
// 'pass' | 'fail' | 'unknown' so unknown results are never silently dropped.
export function analysisFilterState(evalResult, b, a, f = {}) {
  const results = []
  if (f.website_quality && f.website_quality !== 'any') {
    const q = evalResult.website_quality
    if (q === 'unknown') results.push('unknown')
    else if (f.website_quality === 'poor_or_none') results.push(['none', 'social_only', 'unreachable', 'needs_improvement', 'limited_conversion'].includes(q) ? 'pass' : 'fail')
    else if (f.website_quality === 'needs_improvement') results.push(['needs_improvement', 'limited_conversion', 'unreachable'].includes(q) ? 'pass' : 'fail')
    else if (f.website_quality === 'good') results.push(['adequate', 'strong'].includes(q) ? 'pass' : 'fail')
  }
  const tri = (status, want) => (status === 'unknown' ? 'unknown' : (status === 'detected') === (want === 'has') ? 'pass' : 'fail')
  if (f.booking && f.booking !== 'any') results.push(tri(evalResult.booking_status, f.booking))
  if (f.contact_form && f.contact_form !== 'any') {
    const st = evalResult.website_state === 'none_listed' || evalResult.website_state === 'social_only' ? 'not_detected' : a?.contact_form_status || 'unknown'
    results.push(tri(st, f.contact_form))
  }
  if (f.social && f.social !== 'any') {
    const has = Object.keys(b.social || {}).length > 0 || isSocialUrl(b.website)
    const st = has ? 'detected' : evalResult.website_state === 'reachable' ? 'not_detected' : 'unknown'
    results.push(tri(st, f.social))
  }
  if (results.includes('fail')) return 'fail'
  if (results.includes('unknown')) return 'unknown'
  return 'pass'
}
