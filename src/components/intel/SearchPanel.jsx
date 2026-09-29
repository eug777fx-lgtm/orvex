import { useMemo, useState } from 'react'
import { Search, Bookmark, Trash2, Plus, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, TogglePill, Field, Modal, Spinner } from './ui'
import { S, applyPreset } from './shared'

const RADIUS_US = [
  ['', 'Any distance'],
  ['8', '5 miles'],
  ['16', '10 miles'],
  ['40', '25 miles'],
  ['50', '31 miles (max)'],
]
const RADIUS_KM = [
  ['', 'Any distance'],
  ['5', '5 km'],
  ['10', '10 km'],
  ['25', '25 km'],
  ['50', '50 km'],
]

const TRI = [
  ['any', 'Any'],
  ['has', 'Has'],
  ['none', 'None'],
]

function Tri({ label, value, onChange }) {
  return (
    <Field label={label}>
      <select style={S.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {TRI.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  )
}

export default function SearchPanel({
  catalog,
  settings,
  presets,
  criteria,
  setCriteria,
  onSearch,
  busy,
  onSavePreset,
  onDeletePreset,
  onManualAdd,
  isMobile,
}) {
  const [showFilters, setShowFilters] = useState(!isMobile)
  const [group, setGroup] = useState(() => catalog.industries.find((i) => criteria.industries.includes(i.key))?.group || 'home_services')
  const [presetName, setPresetName] = useState('')
  const [presetOpen, setPresetOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ business_name: '', website: '', phone: '', city: '', country: '', industry: '' })
  const [activePreset, setActivePreset] = useState(null)

  const market = catalog.markets.find((m) => m.key === criteria.market)
  const maxInd = settings?.limits?.max_industries_per_search || 3
  const set = (patch) => {
    setActivePreset(null)
    setCriteria((c) => ({ ...c, ...patch }))
  }
  const setF = (patch) => {
    setActivePreset(null)
    setCriteria((c) => ({ ...c, filters: { ...c.filters, ...patch } }))
  }

  const groupIndustries = useMemo(() => catalog.industries.filter((i) => i.group === group), [catalog, group])

  function toggleIndustry(key) {
    const has = criteria.industries.includes(key)
    if (!has && criteria.industries.length >= maxInd) return
    set({ industries: has ? criteria.industries.filter((k) => k !== key) : [...criteria.industries, key] })
  }

  function chooseMarket(key) {
    set({ market: key, country_code: '', country: '', region: '', city: '', postal_code: '', radius_km: '' })
  }

  const locationGrid = isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))'
  const selectedLabels = criteria.industries.map((k) => catalog.industries.find((i) => i.key === k)?.label).filter(Boolean)

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Presets */}
      <div>
        <div style={{ ...S.label, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Presets</span>
          <button
            type="button"
            onClick={() => setPresetOpen(true)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'none', letterSpacing: 0 }}
          >
            <Bookmark size={12} /> Save current as preset
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {presets.map((p) => (
            <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <TogglePill
                active={activePreset === p.id}
                onClick={() => {
                  setCriteria((c) => applyPreset(c, p))
                  setActivePreset(p.id)
                  const firstInd = catalog.industries.find((i) => (p.criteria?.industries || []).includes(i.key))
                  if (firstInd) setGroup(firstInd.group)
                }}
              >
                {p.name}
              </TogglePill>
              {!p.is_builtin && (
                <button
                  type="button"
                  aria-label={`Delete preset ${p.name}`}
                  title="Delete preset"
                  onClick={() => onDeletePreset(p)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 2 }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Market */}
      <div>
        <div style={S.label}>Market</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {catalog.markets.map((m) => (
            <TogglePill key={m.key} active={criteria.market === m.key} onClick={() => chooseMarket(m.key)}>
              {m.label}
            </TogglePill>
          ))}
        </div>
      </div>

      {/* Location */}
      <div style={{ display: 'grid', gridTemplateColumns: locationGrid, gap: 10 }}>
        {market?.countries && (
          <Field label="Country">
            <select
              style={S.select}
              value={criteria.country_code}
              onChange={(e) => set({ country_code: e.target.value })}
            >
              <option value="">Choose country</option>
              {market.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {market?.freeCountry && (
          <Field label="Country">
            <input style={S.input} value={criteria.country} placeholder="e.g. Netherlands" onChange={(e) => set({ country: e.target.value })} />
          </Field>
        )}
        {market?.regions ? (
          <Field label={market.regionLabel || 'State'}>
            <select style={S.select} value={criteria.region} onChange={(e) => set({ region: e.target.value })}>
              <option value="">Any {market.regionLabel?.toLowerCase() || 'state'}</option>
              {market.regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          (market?.freeCountry || market?.countries) && (
            <Field label={market.regionLabel || 'Region'}>
              <input style={S.input} value={criteria.region} placeholder="Optional" onChange={(e) => set({ region: e.target.value })} />
            </Field>
          )
        )}
        <Field label="City">
          {market?.cities ? (
            <select style={S.select} value={criteria.city} onChange={(e) => set({ city: e.target.value })}>
              <option value="">Whole island</option>
              {market.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input style={S.input} value={criteria.city} placeholder={criteria.market === 'US' ? 'e.g. Tampa' : 'City'} onChange={(e) => set({ city: e.target.value })} />
          )}
        </Field>
        {market?.supportsPostal && (
          <Field label={criteria.market === 'US' ? 'ZIP code' : 'Postal code'}>
            <input style={S.input} value={criteria.postal_code} placeholder="Optional" inputMode={criteria.market === 'US' ? 'numeric' : 'text'} onChange={(e) => set({ postal_code: e.target.value })} />
          </Field>
        )}
        {market?.supportsRadius && (
          <Field label="Radius">
            <select style={S.select} value={String(criteria.radius_km || '')} onChange={(e) => set({ radius_km: e.target.value })}>
              {(criteria.market === 'US' ? RADIUS_US : RADIUS_KM).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {/* Industry */}
      <div>
        <div style={{ ...S.label, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>Industry</span>
          <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>
            {selectedLabels.length ? `${selectedLabels.join(', ')} (${selectedLabels.length}/${maxInd})` : `Up to ${maxInd} per search`}
          </span>
        </div>
        <div className="intel-scroll" style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
          {catalog.industry_groups.map((g) => {
            const count = catalog.industries.filter((i) => i.group === g.key && criteria.industries.includes(i.key)).length
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  background: group === g.key ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: group === g.key ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              >
                {g.label}
                {count ? ` · ${count}` : ''}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {groupIndustries.map((i) => {
            const active = criteria.industries.includes(i.key)
            return (
              <TogglePill key={i.key} active={active} disabled={!active && criteria.industries.length >= maxInd} onClick={() => toggleIndustry(i.key)}>
                {i.label}
              </TogglePill>
            )
          })}
        </div>
        <div style={{ marginTop: 10, maxWidth: 420 }}>
          <input
            style={S.input}
            value={criteria.custom_term}
            maxLength={80}
            placeholder="Or a custom search term, e.g. pool cleaning"
            onChange={(e) => set({ custom_term: e.target.value, industries: e.target.value ? [] : criteria.industries })}
          />
        </div>
      </div>

      {/* Filters */}
      <div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          style={{ ...S.label, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: showFilters ? 10 : 0 }}
        >
          <SlidersHorizontal size={12} /> Business filters {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Min reviews">
              <input style={S.input} inputMode="numeric" value={criteria.filters.min_reviews} placeholder="Any" onChange={(e) => setF({ min_reviews: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="Max reviews">
              <input style={S.input} inputMode="numeric" value={criteria.filters.max_reviews} placeholder="Any" onChange={(e) => setF({ max_reviews: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="Min rating">
              <select style={S.select} value={String(criteria.filters.min_rating ?? '')} onChange={(e) => setF({ min_rating: e.target.value })}>
                <option value="">Any</option>
                {['3.0', '3.5', '4.0', '4.5'].map((v) => (
                  <option key={v} value={v}>
                    {v}+
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Max rating">
              <select style={S.select} value={String(criteria.filters.max_rating ?? '')} onChange={(e) => setF({ max_rating: e.target.value })}>
                <option value="">Any</option>
                {['3.5', '4.0', '4.5', '4.8'].map((v) => (
                  <option key={v} value={v}>
                    Up to {v}
                  </option>
                ))}
              </select>
            </Field>
            <Tri label="Website" value={criteria.filters.website} onChange={(v) => setF({ website: v })} />
            <Field label="Website quality">
              <select style={S.select} value={criteria.filters.website_quality} onChange={(e) => setF({ website_quality: e.target.value })}>
                <option value="any">Any</option>
                <option value="poor_or_none">Poor or no website</option>
                <option value="needs_improvement">Needs improvement</option>
                <option value="good">Adequate or strong</option>
              </select>
            </Field>
            <Tri label="Booking" value={criteria.filters.booking} onChange={(v) => setF({ booking: v })} />
            <Tri label="Contact form" value={criteria.filters.contact_form} onChange={(v) => setF({ contact_form: v })} />
            <Tri label="Social media" value={criteria.filters.social} onChange={(v) => setF({ social: v })} />
            <Field label="Results">
              <select style={S.select} value={criteria.max_results} onChange={(e) => set({ max_results: Number(e.target.value) })}>
                {[20, 40, 60].filter((v) => v <= (settings?.limits?.max_results_per_search || 60)).map((v) => (
                  <option key={v} value={v}>
                    Up to {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)', padding: '8px 0' }}>
                <input type="checkbox" checked={criteria.filters.open_only !== false} onChange={(e) => setF({ open_only: e.target.checked })} style={{ accentColor: '#fff' }} />
                Active only
              </label>
            </Field>
            <Field label="Website analysis">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.75)', padding: '8px 0' }}>
                <input type="checkbox" checked={criteria.auto_analyze} onChange={(e) => set({ auto_analyze: e.target.checked })} style={{ accentColor: '#fff' }} />
                Top {settings?.limits?.auto_analyze_count ?? 12}
              </label>
            </Field>
          </div>
        )}
        {showFilters && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10, lineHeight: 1.5 }}>
            Website quality, booking, contact form and social filters need website analysis. Until a site is analyzed it shows as
            unknown instead of being excluded. Business size and age are not provided by the current data source.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="solid" onClick={onSearch} disabled={busy} style={{ minWidth: 180, padding: '11px 26px', fontSize: 14 }}>
          {busy ? <Spinner /> : <Search size={15} />}
          {busy ? 'Discovering…' : 'Discover'}
        </Button>
        <Button variant="ghost" small onClick={() => setManualOpen(true)}>
          <Plus size={13} /> Add a business manually
        </Button>
      </div>

      <Modal
        open={presetOpen}
        onClose={() => setPresetOpen(false)}
        title="Save search preset"
        width={420}
        footer={
          <>
            <Button onClick={() => setPresetOpen(false)}>Cancel</Button>
            <Button
              variant="solid"
              disabled={!presetName.trim()}
              onClick={async () => {
                const ok = await onSavePreset(presetName.trim())
                if (ok) {
                  setPresetName('')
                  setPresetOpen(false)
                }
              }}
            >
              Save preset
            </Button>
          </>
        }
      >
        <Field label="Preset name" hint="Saves the market, location, industries and filters shown above.">
          <input style={S.input} autoFocus value={presetName} maxLength={80} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g. Tampa roofers, poor websites" />
        </Field>
      </Modal>

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Add a business manually"
        width={520}
        footer={
          <>
            <Button onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button
              variant="solid"
              disabled={!manual.business_name.trim() || (!manual.website.trim() && !manual.phone.trim())}
              onClick={async () => {
                const ok = await onManualAdd({ ...manual, market: criteria.market })
                if (ok) {
                  setManual({ business_name: '', website: '', phone: '', city: '', country: '', industry: '' })
                  setManualOpen(false)
                }
              }}
            >
              Add and analyze
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Business name" style={{ gridColumn: '1 / -1' }}>
            <input style={S.input} value={manual.business_name} onChange={(e) => setManual({ ...manual, business_name: e.target.value })} />
          </Field>
          <Field label="Website">
            <input style={S.input} value={manual.website} placeholder="example.com" onChange={(e) => setManual({ ...manual, website: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input style={S.input} value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} />
          </Field>
          <Field label="City">
            <input style={S.input} value={manual.city} onChange={(e) => setManual({ ...manual, city: e.target.value })} />
          </Field>
          <Field label="Industry">
            <select style={S.select} value={manual.industry} onChange={(e) => setManual({ ...manual, industry: e.target.value })}>
              <option value="">Other</option>
              {catalog.industries.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
          Uses the {market?.label || 'selected'} market for currency. Only information you enter is stored; nothing is filled in automatically.
        </div>
      </Modal>
    </div>
  )
}
