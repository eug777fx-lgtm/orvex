import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  X, ScanSearch, UserPlus, Phone, MessageSquare, ExternalLink, RefreshCw, Check, MapPin, Globe, Mail, Clock,
} from 'lucide-react'
import { Button, Pill, ScoreBadge, TriState, NA, Spinner } from './ui'
import { S } from './shared'
import { fmtRange, fmtMoney, fmtDateTime, intelApi } from '../../lib/intelApi'
import { statusLabel, CALL_OUTCOMES } from '../../lib/leadStatuses'

const COMPONENT_LABELS = {
  activity: 'Business activity',
  website: 'Website opportunity',
  booking: 'Booking opportunity',
  crm: 'CRM opportunity',
  automation: 'Automation opportunity',
  confidence: 'Data confidence',
}

const OPP_LABELS = [
  ['website', 'Website'],
  ['booking', 'Booking'],
  ['crm', 'CRM'],
  ['automation', 'Automation'],
  ['ecommerce', 'E-commerce / online ordering'],
  ['custom', 'Custom software'],
]

const LEVEL_TEXT = { strong: 'Strong', moderate: 'Moderate', low: 'Low', none: 'None identified' }

const TECH_CATEGORY = {
  cms: 'Website platform',
  booking: 'Booking / scheduling',
  field_service: 'Field-service software',
  ecommerce: 'E-commerce',
  ordering: 'Online ordering',
  payments: 'Payments',
  crm: 'CRM / customer tools',
  email_marketing: 'Email marketing',
  chat: 'Chat / messaging',
  analytics: 'Analytics',
  forms: 'Forms',
}

function Section({ title, children, right }) {
  return (
    <section style={{ padding: '18px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <div style={{ ...S.label, marginBottom: 0 }}>{title}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, fontSize: 13, padding: '5px 0' }}>
      <div style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
      <div style={{ color: 'rgba(255,255,255,0.85)', minWidth: 0, overflowWrap: 'anywhere' }}>{children}</div>
    </div>
  )
}

function Bar({ points, max }) {
  const pct = max ? Math.max(0, Math.min(100, (points / max) * 100)) : 0
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: '#fff', borderRadius: 999 }} />
    </div>
  )
}

export default function BusinessPanel({ business, open, onClose, handlers, analyzing, catalog, isMobile, canEditPrice = true }) {
  const [detail, setDetail] = useState(null)
  const [price, setPrice] = useState(business?.pricing?.suggested_price ?? '')
  const b = business && detail?.business?.id === business.id ? { ...business, ...detail.business } : business
  const loading = !!(open && business && detail?.business?.id !== business.id)

  useEffect(() => {
    if (!open || !business?.id) return undefined
    let alive = true
    intelApi('detail', { business_id: business.id }).then((r) => {
      if (alive && r.success) setDetail(r)
    })
    return () => {
      alive = false
    }
  }, [open, business?.id, business?.analysis?.analyzed_at, business?.lead?.status, business?.lead?.id])

  const industryLabel = catalog.industries.find((i) => i.key === b?.industry)?.label
  const signals = b?.analysis?.website_signals || {}
  const tech = b?.analysis?.technology_data || []
  const p = b?.pricing

  return createPortal(
    <AnimatePresence>
      {open && b && [
          <Motion.div
            key="intel-panel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
          />,
          <Motion.aside
            key="intel-panel"
            role="dialog"
            aria-label={`${b.business_name} details`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: isMobile ? '100%' : 620,
              background: '#0d0d0d',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              zIndex: 210,
              overflowY: 'auto',
              padding: isMobile ? '18px 16px 40px' : '24px 28px 48px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{b.business_name}</div>
                <div style={{ fontSize: 13, ...S.muted, marginTop: 4 }}>
                  {[industryLabel, b.category].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') || 'Category not available'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                  {b.lead && <Pill strong>In Leads · {statusLabel(b.lead.status)}</Pill>}
                  {b.tags.map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 2 }}>
                  <X size={20} />
                </button>
                <ScoreBadge score={b.score} size="lg" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '18px 0 6px' }}>
              {b.lead ? (
                <Button small variant="subtle" onClick={() => handlers.onOpenLead(b.lead.id)}>
                  <Check size={13} /> Open lead
                </Button>
              ) : (
                <Button small variant="solid" onClick={() => handlers.onAdd(b, price)}>
                  <UserPlus size={13} /> Add to Leads
                </Button>
              )}
              <Button small onClick={() => handlers.onCall(b)} disabled={!b.phone && !b.phone_intl}>
                <Phone size={13} /> Call
              </Button>
              <Button small onClick={() => handlers.onOutreach([b])}>
                <MessageSquare size={13} /> Outreach
              </Button>
              <Button small onClick={() => handlers.onAnalyze([b.id])} disabled={!b.website || b.website_state === 'social_only' || analyzing.has(b.id)}>
                {analyzing.has(b.id) ? <Spinner size={12} /> : <ScanSearch size={13} />}
                {b.analysis?.analyzed_at ? 'Re-analyze' : 'Analyze'}
              </Button>
              {b.provider !== 'manual' && (
                <Button small onClick={() => handlers.onEnrich(b)} title="Re-fetch business data from the provider (uses one API request)">
                  <RefreshCw size={13} /> Refresh data
                </Button>
              )}
              {b.website && (
                <Button small onClick={() => handlers.onOpenWebsite(b)}>
                  <ExternalLink size={13} /> Website
                </Button>
              )}
            </div>
            {loading && <div style={{ fontSize: 12, ...S.muted, marginBottom: 6 }}>Loading latest details…</div>}

            {/* Overview */}
            <Section title="Overview">
              <Row label="Industry">{industryLabel || b.category || <NA />}</Row>
              <Row label="Address">{b.address || <NA />}</Row>
              <Row label="Location">{[b.city, b.region, b.postal_code, b.country].filter(Boolean).join(', ') || <NA />}</Row>
              <Row label="Rating">
                {b.rating !== null && b.rating !== undefined ? `${Number(b.rating).toFixed(1)} from ${b.review_count ?? 0} reviews` : <NA>No rating available</NA>}
              </Row>
              <Row label="Status">{b.business_status ? String(b.business_status).toLowerCase().replace(/_/g, ' ') : <NA />}</Row>
              <Row label="Hours">
                {Array.isArray(b.hours) && b.hours.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                    {b.hours.map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                ) : (
                  <NA />
                )}
              </Row>
            </Section>

            {/* Contact */}
            <Section title="Contact">
              <Row label="Phone">
                {b.phone || b.phone_intl ? (
                  <a href={`tel:${(b.phone_intl || b.phone).replace(/[^\d+]/g, '')}`} style={{ color: '#fff' }}>
                    {b.phone || b.phone_intl}
                  </a>
                ) : (
                  <NA />
                )}
              </Row>
              <Row label="Email">
                {b.email ? (
                  <span>
                    <a href={`mailto:${b.email}`} style={{ color: '#fff' }}>
                      {b.email}
                    </a>
                    {b.email_source && <span style={{ ...S.dim, fontSize: 12 }}> · from {b.email_source}</span>}
                  </span>
                ) : (
                  <NA>Email unavailable</NA>
                )}
              </Row>
            </Section>

            {/* Online presence */}
            <Section title="Online presence">
              <Row label="Website">
                {b.website ? (
                  <a href={b.website} target="_blank" rel="noopener noreferrer nofollow" style={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Globe size={12} /> {b.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <NA>{b.website_state === 'not_enriched' ? 'Not loaded yet (Refresh data)' : 'No website listed'}</NA>
                )}
              </Row>
              <Row label="Social">
                {b.social && Object.keys(b.social).length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(b.social).map(([k, url]) => (
                      <a key={k} href={url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'capitalize' }}>
                        {k}
                      </a>
                    ))}
                  </div>
                ) : b.website_state === 'reachable' ? (
                  <span style={S.muted}>No social links found on the website</span>
                ) : (
                  <NA>Not detected yet</NA>
                )}
              </Row>
              <Row label="Profile">
                {b.source_url ? (
                  <a href={b.source_url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'rgba(255,255,255,0.8)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={12} /> View on Google Maps
                  </a>
                ) : (
                  <NA />
                )}
              </Row>
            </Section>

            {/* Website analysis */}
            <Section
              title="Website analysis"
              right={b.analysis?.analyzed_at ? <span style={{ fontSize: 11, ...S.dim }}>Analyzed {fmtDateTime(b.analysis.analyzed_at)}</span> : null}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, marginBottom: 12 }}>
                <MiniStat label="Website">{b.website_quality_label}</MiniStat>
                <MiniStat label="Mobile">
                  <TriState status={b.website_state === 'reachable' ? b.analysis?.mobile_status : 'unknown'} detected="Mobile-ready" notDetected="No mobile viewport" unknown="Unknown" />
                </MiniStat>
                <MiniStat label="Booking">
                  <TriState status={b.booking_status} detected="Detected" notDetected="Not detected" unknown="Unknown" />
                </MiniStat>
                <MiniStat label="Contact form">
                  <TriState status={b.contact_form_status} detected="Detected" notDetected="Not detected" unknown="Unknown" />
                </MiniStat>
              </div>
              {b.website_state === 'reachable' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {b.website_checks.map((c) => (
                      <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                        <span style={{ color: 'rgba(255,255,255,0.75)' }}>{c.label}</span>
                        <span style={{ color: c.pass === true ? '#fff' : c.pass === false ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                          {c.pass === true ? 'Pass' : c.pass === false ? 'Needs improvement' : 'Unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginTop: 12, fontSize: 12 }}>
                    <MiniStat label="Pages (est.)">{signals.page_estimate ?? <NA />}</MiniStat>
                    <MiniStat label="Load time">{typeof signals.load_ms === 'number' ? `${(signals.load_ms / 1000).toFixed(1)}s` : <NA />}</MiniStat>
                    <MiniStat label="HTTPS">{signals.https ? 'Yes' : 'No'}</MiniStat>
                  </div>
                  {signals.title && <Row label="Page title">{signals.title}</Row>}
                  {signals.meta_description && <Row label="Description">{signals.meta_description}</Row>}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, ...S.muted, marginBottom: 6 }}>Technologies detected (with evidence)</div>
                    {tech.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {tech.map((t) => (
                          <div key={`${t.name}-${t.category}`} style={{ display: 'flex', gap: 8, fontSize: 12.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <span style={{ color: '#fff', fontWeight: 500 }}>{t.name}</span>
                            <span style={S.muted}>{TECH_CATEGORY[t.category] || t.category}</span>
                            <code style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240, whiteSpace: 'nowrap' }}>{t.evidence}</code>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12.5, ...S.muted }}>No known technologies detected from the homepage.</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, ...S.dim, marginTop: 12, lineHeight: 1.5 }}>
                    Automated checks of the public homepage only. A failed check means “not detected”, not proof that something is missing.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, ...S.muted }}>
                  {{
                    none_listed: 'No website is listed on the business profile.',
                    social_only: 'The listed website is a social media page.',
                    unreachable: `The listed website did not load during analysis${b.analysis?.error ? ` (${b.analysis.error})` : ''}.`,
                    blocked_robots: "The site's robots.txt does not allow automated analysis, so it was not analyzed.",
                    not_analyzed: 'Not analyzed yet. Click Analyze to check the public homepage.',
                    not_enriched: 'Website and phone have not been loaded for this result yet. Use Refresh data.',
                  }[b.website_state] || 'Not analyzed yet.'}
                </div>
              )}
            </Section>

            {/* Opportunity */}
            <Section title="Business opportunity">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {OPP_LABELS.map(([k, label]) => {
                  const o = b.opportunities?.[k]
                  if (!o || (k === 'custom' && !o.fraction) || (k === 'ecommerce' && !o.findings.length)) return null
                  return (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: '#fff', fontWeight: 500 }}>{label}</span>
                        <span style={{ color: o.level === 'strong' ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>{LEVEL_TEXT[o.level]}</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 1.6 }}>
                        {o.findings.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </Section>

            {/* Score */}
            <Section title="Lead Intelligence Score" right={<span style={{ fontSize: 11, ...S.dim }}>Sales opportunity, not a rating of the business</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(b.score_components || {}).map(([k, c]) => (
                  <div key={k}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{COMPONENT_LABELS[k] || k}</span>
                      <span style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        {c.points} <span style={S.dim}>/ {c.max}</span>
                      </span>
                    </div>
                    <Bar points={c.points} max={c.max} />
                    {c.findings?.[0] && <div style={{ fontSize: 11.5, ...S.muted, marginTop: 4 }}>{c.findings.join(' · ')}</div>}
                  </div>
                ))}
              </div>
            </Section>

            {/* Pricing */}
            <Section title="Recommended services & suggested pricing" right={<span style={{ fontSize: 11, ...S.dim }}>Internal recommendation</span>}>
              {p?.services?.length ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 650, color: '#fff', marginBottom: 8 }}>{p.package_name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {p.services.map((s) => (
                      <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>{s.label}</span>
                        <span style={{ color: '#fff' }}>{s.quote ? 'Custom quote' : fmtRange(s.low, s.high, p.currency, s.high === null)}</span>
                      </div>
                    ))}
                    {p.monthly ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>Website management</span>
                        <span style={{ color: '#fff' }}>{fmtMoney(p.monthly, p.currency)}/month</span>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 12, ...S.muted }}>Range</div>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{fmtRange(p.price_low, p.price_high, p.currency, p.open_ended)}</div>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 12, ...S.muted }}>Suggested project ({p.currency})</span>
                      <input
                        style={{ ...S.input, width: 140, fontWeight: 600 }}
                        inputMode="numeric"
                        value={price}
                        disabled={!canEditPrice}
                        onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
                      />
                    </label>
                  </div>
                  {b.lead && Number(price) !== Number(p.suggested_price) && price !== '' && (
                    <div style={{ marginTop: 8 }}>
                      <Button small onClick={() => handlers.onSaveLeadPrice(b, price)}>Save price to lead</Button>
                    </div>
                  )}
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '12px 0 0' }}>{p.reasoning}</p>
                </>
              ) : (
                <p style={{ fontSize: 13, ...S.muted, margin: 0 }}>{p?.reasoning || 'No recommendation yet.'}</p>
              )}
            </Section>

            {/* Activity */}
            {b.lead && (
              <Section title="Lead activity" right={<Button small onClick={() => handlers.onCall(b)}><Phone size={12} /> Log call</Button>}>
                {detail?.tasks?.length ? (
                  <div style={{ marginBottom: 10 }}>
                    {detail.tasks.map((t) => (
                      <div key={t.id} style={{ fontSize: 12.5, color: '#fff', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Clock size={12} /> {t.title} {t.due_date ? <span style={S.muted}>· due {String(t.due_date).slice(0, 10)}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {detail?.activities?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.activities.map((a) => (
                      <div key={a.id} style={{ fontSize: 12.5 }}>
                        <div style={{ color: '#fff' }}>
                          {a.type === 'call' ? 'Call' : a.type === 'note' ? 'Note' : a.type}
                          {a.outcome ? ` · ${CALL_OUTCOMES.find((o) => o.value === a.outcome)?.label || a.outcome}` : ''}
                          <span style={{ ...S.dim, marginLeft: 6 }}>{fmtDateTime(a.created_at)}</span>
                        </div>
                        {a.notes && <div style={{ color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap', marginTop: 2 }}>{a.notes}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, ...S.muted }}>{loading ? 'Loading…' : 'No activity yet.'}</span>
                )}
              </Section>
            )}

            {/* Source */}
            <Section title="Source">
              <Row label="Provider">{{ google_places: 'Google Places', google_places_legacy: 'Google Places (legacy)', manual: 'Entered manually' }[b.provider] || b.provider}</Row>
              <Row label="First found">{fmtDateTime(b.created_at)}</Row>
              {detail?.searches?.length ? (
                <Row label="Found in">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {detail.searches.map((s) => (
                      <span key={s.id} style={{ fontSize: 12 }}>
                        {s.label} <span style={S.dim}>· {fmtDateTime(s.created_at)}</span>
                      </span>
                    ))}
                  </div>
                </Row>
              ) : null}
              {b.email && <Row label="Email source"><span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}><Mail size={11} /> {b.email_source || 'provider'}</span></Row>}
            </Section>
          </Motion.aside>,
        ]}
    </AnimatePresence>
  ,
    document.body,
  )
}

function MiniStat({ label, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: '#fff' }}>{children}</div>
    </div>
  )
}
