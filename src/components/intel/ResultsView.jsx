import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Eye, ScanSearch, UserPlus, Phone, MessageSquare, MoreHorizontal, ExternalLink, Copy, Bookmark, EyeOff,
  Download, X, Check, Globe,
} from 'lucide-react'
import { Button, Pill, ScoreBadge, TriState, NA, Spinner, Checkbox } from './ui'
import { S, SORTS, sortResults } from './shared'
import { fmtRange } from '../../lib/intelApi'
import { statusLabel } from '../../lib/leadStatuses'

function locationLine(b) {
  return [b.city, b.region, b.country_code || b.country].filter(Boolean).join(', ') || null
}

function MoreMenu({ b, onOpenWebsite, onCopyPhone, onSave, onIgnore }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const item = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 12.5, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', whiteSpace: 'nowrap' }
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <IconBtn title="More" onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={14} />
      </IconBtn>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 4, zIndex: 30, minWidth: 170, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
          <button type="button" style={{ ...item, opacity: b.website ? 1 : 0.4 }} disabled={!b.website} onClick={() => { setOpen(false); onOpenWebsite(b) }}>
            <ExternalLink size={13} /> Open website
          </button>
          <button type="button" style={{ ...item, opacity: b.phone ? 1 : 0.4 }} disabled={!b.phone} onClick={() => { setOpen(false); onCopyPhone(b) }}>
            <Copy size={13} /> Copy phone
          </button>
          <button type="button" style={item} onClick={() => { setOpen(false); onSave(b) }}>
            <Bookmark size={13} /> {b.status === 'saved' ? 'Saved' : 'Save for later'}
          </button>
          <button type="button" style={item} onClick={() => { setOpen(false); onIgnore(b) }}>
            <EyeOff size={13} /> {b.status === 'ignored' ? 'Restore' : 'Ignore'}
          </button>
        </div>
      )}
    </span>
  )
}

function IconBtn({ title, onClick, children, disabled, active }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? '#fff' : 'rgba(255,255,255,0.04)',
        color: active ? '#000' : 'rgba(255,255,255,0.75)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function WebsiteCell({ b, analyzing }) {
  if (analyzing) return <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}><Spinner size={12} /> Checking…</span>
  const strong = ['none', 'needs_improvement', 'unreachable', 'social_only', 'limited_conversion'].includes(b.website_quality)
  return (
    <span style={{ fontSize: 12, color: b.website_quality === 'unknown' ? 'rgba(255,255,255,0.4)' : strong ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: strong ? 500 : 400 }}>
      {b.website_quality_label}
    </span>
  )
}

function PriceCell({ p }) {
  if (!p?.services?.length) return <NA>No clear package</NA>
  return (
    <div style={{ minWidth: 150 }}>
      <div style={{ fontSize: 12.5, color: '#fff', fontWeight: 500 }}>{p.package_name}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
        {p.quote_required && !p.price_low ? 'Custom quote' : fmtRange(p.price_low, p.price_high, p.currency, p.open_ended)}
        {p.monthly ? ` + ${fmtRange(p.monthly, null, p.currency)}/mo` : ''}
      </div>
    </div>
  )
}

function LeadBadge({ b }) {
  if (!b.lead) return null
  return <Pill strong title="Already in your Leads">In Leads · {statusLabel(b.lead.status)}</Pill>
}

function RowActions({ b, handlers, analyzing, isMobile }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
      <IconBtn title="View details" onClick={() => handlers.onOpen(b)}>
        <Eye size={14} />
      </IconBtn>
      <IconBtn
        title={b.website ? (b.analysis?.analyzed_at ? 'Re-analyze website' : 'Analyze website') : 'No website to analyze'}
        disabled={!b.website || b.website_state === 'social_only' || analyzing.has(b.id)}
        onClick={() => handlers.onAnalyze([b.id])}
      >
        {analyzing.has(b.id) ? <Spinner size={13} /> : <ScanSearch size={14} />}
      </IconBtn>
      <IconBtn title={b.lead ? 'Already in Leads' : 'Add to Leads'} active={!!b.lead} onClick={() => handlers.onAdd(b)}>
        {b.lead ? <Check size={14} /> : <UserPlus size={14} />}
      </IconBtn>
      <IconBtn title={b.phone ? 'Call / log call' : 'No phone listed'} disabled={!b.phone && !b.phone_intl} onClick={() => handlers.onCall(b)}>
        <Phone size={14} />
      </IconBtn>
      <IconBtn title="Generate outreach" onClick={() => handlers.onOutreach([b])}>
        <MessageSquare size={14} />
      </IconBtn>
      <MoreMenu b={b} onOpenWebsite={handlers.onOpenWebsite} onCopyPhone={handlers.onCopyPhone} onSave={handlers.onSave} onIgnore={handlers.onIgnore} />
    </div>
  )
}

function RowTags({ b }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      <LeadBadge b={b} />
      {b.status === 'saved' && <Pill>Saved</Pill>}
      {b.filter_state === 'unknown' && <Pill title="Some of your filters need website analysis">Filters unverified</Pill>}
      {b.tags.filter((t) => t !== 'Not analyzed' || b.filter_state !== 'unknown').slice(0, 4).map((t) => (
        <Pill key={t}>{t}</Pill>
      ))}
    </div>
  )
}

export default function ResultsView({
  results,
  selected,
  setSelected,
  sort,
  setSort,
  analyzing,
  isMobile,
  handlers,
  counts,
  toggles,
}) {
  const sorted = useMemo(() => sortResults(results, sort), [results, sort])
  const allSelected = sorted.length > 0 && sorted.every((b) => selected.has(b.id))
  const someSelected = sorted.some((b) => selected.has(b.id))
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(sorted.map((b) => b.id)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
            <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} label="Select all" />
            {counts.visible} shown
          </label>
          {counts.failed > 0 && (
            <button type="button" onClick={toggles.toggleFailed} style={linkBtn}>
              {toggles.showFailed ? 'Hide' : 'Show'} {counts.failed} excluded by analysis
            </button>
          )}
          {counts.unknown > 0 && (
            <button type="button" onClick={toggles.toggleUnknown} style={linkBtn}>
              {toggles.hideUnknown ? 'Show' : 'Hide'} {counts.unknown} unverified
            </button>
          )}
          {counts.ignored > 0 && (
            <button type="button" onClick={toggles.toggleIgnored} style={linkBtn}>
              {toggles.showIgnored ? 'Hide' : 'Show'} {counts.ignored} ignored
            </button>
          )}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          Sort
          <select style={{ ...S.select, width: 'auto', padding: '6px 28px 6px 10px', fontSize: 12 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div style={{ ...S.card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'sticky', top: 8, zIndex: 20, background: 'rgba(24,24,24,0.95)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginRight: 6 }}>Selected: {selected.size}</span>
          <Button small variant="solid" onClick={handlers.onBulkAdd}>
            <UserPlus size={13} /> Add all to Leads
          </Button>
          <Button small onClick={handlers.onBulkAssign}>Assign</Button>
          <Button small onClick={handlers.onBulkAnalyze}>
            <ScanSearch size={13} /> Analyze
          </Button>
          <Button small onClick={handlers.onBulkOutreach}>
            <MessageSquare size={13} /> Generate outreach
          </Button>
          <Button small onClick={handlers.onBulkExport}>
            <Download size={13} /> Export
          </Button>
          <Button small onClick={handlers.onBulkIgnore}>
            <EyeOff size={13} /> Ignore
          </Button>
          <Button small onClick={() => setSelected(new Set())} style={{ marginLeft: 'auto' }}>
            <X size={13} /> Clear
          </Button>
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((b) => (
            <div key={b.id} style={{ ...S.card, padding: 14, opacity: b.status === 'ignored' ? 0.5 : 1 }} onClick={() => handlers.onOpen(b)}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Checkbox checked={selected.has(b.id)} onChange={() => toggle(b.id)} label={`Select ${b.business_name}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 650, color: '#fff' }}>{b.business_name}</div>
                    <ScoreBadge score={b.score} />
                  </div>
                  <div style={{ fontSize: 12, ...S.muted, marginTop: 2 }}>
                    {[b.category, locationLine(b)].filter(Boolean).join(' · ') || 'Location not available'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10, fontSize: 12 }}>
                    <span>{b.phone || <NA>Phone not available</NA>}</span>
                    <span>{b.rating !== null && b.rating !== undefined ? `${Number(b.rating).toFixed(1)} · ${b.review_count ?? 0} reviews` : <NA>No rating</NA>}</span>
                    <WebsiteCell b={b} analyzing={analyzing.has(b.id)} />
                    <TriState status={b.booking_status} detected="Booking detected" notDetected="No booking detected" unknown="Booking unknown" />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <PriceCell p={b.pricing} />
                  </div>
                  <RowTags b={b} />
                  <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <RowActions b={b} handlers={handlers} analyzing={analyzing} isMobile={isMobile} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="intel-scroll" style={{ ...S.card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 34 }}>
                  <Checkbox checked={allSelected} indeterminate={!allSelected && someSelected} onChange={toggleAll} label="Select all" />
                </th>
                <th style={S.th}>Business</th>
                <th style={S.th}>Contact</th>
                <th style={S.th}>Rating</th>
                <th style={S.th}>Website</th>
                <th style={S.th}>Booking</th>
                <th style={S.th}>Score</th>
                <th style={S.th}>Recommended</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr key={b.id} className="intel-row" style={{ cursor: 'pointer', opacity: b.status === 'ignored' ? 0.45 : 1 }} onClick={() => handlers.onOpen(b)}>
                  <td style={S.td}>
                    <Checkbox checked={selected.has(b.id)} onChange={() => toggle(b.id)} label={`Select ${b.business_name}`} />
                  </td>
                  <td style={{ ...S.td, maxWidth: 300 }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{b.business_name}</div>
                    <div style={{ fontSize: 12, ...S.muted, marginTop: 2 }}>
                      {[b.category, locationLine(b)].filter(Boolean).join(' · ') || <NA>Location not available</NA>}
                    </div>
                    <RowTags b={b} />
                  </td>
                  <td style={S.td}>
                    <div style={{ whiteSpace: 'nowrap' }}>{b.phone || <NA>Phone not available</NA>}</div>
                    <div style={{ fontSize: 12, marginTop: 3, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.website ? (
                        <a href={b.website} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()} style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Globe size={11} /> {b.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      ) : (
                        <NA>{b.website_state === 'not_enriched' ? 'Not loaded yet' : 'No website listed'}</NA>
                      )}
                    </div>
                  </td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    {b.rating !== null && b.rating !== undefined ? (
                      <>
                        <div style={{ color: '#fff' }}>{Number(b.rating).toFixed(1)}</div>
                        <div style={{ fontSize: 12, ...S.muted }}>{b.review_count ?? 0} reviews</div>
                      </>
                    ) : (
                      <NA>No rating</NA>
                    )}
                  </td>
                  <td style={S.td}>
                    <WebsiteCell b={b} analyzing={analyzing.has(b.id)} />
                  </td>
                  <td style={S.td}>
                    <TriState status={b.booking_status} notDetected="Not detected" unknown="Unknown" />
                  </td>
                  <td style={S.td}>
                    <ScoreBadge score={b.score} />
                  </td>
                  <td style={S.td}>
                    <PriceCell p={b.pricing} />
                  </td>
                  <td style={S.td} onClick={(e) => e.stopPropagation()}>
                    <RowActions b={b} handlers={handlers} analyzing={analyzing} isMobile={isMobile} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const linkBtn = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 12,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  padding: 0,
  fontFamily: 'inherit',
}
