import { RotateCcw } from 'lucide-react'
import { Button, Pill, NA } from './ui'
import { S } from './shared'
import { fmtDate, fmtDateTime, fmtCost } from '../../lib/intelApi'

const PROVIDER = { google_places: 'Google Places', google_places_legacy: 'Google Places (legacy)', manual: 'Manual' }

function criteriaSummary(s, catalog) {
  const f = s.filters || {}
  const parts = []
  if (f.min_reviews) parts.push(`${f.min_reviews}+ reviews`)
  if (f.max_reviews) parts.push(`≤ ${f.max_reviews} reviews`)
  if (f.min_rating) parts.push(`${f.min_rating}+ rating`)
  if (f.max_rating) parts.push(`≤ ${f.max_rating} rating`)
  if (f.website && f.website !== 'any') parts.push(f.website === 'none' ? 'No website' : 'Has website')
  if (f.website_quality && f.website_quality !== 'any') parts.push({ poor_or_none: 'Poor/no website', needs_improvement: 'Needs improvement', good: 'Good website' }[f.website_quality])
  if (f.booking && f.booking !== 'any') parts.push(f.booking === 'none' ? 'No booking' : 'Has booking')
  if (s.radius_km) parts.push(`${s.radius_km} km radius`)
  const where = [s.postal_code || s.city, s.region, s.country].filter(Boolean).join(', ')
  const what = (s.industries || []).map((k) => catalog.industries.find((i) => i.key === k)?.label || k).join(', ') || s.custom_term
  return { where, what, filters: parts }
}

export default function HistoryTab({ searches, loading, catalog, onReopen, isMobile }) {
  if (loading) return <div style={{ ...S.card, textAlign: 'center', ...S.muted, fontSize: 13 }}>Loading search history…</div>
  if (!searches.length) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '3rem 1.5rem', ...S.muted, fontSize: 13 }}>
        No searches yet. Your discovery searches will appear here so you can reopen them any time.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {searches.map((s) => {
        const c = criteriaSummary(s, catalog)
        return (
          <div key={s.id} style={{ ...S.card, padding: 16, display: 'flex', gap: 14, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                {c.what} <span style={S.muted}>· {c.where || 'Anywhere'}</span>
              </div>
              <div style={{ fontSize: 12, ...S.muted, marginTop: 3 }}>
                {fmtDate(s.created_at)} · {fmtDateTime(s.created_at).split(', ').pop()} · {PROVIDER[s.provider] || s.provider || 'Provider n/a'}
                {s.user_name ? ` · ${s.user_name}` : ''}
              </div>
              {c.filters.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {c.filters.map((f) => (
                    <Pill key={f}>{f}</Pill>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <Stat label="Found" value={s.result_count} />
              <Stat label="New" value={s.new_count} />
              <Stat label="Added" value={s.added_count} />
              <Stat label="Requests" value={s.request_count} />
              <Stat label="Est. cost" value={fmtCost(s.est_cost)} raw />
              <Pill strong={s.status === 'complete'} style={s.status === 'failed' ? { color: '#FF6B6B', borderColor: 'rgba(255,68,68,0.3)' } : undefined}>
                {s.status === 'complete' ? 'Complete' : s.status === 'failed' ? 'Failed' : 'Running'}
              </Pill>
              <Button small onClick={() => onReopen(s)} disabled={s.status !== 'complete' || !s.result_count}>
                <RotateCcw size={12} /> Reopen
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value, raw }) {
  return (
    <div style={{ textAlign: 'right', minWidth: 44 }}>
      <div style={{ fontSize: 15, fontWeight: 650, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{value === null || value === undefined ? <NA>–</NA> : raw ? value : Number(value).toLocaleString('en-US')}</div>
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}
