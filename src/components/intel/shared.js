// Non-component exports shared by the Lead Intelligence UI (kept separate so
// component files stay fast-refresh friendly).

export const S = {
  card: {
    background: 'rgba(17, 17, 17,0.55)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '1.25rem',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color: '#ffffff',
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  th: {
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '12px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
    whiteSpace: 'nowrap',
  },
  td: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    padding: '12px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    verticalAlign: 'top',
  },
  muted: { color: 'rgba(255,255,255,0.45)' },
  dim: { color: 'rgba(255,255,255,0.3)' },
  h2: { fontSize: '1.5rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', margin: 0 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 6 },
}

S.select = {
  ...S.input,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 30,
  cursor: 'pointer',
}

export function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => false)
  } catch {
    /* fall through */
  }
  return Promise.resolve(false)
}

export const EMPTY_FILTERS = {
  min_reviews: '',
  max_reviews: '',
  min_rating: '',
  max_rating: '',
  website: 'any',
  website_quality: 'any',
  booking: 'any',
  contact_form: 'any',
  social: 'any',
  open_only: true,
}

export const EMPTY_CRITERIA = {
  market: 'US',
  country_code: '',
  country: '',
  region: '',
  city: '',
  postal_code: '',
  radius_km: '',
  industries: [],
  custom_term: '',
  filters: EMPTY_FILTERS,
  max_results: 60,
  auto_analyze: true,
}

export function applyPreset(current, preset) {
  const c = preset.criteria || {}
  const next = { ...current }
  for (const k of ['market', 'country_code', 'country', 'region', 'city', 'postal_code', 'radius_km', 'custom_term']) {
    if (c[k] !== undefined) next[k] = c[k] ?? ''
  }
  if (c.market && c.market !== current.market) {
    for (const k of ['country_code', 'country', 'region', 'city', 'postal_code', 'radius_km']) if (c[k] === undefined) next[k] = ''
  }
  if (Array.isArray(c.industries) && c.industries.length) next.industries = c.industries
  next.filters = { ...EMPTY_FILTERS, ...(c.filters || {}) }
  for (const k of ['min_reviews', 'max_reviews', 'min_rating', 'max_rating']) {
    if (next.filters[k] === null || next.filters[k] === undefined) next.filters[k] = ''
  }
  return next
}

export const SORTS = [
  ['score', 'Lead Intelligence Score'],
  ['reviews', 'Reviews'],
  ['rating', 'Rating'],
  ['location', 'Location'],
  ['website', 'Website opportunity'],
  ['booking', 'Booking opportunity'],
  ['crm', 'CRM opportunity'],
  ['recent', 'Recently discovered'],
]

export function sortResults(list, key) {
  const pts = (b, k) => b.score_components?.[k]?.points ?? 0
  const cmp = {
    score: (a, b) => b.score - a.score || (b.review_count || 0) - (a.review_count || 0),
    reviews: (a, b) => (b.review_count ?? -1) - (a.review_count ?? -1),
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.review_count || 0) - (a.review_count || 0),
    location: (a, b) => `${a.region || ''}${a.city || ''}`.localeCompare(`${b.region || ''}${b.city || ''}`) || b.score - a.score,
    website: (a, b) => pts(b, 'website') - pts(a, 'website') || b.score - a.score,
    booking: (a, b) => pts(b, 'booking') - pts(a, 'booking') || b.score - a.score,
    crm: (a, b) => pts(b, 'crm') - pts(a, 'crm') || b.score - a.score,
    recent: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  }[key] || ((a, b) => b.score - a.score)
  return [...list].sort(cmp)
}

export const GLOBAL_CSS = `
@keyframes intel-spin { to { transform: rotate(360deg) } }
@keyframes intel-bar { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
.intel-row:hover td { background: rgba(255,255,255,0.025); }
.intel-scroll::-webkit-scrollbar { height: 8px; width: 8px }
.intel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 8px }
`
