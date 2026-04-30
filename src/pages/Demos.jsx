import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Dumbbell,
  Trash2,
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
  background: 'rgba(17,17,20,0.7)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.5rem',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const glassCardStyle = {
  background: 'rgba(17,17,20,0.55)',
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
  { key: 'restaurant', name: 'Restaurant', icon: Lock, available: false },
  { key: 'salon', name: 'Salon / Barbershop', icon: Lock, available: false },
  { key: 'plumber', name: 'Plumber / Trades', icon: Lock, available: false },
  { key: 'realestate', name: 'Real Estate', icon: Lock, available: false },
  { key: 'medspa', name: 'Med Spa', icon: Lock, available: false },
]

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
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <button type="button" style={ghostButtonStyle} onClick={copy}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

export default function Demos() {
  const isMobile = useIsMobile()
  const [demos, setDemos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState(null)

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

  const stats = useMemo(() => {
    const total = demos.length
    let sent = 0
    let viewed = 0
    let closed = 0
    for (const d of demos) {
      if (d.status === 'sent') sent += 1
      if ((d.view_count || 0) > 0 || d.status === 'viewed' || d.status === 'interested')
        viewed += 1
      if (d.status === 'closed') closed += 1
    }
    return { total, sent, viewed, closed }
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
              color: '#ff8888',
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
                  <th style={tableHeaderCell}>Status</th>
                  <th style={tableHeaderCell}>Views</th>
                  <th style={{ ...tableHeaderCell, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demos.map((demo) => {
                  const url = `${origin}/demo/${demo.slug}`
                  return (
                    <tr key={demo.id}>
                      <td style={tableCellBase}>
                        <div style={{ color: '#ffffff', fontWeight: 600 }}>
                          {demo.business_name}
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
                      </td>
                      <td style={{ ...tableCellBase, textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 6,
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                          }}
                        >
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
              background: '#1a1a1e',
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
