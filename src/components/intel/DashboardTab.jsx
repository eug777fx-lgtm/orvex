import { NA } from './ui'
import { S } from './shared'
import { fmtCost } from '../../lib/intelApi'

function Tile({ label, value, sub }) {
  return (
    <div style={{ ...S.card, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginTop: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// Single-series horizontal bars (one hue, direct labels, per-bar tooltip).
function Funnel({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div role="table" aria-label="Discovery-sourced leads by pipeline stage" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r) => (
        <div key={r.label} role="row" title={`${r.label}: ${r.value}`} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', alignItems: 'center', gap: 10 }}>
          <span role="cell" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>{r.label}</span>
          <span role="cell" style={{ height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0, background: '#fff', borderRadius: 4 }} />
          </span>
          <span role="cell" style={{ fontSize: 13, color: '#fff', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function RankList({ title, rows, catalog, isIndustry }) {
  return (
    <div style={{ ...S.card }}>
      <div style={S.label}>{title}</div>
      {rows?.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r) => {
            const name = isIndustry ? catalog.industries.find((i) => i.label.toLowerCase() === r.key)?.label || r.key : r.key
            return (
              <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                <span style={{ color: '#fff', textTransform: isIndustry ? 'capitalize' : 'none' }}>{name}</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                  {Math.round((r.positive / r.added) * 100)}% positive · {r.added} leads{r.won ? ` · ${r.won} won` : ''}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, ...S.muted }}>Not enough data yet (needs at least 3 discovery-sourced leads per group).</div>
      )}
    </div>
  )
}

export default function DashboardTab({ data, loading, catalog, isMobile }) {
  if (loading && !data) return <div style={{ ...S.card, textAlign: 'center', ...S.muted, fontSize: 13 }}>Loading dashboard…</div>
  if (!data) return <div style={{ ...S.card, textAlign: 'center', ...S.muted, fontSize: 13 }}>Dashboard unavailable.</div>
  const t = data.today || {}
  const p = data.pipeline || {}
  const u = data.usage || {}
  const cols = isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(5, minmax(0,1fr))'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ ...S.label, marginBottom: 10 }}>Today's discovery</div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
          <Tile label="Businesses discovered" value={t.discovered ?? 0} />
          <Tile label="High-opportunity" value={t.high_opportunity ?? 0} sub={`Score ${data.threshold}+`} />
          <Tile label="Added to CRM" value={t.added ?? 0} />
          <Tile label="Contacted" value={t.contacted ?? 0} sub="Calls logged today" />
          <Tile label="Interested" value={t.interested ?? 0} sub="Positive call outcomes today" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: 12 }}>
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ ...S.label, marginBottom: 0 }}>Pipeline · discovery-sourced leads</div>
            <div style={{ fontSize: 12, ...S.muted }}>At or beyond each stage · {p.total ?? 0} total</div>
          </div>
          <Funnel
            rows={[
              { label: 'Discovered', value: p.total ?? 0 },
              { label: 'Contacted', value: p.contacted ?? 0 },
              { label: 'Interested', value: p.interested ?? 0 },
              { label: 'Demo sent', value: p.demo_sent ?? 0 },
              { label: 'Call scheduled', value: p.call_scheduled ?? 0 },
              { label: 'Proposal sent', value: p.proposal_sent ?? 0 },
              { label: 'Negotiation', value: p.negotiation ?? 0 },
              { label: 'Won', value: p.won ?? 0 },
            ]}
          />
          <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', flexWrap: 'wrap' }}>
            <span>Lost: {p.lost ?? 0}</span>
            <span>Do not contact: {p.do_not_contact ?? 0}</span>
            <span>Follow-ups due: {data.followups_due ?? 0}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Tile
            label="Conversion rate"
            value={data.conversion_rate === null || data.conversion_rate === undefined ? <NA>–</NA> : `${(data.conversion_rate * 100).toFixed(1)}%`}
            sub="Won ÷ discovery-sourced leads"
          />
          <div style={S.card}>
            <div style={S.label}>Usage today</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 13 }}>
              <span style={S.muted}>Searches</span>
              <span style={{ color: '#fff' }}>
                {u.searches ?? 0} / {u.limits?.max_searches_per_day ?? '–'}
              </span>
              <span style={S.muted}>Businesses returned</span>
              <span style={{ color: '#fff' }}>{u.businesses_returned ?? 0}</span>
              <span style={S.muted}>Provider requests</span>
              <span style={{ color: '#fff' }}>{(u.search_requests ?? 0) + (u.geocode_requests ?? 0)}</span>
              <span style={S.muted}>Enrichment requests</span>
              <span style={{ color: '#fff' }}>{u.details_requests ?? 0}</span>
              <span style={S.muted}>Website analyses</span>
              <span style={{ color: '#fff' }}>
                {u.website_analyses ?? 0} / {u.limits?.max_analyses_per_day ?? '–'}
              </span>
              <span style={S.muted}>Estimated provider cost</span>
              <span style={{ color: '#fff' }}>{fmtCost(u.est_cost)}</span>
              <span style={S.muted}>This month (est.)</span>
              <span style={{ color: '#fff' }}>{fmtCost(u.month_est_cost)}</span>
            </div>
            <div style={{ fontSize: 11, ...S.dim, marginTop: 10 }}>Estimates from the per-request costs in Settings. Your Google Cloud billing is the source of truth.</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <RankList title="Best-performing niche" rows={data.best_niches} catalog={catalog} isIndustry />
        <RankList title="Best-performing location" rows={data.best_locations} catalog={catalog} />
      </div>
    </div>
  )
}
