import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Field, Pill, Spinner } from './ui'
import { S } from './shared'

const clone = (x) => JSON.parse(JSON.stringify(x))

const SCORE_LABELS = {
  activity: 'Business activity',
  website: 'Website opportunity',
  booking: 'Booking opportunity',
  crm: 'CRM opportunity',
  automation: 'Automation opportunity',
  confidence: 'Data confidence',
}

function NumInput({ value, onChange, disabled, placeholder, step, width = '100%' }) {
  return (
    <input
      style={{ ...S.input, width, padding: '7px 10px' }}
      inputMode="decimal"
      value={value === null || value === undefined ? '' : value}
      placeholder={placeholder}
      disabled={disabled}
      step={step}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d.]/g, '')
        onChange(v === '' ? null : v)
      }}
    />
  )
}

function Block({ title, children, note }) {
  return (
    <div style={S.card}>
      <div style={S.label}>{title}</div>
      {children}
      {note && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 10, lineHeight: 1.5 }}>{note}</div>}
    </div>
  )
}

export default function SettingsTab({ settings, defaults, catalog, providers, canEdit, onSave, isMobile }) {
  const [draft, setDraft] = useState(() => clone(settings))
  const [newCur, setNewCur] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const upd = (fn) =>
    setDraft((d) => {
      const n = clone(d)
      fn(n)
      return n
    })
  const totalMax = Object.values(draft.scoring.max).reduce((a, b) => a + Number(b || 0), 0)
  const disabled = !canEdit

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!canEdit && (
        <div style={{ ...S.card, fontSize: 13, ...S.muted }}>Settings are read-only for managers. An admin can change pricing, scoring and limits.</div>
      )}

      <Block
        title="Pricing engine"
        note="Internal starting values used for recommendations; every recommendation stays editable. No automatic currency conversion is applied: each currency has its own table. AWG values were seeded as starting points, please review them."
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${draft.currencies.length}, minmax(0,1fr))`, gap: 16 }}>
          {draft.currencies.map((cur) => (
            <div key={cur}>
              <div style={{ fontSize: 13, fontWeight: 650, color: '#fff', marginBottom: 8 }}>{cur}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, ...S.dim }}>Item</span>
                <span style={{ fontSize: 11, ...S.dim }}>Low</span>
                <span style={{ fontSize: 11, ...S.dim }}>High</span>
                {catalog.price_items.map((item) =>
                  item.kind === 'quote' ? (
                    <div key={item.key} style={{ display: 'contents' }}>
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>{item.label}</span>
                      <span style={{ gridColumn: 'span 2', fontSize: 12, ...S.muted }}>Custom quote</span>
                    </div>
                  ) : (
                    <div key={item.key} style={{ display: 'contents' }}>
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>{item.label}</span>
                      <NumInput disabled={disabled} value={draft.pricing[cur]?.[item.key]?.low} onChange={(v) => upd((n) => { n.pricing[cur][item.key] = { ...(n.pricing[cur][item.key] || {}), low: v } })} />
                      <NumInput disabled={disabled} placeholder="open" value={draft.pricing[cur]?.[item.key]?.high} onChange={(v) => upd((n) => { n.pricing[cur][item.key] = { ...(n.pricing[cur][item.key] || {}), high: v } })} />
                    </div>
                  ),
                )}
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>Management / month</span>
                <NumInput disabled={disabled} value={draft.pricing[cur]?.management_monthly} onChange={(v) => upd((n) => { n.pricing[cur].management_monthly = v })} />
                <span />
              </div>
            </div>
          ))}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <input style={{ ...S.input, width: 110 }} maxLength={3} placeholder="EUR" value={newCur} onChange={(e) => setNewCur(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
            <Button
              small
              disabled={newCur.length !== 3 || draft.currencies.includes(newCur)}
              onClick={() =>
                upd((n) => {
                  n.currencies.push(newCur)
                  n.pricing[newCur] = clone(n.pricing.USD || defaults.pricing.USD)
                  setNewCur('')
                })
              }
            >
              <Plus size={12} /> Add currency
            </Button>
            <span style={{ fontSize: 11.5, ...S.dim }}>Copies the USD table as a starting point; edit the values.</span>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, ...S.muted, marginBottom: 8 }}>Currency per market</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0,1fr))', gap: 8 }}>
            {catalog.markets.map((m) => (
              <Field key={m.key} label={m.label}>
                <select style={S.select} disabled={disabled} value={draft.market_currency[m.key]} onChange={(e) => upd((n) => { n.market_currency[m.key] = e.target.value })}>
                  {draft.currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        </div>
      </Block>

      <Block
        title="Lead Intelligence Score"
        note={`Maximum points per factor. The total is scaled to 0–100 (current total ${totalMax}). Set a factor to 0 to ignore it.`}
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0,1fr))', gap: 10 }}>
          {Object.keys(SCORE_LABELS).map((k) => (
            <Field key={k} label={SCORE_LABELS[k]}>
              <NumInput disabled={disabled} value={draft.scoring.max[k]} onChange={(v) => upd((n) => { n.scoring.max[k] = v })} />
            </Field>
          ))}
          <Field label="High-opportunity at">
            <NumInput disabled={disabled} value={draft.scoring.high_opportunity_threshold} onChange={(v) => upd((n) => { n.scoring.high_opportunity_threshold = v })} />
          </Field>
          <Field label="Review saturation">
            <NumInput disabled={disabled} value={draft.scoring.review_saturation} onChange={(v) => upd((n) => { n.scoring.review_saturation = v })} />
          </Field>
          <Field label="Unanalyzed site weight">
            <NumInput disabled={disabled} value={draft.scoring.unanalyzed_website_ratio} onChange={(v) => upd((n) => { n.scoring.unanalyzed_website_ratio = v })} />
          </Field>
          <Field label="Outdated after (years)">
            <NumInput disabled={disabled} value={draft.scoring.stale_copyright_years} onChange={(v) => upd((n) => { n.scoring.stale_copyright_years = v })} />
          </Field>
          <Field label="Slow load (ms)">
            <NumInput disabled={disabled} value={draft.scoring.slow_load_ms} onChange={(v) => upd((n) => { n.scoring.slow_load_ms = v })} />
          </Field>
        </div>
      </Block>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Block title="Limits & cost control" note="Stage 3 (website analysis) runs only for the top results per search; everything else is on demand.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Searches / day">
              <NumInput disabled={disabled} value={draft.limits.max_searches_per_day} onChange={(v) => upd((n) => { n.limits.max_searches_per_day = v })} />
            </Field>
            <Field label="Max results / search">
              <NumInput disabled={disabled} value={draft.limits.max_results_per_search} onChange={(v) => upd((n) => { n.limits.max_results_per_search = v })} />
            </Field>
            <Field label="Auto-analyze top">
              <NumInput disabled={disabled} value={draft.limits.auto_analyze_count} onChange={(v) => upd((n) => { n.limits.auto_analyze_count = v })} />
            </Field>
            <Field label="Website analyses / day">
              <NumInput disabled={disabled} value={draft.limits.max_analyses_per_day} onChange={(v) => upd((n) => { n.limits.max_analyses_per_day = v })} />
            </Field>
            <Field label="Industries / search">
              <NumInput disabled={disabled} value={draft.limits.max_industries_per_search} onChange={(v) => upd((n) => { n.limits.max_industries_per_search = v })} />
            </Field>
            <Field label="Timezone (for “today”)">
              <input style={{ ...S.input, padding: '7px 10px' }} disabled={disabled} value={draft.timezone} onChange={(e) => upd((n) => { n.timezone = e.target.value })} />
            </Field>
          </div>
        </Block>
        <Block title="Data providers" note="API keys live only in Vercel environment variables and are never sent to the browser.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {providers.map((p) => (
              <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{p.label}</span>
                <Pill strong={p.configured}>{p.configured ? 'Configured' : 'Not configured'}</Pill>
              </div>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>
            <input type="checkbox" disabled={disabled} checked={draft.provider.allow_legacy_fallback} onChange={(e) => upd((n) => { n.provider.allow_legacy_fallback = e.target.checked })} style={{ accentColor: '#fff' }} />
            Fall back to the legacy Places API if Places API (New) is not enabled
          </label>
          <Field label="Legacy: enrich top results">
            <NumInput disabled={disabled} value={draft.provider.legacy_enrich_count} onChange={(v) => upd((n) => { n.provider.legacy_enrich_count = v })} width={120} />
          </Field>
          <div style={{ fontSize: 12, ...S.muted, margin: '12px 0 6px' }}>Estimated cost per request (USD)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 6, alignItems: 'center', fontSize: 12 }}>
            <span />
            <span style={S.dim}>Search</span>
            <span style={S.dim}>Details</span>
            <span style={S.dim}>Geocode</span>
            {Object.keys(draft.provider_costs).filter((k) => k !== 'manual').map((k) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>{k === 'google_places' ? 'Places (New)' : 'Places (legacy)'}</span>
                {['search', 'details', 'geocode'].map((f) => (
                  <NumInput key={f} disabled={disabled} value={draft.provider_costs[k][f]} onChange={(v) => upd((n) => { n.provider_costs[k][f] = v })} />
                ))}
              </div>
            ))}
          </div>
        </Block>
      </div>

      {canEdit && (
        <div style={{ ...S.card, padding: '10px 12px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', position: 'sticky', bottom: 12, background: 'rgba(14,14,14,0.96)', zIndex: 5 }}>
          <Button onClick={() => setDraft(clone(defaults))}>Reset to defaults</Button>
          <Button onClick={() => setDraft(clone(settings))} disabled={!dirty}>
            Discard changes
          </Button>
          <Button
            variant="solid"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true)
              await onSave(draft)
              setSaving(false)
            }}
          >
            {saving ? <Spinner /> : null} Save settings
          </Button>
        </div>
      )}
    </div>
  )
}
