import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  ExternalLink,
  Copy,
  Check,
  Dumbbell,
  Trash2,
  Wrench,
  Home,
  Sparkles,
  Wind,
  Hammer,
  MessageCircle,
} from 'lucide-react'
import db from '@/lib/db'
import PageShell from '../components/PageShell'
import CreateDemoModal from '../components/CreateDemoModal'
import useIsMobile from '../utils/useIsMobile'

const STATUSES = ['draft', 'sent', 'viewed', 'interested', 'closed']

const STATUS_STYLES = {
  draft: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' },
  sent: { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' },
  viewed: { bg: 'rgba(255,255,255,0.18)', color: '#ffffff' },
  interested: { bg: 'rgba(255,255,255,0.25)', color: '#ffffff' },
  closed: { bg: '#ffffff', color: '#000000' },
}

const pageHeadingStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const pageSubStyle = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.45)',
  marginTop: 6,
}

const cardStyle = {
  background: 'rgba(17, 17, 17,0.7)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.5rem',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const glassCardStyle = {
  background: 'rgba(17, 17, 17,0.55)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const statPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 999,
  padding: '8px 16px',
}

const statLabelStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

const statNumberStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const addButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  cursor: 'pointer',
}

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.75)',
  borderRadius: 8,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
}

const tableHeaderCell = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.02)',
}

const tableCellBase = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.75)',
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
}

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
}

const TEMPLATES = [
  { key: 'gym', name: 'Gym / Fitness', icon: Dumbbell, available: true },
  { key: 'plumber', name: 'Plumber', icon: Wrench, available: true },
  { key: 'realestate', name: 'Real Estate', icon: Home, available: true },
  { key: 'medspa', name: 'Med Spa', icon: Sparkles, available: true },
  { key: 'hvac', name: 'HVAC', icon: Wind, available: true },
  { key: 'roofing', name: 'Roofing', icon: Hammer, available: true },
]

const THEME_BADGES = {
  eclipse: {
    label: 'Eclipse',
    glyph: '\u{1F311}',
    bg: 'rgba(255,255,255,0.10)',
    color: 'rgba(170, 170, 170,0.95)',
    border: 'rgba(255,255,255,0.22)',
  },
  ember: {
    label: 'Ember',
    glyph: '\u{1F525}',
    bg: 'rgba(170, 170, 170,0.13)',
    color: 'rgba(170, 170, 170,0.95)',
    border: 'rgba(170, 170, 170,0.28)',
  },
  pearl: {
    label: 'Pearl',
    glyph: '\u{2B1C}',
    bg: 'rgba(255,255,255,0.10)',
    color: 'rgba(255,255,255,0.92)',
    border: 'rgba(255,255,255,0.22)',
  },
  titan: {
    label: 'Titan',
    glyph: '\u{2B1B}',
    bg: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.85)',
    border: 'rgba(255,255,255,0.16)',
  },
  pulse: {
    label: 'Pulse',
    glyph: '\u{26A1}',
    bg: 'rgba(255, 255, 255,0.10)',
    color: 'rgba(255, 255, 255,0.95)',
    border: 'rgba(255, 255, 255,0.28)',
  },
}

function relativeTime(date) {
  if (!date) return null
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return null
  const seconds = Math.floor((Date.now() - t) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString()
}

function isRecentlyViewed(date) {
  if (!date) return false
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < 24 * 60 * 60 * 1000
}

function StatusPill({ status }) {
  const conf = STATUS_STYLES[status] || STATUS_STYLES.draft
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        background: conf.bg,
        color: conf.color,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'lowercase',
      }}
    >
      {status || 'draft'}
    </span>
  )
}

function CopyLinkButton({ url }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <button type="button" style={ghostButtonStyle} onClick={copy}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}

function buildWhatsAppMessage(demo, url, lang) {
  const name = demo.client_name || 'there'
  if (lang === 'pap') {
    return `Halo ${name}! 👋 Mi a prepara un demo di con bo negoshi por mira online. Echa un vistazo: ${url} — Laga mi sa kico bo ta pensa! Bo por pidi cambionan. — Eugene, Lithos Labs`
  }
  return `Hi ${name}! 👋 I put together a quick demo of what your business could look like online. Take a look: ${url} — Let me know what you think! Feel free to request any changes. — Eugene, Lithos Labs`
}

function SendWhatsAppButton({ demo, url, lang, setLang }) {
  function send() {
    const msg = buildWhatsAppMessage(demo, url, lang)
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }
  const wrapStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
  }
  const langBtn = (active) => ({
    padding: '5px 8px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    border: 'none',
    cursor: 'pointer',
  })
  return (
    <div style={wrapStyle}>
      <button type="button" onClick={() => setLang(demo.id, 'en')} style={langBtn(lang === 'en')}>
        EN
      </button>
      <button type="button" onClick={() => setLang(demo.id, 'pap')} style={langBtn(lang === 'pap')}>
        PAP
      </button>
      <button
        type="button"
        onClick={send}
        style={{
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          background: '#25D366',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <MessageCircle size={11} />
        Send
      </button>
    </div>
  )
}

export default function Demos() {
  const isMobile = useIsMobile()
  const [demos, setDemos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [whatsappLang, setWhatsappLang] = useState({})

  function setLangFor(id, lang) {
    setWhatsappLang((prev) => ({ ...prev, [id]: lang }))
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  async function fetchDemos() {
    if (!db) {
      setLoading(false)
      setError('Database not connected.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await db.query('SELECT * FROM demos ORDER BY created_at DESC')
      setDemos(rows || [])
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load demos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDemos()
  }, [])

  // Poll every 30s for new views; toast when a previously-unviewed demo gets a view
  useEffect(() => {
    if (!db) return
    const interval = setInterval(async () => {
      try {
        const rows = await db.query('SELECT * FROM demos ORDER BY created_at DESC')
        if (!rows) return
        setDemos((prev) => {
          const prevById = new Map(prev.map((d) => [d.id, d]))
          for (const fresh of rows) {
            const old = prevById.get(fresh.id)
            if (
              old &&
              (fresh.view_count || 0) > (old.view_count || 0)
            ) {
              setToast(`📱 ${fresh.business_name} just viewed their demo!`)
            }
          }
          return rows
        })
      } catch (err) {
        console.error(err)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const total = demos.length
    let sent = 0
    let viewed = 0
    let viewedToday = 0
    let closed = 0
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    for (const d of demos) {
      if (d.status === 'sent') sent += 1
      if ((d.view_count || 0) > 0 || d.status === 'viewed' || d.status === 'interested')
        viewed += 1
      if (d.last_viewed_at && new Date(d.last_viewed_at) >= dayStart) viewedToday += 1
      if (d.status === 'closed') closed += 1
    }
    return { total, sent, viewed, viewedToday, closed }
  }, [demos])

  async function changeStatus(demo, newStatus) {
    setDemos((prev) => prev.map((d) => (d.id === demo.id ? { ...d, status: newStatus } : d)))
    try {
      await db.query('UPDATE demos SET status = $1 WHERE id = $2', [newStatus, demo.id])
    } catch (err) {
      console.error(err)
      setDemos((prev) => prev.map((d) => (d.id === demo.id ? { ...d, status: demo.status } : d)))
    }
  }

  async function deleteDemo(demo) {
    if (!confirm(`Delete demo for ${demo.business_name}?`)) return
    setDemos((prev) => prev.filter((d) => d.id !== demo.id))
    try {
      await db.query('DELETE FROM demos WHERE id = $1', [demo.id])
      setToast('Demo deleted')
    } catch (err) {
      console.error(err)
      fetchDemos()
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={pageHeadingStyle}>Demos</h2>
          <p style={pageSubStyle}>Personalized previews you can share with prospects</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} style={addButtonStyle}>
          <Plus size={14} strokeWidth={2.5} />
          Create Demo
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Total</span>
          <span style={statNumberStyle}>{stats.total}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Sent</span>
          <span style={statNumberStyle}>{stats.sent}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Viewed</span>
          <span style={statNumberStyle}>{stats.viewed}</span>
        </div>
        <div
          style={{
            ...statPillStyle,
            ...(stats.viewedToday > 0
              ? {
                  borderColor: 'rgba(255,255,255,0.25)',
                  background: 'rgba(255,255,255,0.07)',
                }
              : {}),
          }}
        >
          <span style={statLabelStyle}>Viewed Today</span>
          <span style={statNumberStyle}>{stats.viewedToday}</span>
          {stats.viewedToday > 0 && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#fff',
                animation: 'glowPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Closed</span>
          <span style={statNumberStyle}>{stats.closed}</span>
        </div>
      </div>

      <div>
        <div style={{ ...sectionLabelStyle, marginBottom: 12 }}>Templates</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? 'repeat(2, minmax(0, 1fr))'
              : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon
            return (
              <motion.div
                key={tpl.key}
                whileHover={tpl.available ? { borderColor: 'rgba(255,255,255,0.18)', y: -2 } : {}}
                transition={{ duration: 0.2 }}
                style={{
                  ...cardStyle,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  opacity: tpl.available ? 1 : 0.5,
                  cursor: tpl.available ? 'pointer' : 'default',
                }}
                onClick={() => tpl.available && setModalOpen(true)}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{tpl.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  {tpl.available ? 'Ready to use' : 'Coming soon'}
                </div>
                {tpl.available && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {[
                      {
                        key: 'eclipse',
                        title: 'Eclipse · Dark Glass',
                        bg: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
                        border: 'rgba(255,255,255,0.18)',
                        accent: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.25), transparent 60%)',
                      },
                      {
                        key: 'ember',
                        title: 'Ember · Warm Premium',
                        bg: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
                        border: 'rgba(170, 170, 170,0.18)',
                        accent: 'radial-gradient(circle at 80% 50%, rgba(170, 170, 170,0.3), transparent 60%)',
                      },
                      {
                        key: 'pearl',
                        title: 'Pearl · Light Minimal',
                        bg: 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 100%)',
                        border: 'rgba(0,0,0,0.15)',
                        accent: 'radial-gradient(circle at 30% 50%, rgba(0,0,0,0.12), transparent 60%)',
                      },
                      {
                        key: 'titan',
                        title: 'Titan · Bold Agency',
                        bg: '#0A0A0A',
                        border: 'rgba(255,255,255,0.2)',
                        accent: 'linear-gradient(180deg, transparent 0%, transparent 60%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,0.4) 80%, transparent 80%)',
                      },
                      {
                        key: 'pulse',
                        title: 'Pulse · Neon Cyber',
                        bg: 'linear-gradient(135deg, #000000 0%, #0A0A0A 100%)',
                        border: 'rgba(255, 255, 255,0.25)',
                        accent: 'radial-gradient(circle at 80% 50%, rgba(255, 255, 255,0.35), transparent 60%)',
                      },
                    ].map((sw) => (
                      <div
                        key={sw.key}
                        title={sw.title}
                        style={{
                          flex: 1,
                          height: 16,
                          borderRadius: 4,
                          background: sw.bg,
                          border: `1px solid ${sw.border}`,
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: sw.accent,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      <div style={glassCardStyle}>
        {loading ? (
          <div
            style={{
              padding: '4rem 1rem',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13,
            }}
          >
            Loading demos...
          </div>
        ) : error ? (
          <div
            style={{
              padding: '4rem 1rem',
              textAlign: 'center',
              color: '#FF4444',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : demos.length === 0 ? (
          <div
            style={{
              padding: '4rem 1rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, color: '#ffffff', fontWeight: 500 }}>
              No demos yet
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
                marginTop: 6,
              }}
            >
              Create your first personalized demo to share with prospects
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{ ...addButtonStyle, marginTop: 18 }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Create Demo
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderCell}>Business</th>
                  <th style={tableHeaderCell}>Template</th>
                  <th style={tableHeaderCell}>Theme</th>
                  <th style={tableHeaderCell}>Status</th>
                  <th style={tableHeaderCell}>Views</th>
                  <th style={{ ...tableHeaderCell, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demos.map((demo) => {
                  const url = `${origin}/demo/${demo.slug}`
                  const recent = isRecentlyViewed(demo.last_viewed_at)
                  const lang = whatsappLang[demo.id] || 'en'
                  return (
                    <tr
                      key={demo.id}
                      style={
                        recent
                          ? {
                              boxShadow: 'inset 2px 0 0 0 rgba(255,255,255,0.5)',
                              background: 'rgba(255,255,255,0.02)',
                            }
                          : undefined
                      }
                    >
                      <td style={tableCellBase}>
                        <div
                          style={{
                            color: '#ffffff',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          {demo.business_name}
                          {recent && (
                            <span
                              title="Recently viewed"
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: '#fff',
                                boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                                animation: 'glowPulse 1.5s ease-in-out infinite',
                              }}
                            />
                          )}
                        </div>
                        {demo.client_name && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.4)',
                              marginTop: 2,
                            }}
                          >
                            {demo.client_name}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tableCellBase, textTransform: 'capitalize' }}>
                        {demo.template}
                      </td>
                      <td style={tableCellBase}>
                        {(() => {
                          const themeRaw = (demo.config?.theme || demo.config?.style || 'eclipse').toLowerCase()
                          const themeKey =
                            themeRaw === 'premium'
                              ? 'ember'
                              : themeRaw === 'classic'
                                ? 'eclipse'
                                : themeRaw
                          const meta =
                            THEME_BADGES[themeKey] || THEME_BADGES.eclipse
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '3px 10px',
                                borderRadius: 999,
                                background: meta.bg,
                                color: meta.color,
                                border: `1px solid ${meta.border}`,
                                fontSize: 11,
                                fontWeight: 500,
                                letterSpacing: '0.02em',
                              }}
                            >
                              <span style={{ fontSize: 12, lineHeight: 1 }}>
                                {meta.glyph}
                              </span>
                              {meta.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td style={tableCellBase}>
                        <select
                          value={demo.status || 'draft'}
                          onChange={(e) => changeStatus(demo, e.target.value)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8,
                            color: '#ffffff',
                            padding: '4px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tableCellBase}>
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>
                          {demo.view_count || 0}
                        </span>
                        {demo.last_viewed_at && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.4)',
                              marginTop: 2,
                            }}
                          >
                            Viewed {relativeTime(demo.last_viewed_at)}
                          </div>
                        )}
                      </td>
                      <td style={{ ...tableCellBase, textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 6,
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flexWrap: 'wrap',
                          }}
                        >
                          <SendWhatsAppButton
                            demo={demo}
                            url={url}
                            lang={lang}
                            setLang={setLangFor}
                          />
                          <CopyLinkButton url={url} />
                          <a
                            href={`/demo/${demo.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            style={ghostButtonStyle}
                          >
                            <ExternalLink size={11} />
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteDemo(demo)}
                            style={{
                              ...ghostButtonStyle,
                              padding: '5px 8px',
                              color: 'rgba(255,255,255,0.3)',
                            }}
                            aria-label="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateDemoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(demo) => {
          if (demo) {
            setDemos((prev) => [demo, ...prev])
            setToast('Demo created ✓')
          }
        }}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#1A1A1A',
              color: '#ffffff',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 500,
              zIndex: 200,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
