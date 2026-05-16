import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useIsMobile from '../utils/useIsMobile'

// ===== Lithos Labs Sales Portal =====
const BG = '#0B0B0D'
const BEIGE = '#C2B59B'
const WHITE = '#F5F5F2'
const MUTED = 'rgba(245,245,242,0.55)'
const FAINT = 'rgba(245,245,242,0.35)'
const CARD = 'rgba(194,181,155,0.04)'
const CARD_BORDER = '0.5px solid rgba(194,181,155,0.1)'
const AUTH_KEY = 'lithos_rep_auth'

const STATUS_COLORS = {
  new: '#9ca3af',
  contacted: '#60a5fa',
  interested: '#c084fc',
  demo_booked: '#fbbf24',
  proposal_sent: '#fb923c',
  closed_won: '#4ade80',
  closed_lost: '#f87171',
  not_interested: '#f87171',
}
const STATUS_LABEL = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  demo_booked: 'Demo Booked',
  proposal_sent: 'Proposal Sent',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
  not_interested: 'Not Interested',
}
const PIPELINE = [
  { key: 'new', label: 'New', color: '#9ca3af' },
  { key: 'contacted', label: 'Contacted', color: '#60a5fa' },
  { key: 'interested', label: 'Interested', color: '#c084fc' },
  { key: 'demo_booked', label: 'Demo', color: '#fbbf24' },
  { key: 'proposal_sent', label: 'Proposal', color: '#fb923c' },
  { key: 'closed_won', label: 'Closed', color: '#4ade80' },
]
const DEAL_BADGE = {
  pending_approval: { c: '#fbbf24', l: 'Pending Approval' },
  approved: { c: '#4ade80', l: 'Approved' },
  rejected: { c: '#f87171', l: 'Rejected' },
  commission_paid: { c: BEIGE, l: 'Commission Paid' },
}

async function api(action, { method = 'GET', body, params } = {}) {
  if (method === 'GET') {
    const qs = new URLSearchParams({ action, ...(params || {}) }).toString()
    const r = await fetch(`/api/workflow?${qs}`)
    return r.json()
  }
  const r = await fetch('/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...(body || {}) }),
  })
  return r.json()
}

function timeAgo(d) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString()
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function initials(name) {
  return String(name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ---- icons (inline SVG) ----
const Ic = {
  phone: 'M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2A16 16 0 013 5z',
  mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
  calendar: 'M4 6h16v15H4z M8 3v4 M16 3v4 M4 10h16',
  file: 'M6 3h8l4 4v14H6z M14 3v4h4',
  check: 'M4 12l5 5L20 6',
  edit: 'M4 20h4L18 10l-4-4L4 16z',
  bell: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6 M10 21h4',
}
function Icon({ d, size = 14, color = MUTED }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d={d}
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
const ACT_ICON = {
  call: Ic.phone,
  email: Ic.mail,
  demo: Ic.calendar,
  proposal: Ic.file,
  status_change: Ic.check,
  note: Ic.edit,
}

function input(extra = {}) {
  return {
    width: '100%',
    background: 'rgba(0,0,0,0.35)',
    border: '0.5px solid rgba(194,181,155,0.2)',
    borderRadius: 10,
    padding: '12px 14px',
    color: WHITE,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    ...extra,
  }
}
function beigeBtn(extra = {}) {
  return {
    background: BEIGE,
    color: BG,
    fontWeight: 600,
    border: 'none',
    borderRadius: 10,
    padding: '12px 18px',
    fontSize: 14,
    cursor: 'pointer',
    minHeight: 44,
    ...extra,
  }
}

// ===================== LOGIN =====================
function LoginScreen({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e?.preventDefault()
    setErr('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const d = await api('rep_login', {
          method: 'POST',
          body: { email, password },
        })
        if (d.success) {
          localStorage.setItem(AUTH_KEY, JSON.stringify(d.rep))
          onAuthed(d.rep)
        } else setErr(d.error || 'Login failed')
      } else {
        const d = await api('rep_register', {
          method: 'POST',
          body: { name, email, password, invite_code: invite },
        })
        if (d.success) {
          const rep = { ...d.rep, commission_rate: 10 }
          localStorage.setItem(AUTH_KEY, JSON.stringify(rep))
          onAuthed(rep)
        } else setErr(d.error || 'Registration failed')
      }
    } catch {
      setErr('Network error — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 26, letterSpacing: '-0.5px' }}>
          <span style={{ fontWeight: 700, color: WHITE }}>Lithos</span>
          <span style={{ fontWeight: 300, color: BEIGE }}> Labs</span>
        </div>
        <div
          style={{
            color: BEIGE,
            fontSize: 13,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          Sales Portal
        </div>
      </div>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(194,181,155,0.05)',
          border: '0.5px solid rgba(194,181,155,0.1)',
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {mode === 'register' && (
          <input
            style={input()}
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          style={input()}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={input()}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === 'register' && (
          <input
            style={input()}
            placeholder="Invite code"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            required
          />
        )}
        {err && (
          <div style={{ color: '#f87171', fontSize: 13 }}>{err}</div>
        )}
        <button type="submit" disabled={busy} style={beigeBtn({ width: '100%' })}>
          {busy
            ? 'Please wait…'
            : mode === 'login'
            ? 'Login'
            : 'Register'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setErr('')
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: MUTED,
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          {mode === 'login'
            ? 'New rep? Register with invite code'
            : 'Have an account? Login'}
        </button>
      </motion.form>
    </div>
  )
}

// ===================== SHARED UI =====================
function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || '#9ca3af'
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: '3px 9px',
        borderRadius: 999,
        background: `${c}1f`,
        border: `0.5px solid ${c}55`,
        color: c,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status] || status}
    </span>
  )
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          style={{
            position: 'fixed',
            top: 70,
            right: 16,
            zIndex: 300,
            background: 'rgba(20,18,16,0.97)',
            border: `0.5px solid ${
              toast.kind === 'error' ? 'rgba(248,113,113,0.5)' : 'rgba(194,181,155,0.5)'
            }`,
            color: toast.kind === 'error' ? '#f87171' : BEIGE,
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 13,
            maxWidth: 320,
          }}
        >
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: CARD,
        border: CARD_BORDER,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: MUTED,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: accent ? BEIGE : WHITE,
          marginTop: 6,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: FAINT, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

// ===================== DASHBOARD TAB =====================
function DashboardTab({ rep, leads, deals, leaderboard, overdue, kpis, isMobile, goTab }) {
  const today = kpis || {}
  const dealsClosed = deals.filter((d) =>
    ['approved', 'commission_paid'].includes(d.status),
  ).length
  const commission = deals
    .filter((d) => ['approved', 'commission_paid'].includes(d.status))
    .reduce((s, d) => s + Number(d.commission_amount || 0), 0)
  const counts = PIPELINE.reduce((acc, p) => {
    acc[p.key] = leads.filter((l) => l.status === p.key).length
    return acc
  }, {})
  const activities = leads
    .flatMap((l) =>
      (l._activities || []).map((a) => ({ ...a, company: l.company_name })),
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)
  const upcoming = leads
    .filter((l) => l.next_followup)
    .sort((a, b) => new Date(a.next_followup) - new Date(b.next_followup))
    .slice(0, 5)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 24, fontWeight: 600, color: WHITE }}>
          {greet}, {rep.name?.split(' ')[0]}
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
          {new Date().toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      {overdue.length > 0 && (
        <div
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '0.5px solid rgba(251,191,36,0.3)',
            borderRadius: 10,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span style={{ color: '#fbbf24', fontSize: 13 }}>
            {overdue.length} overdue follow-up{overdue.length > 1 ? 's' : ''} need attention
          </span>
          <button
            onClick={() => goTab('leads')}
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(251,191,36,0.4)',
              color: '#fbbf24',
              borderRadius: 8,
              padding: '5px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            View
          </button>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)',
          gap: 10,
        }}
      >
        <KpiCard label="Leads Added" value={today.leads_added || 0} sub="today" />
        <KpiCard label="Calls Made" value={today.calls_made || 0} sub="today" />
        <KpiCard label="Deals Closed" value={dealsClosed} sub="total" />
        <KpiCard
          label="Commission Earned"
          value={fmtMoney(commission)}
          sub="total"
          accent
        />
      </div>

      <div
        style={{
          background: CARD,
          border: CARD_BORDER,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
          Pipeline
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {PIPELINE.map((p) => (
            <div
              key={p.key}
              style={{
                flex: '1 0 90px',
                textAlign: 'center',
                padding: '10px 6px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: p.color,
                  margin: '0 auto 6px',
                }}
              />
              <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
                {counts[p.key]}
              </div>
              <div style={{ fontSize: 10, color: FAINT }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 12,
        }}
      >
        <div
          style={{
            background: CARD,
            border: CARD_BORDER,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
            Recent Activity
          </div>
          {activities.length === 0 && (
            <div style={{ fontSize: 12, color: FAINT }}>No activity yet</div>
          )}
          {activities.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '6px 0',
              }}
            >
              <Icon d={ACT_ICON[a.activity_type] || Ic.edit} color={BEIGE} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: WHITE }}>
                  {a.company} — {a.description}
                </div>
                <div style={{ fontSize: 10.5, color: FAINT }}>
                  {timeAgo(a.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: CARD,
            border: CARD_BORDER,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
            Upcoming Follow-ups
          </div>
          {upcoming.length === 0 && (
            <div style={{ fontSize: 12, color: FAINT }}>Nothing scheduled</div>
          )}
          {upcoming.map((l) => {
            const od = new Date(l.next_followup) <= new Date()
            return (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '6px 0',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: WHITE }}>
                    {od && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#f87171',
                          marginRight: 6,
                        }}
                      />
                    )}
                    {l.company_name}
                  </div>
                  <div style={{ fontSize: 10.5, color: FAINT }}>
                    {l.contact_name} · {fmtDate(l.next_followup)}
                  </div>
                </div>
                <StatusPill status={l.status} />
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          background: CARD,
          border: CARD_BORDER,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
          Leaderboard — Top 3
        </div>
        {leaderboard.slice(0, 3).map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0',
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: ['#FFD700', '#C0C0C0', '#CD7F32'][i],
                width: 20,
              }}
            >
              #{i + 1}
            </span>
            <span style={{ flex: 1, color: WHITE, fontSize: 13 }}>
              {r.name}
            </span>
            <span style={{ color: BEIGE, fontSize: 13, fontWeight: 600 }}>
              {fmtMoney(r.revenue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== LEADS TAB =====================
function LeadsTab({ rep, leads, reload, toast, isMobile, onAddLead }) {
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const filters = [
    'all',
    'new',
    'contacted',
    'interested',
    'demo_booked',
    'proposal_sent',
    'closed_won',
    'closed_lost',
  ]
  const shown =
    filter === 'all' ? leads : leads.filter((l) => l.status === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
          My Leads{' '}
          <span style={{ fontSize: 13, color: MUTED }}>({leads.length})</span>
        </div>
        <button onClick={onAddLead} style={beigeBtn({ padding: '8px 14px' })}>
          + Add Lead
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              background:
                filter === f ? 'rgba(194,181,155,0.15)' : 'transparent',
              border: '0.5px solid rgba(194,181,155,0.15)',
              color: filter === f ? BEIGE : MUTED,
            }}
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {shown.length === 0 && (
        <div style={{ color: FAINT, fontSize: 13, padding: 20, textAlign: 'center' }}>
          No leads here yet
        </div>
      )}
      {shown.map((l) => (
        <LeadCard
          key={l.id}
          lead={l}
          rep={rep}
          open={openId === l.id}
          onToggle={() => setOpenId(openId === l.id ? null : l.id)}
          reload={reload}
          toast={toast}
          isMobile={isMobile}
        />
      ))}
    </div>
  )
}

function LeadCard({ lead, rep, open, onToggle, reload, toast, isMobile }) {
  const [actType, setActType] = useState('call')
  const [actDesc, setActDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const nextStatuses = {
    new: ['contacted', 'not_interested'],
    contacted: ['interested', 'closed_lost'],
    interested: ['demo_booked', 'closed_lost'],
    demo_booked: ['proposal_sent', 'closed_lost'],
    proposal_sent: ['closed_won', 'closed_lost'],
  }

  async function setStatus(status) {
    setBusy(true)
    await api('update_lead_status', {
      method: 'POST',
      body: { lead_id: lead.id, rep_id: rep.id, status },
    })
    setBusy(false)
    toast(`Moved to ${STATUS_LABEL[status]}`)
    reload()
  }
  async function addActivity() {
    if (!actDesc.trim()) return
    setBusy(true)
    await api('add_activity', {
      method: 'POST',
      body: {
        lead_id: lead.id,
        rep_id: rep.id,
        activity_type: actType,
        description: actDesc,
      },
    })
    setActDesc('')
    setBusy(false)
    toast('Activity logged')
    reload()
  }

  return (
    <motion.div
      layout
      style={{
        background: 'rgba(194,181,155,0.03)',
        border: CARD_BORDER,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
            {lead.company_name}
          </div>
          <div style={{ fontSize: 11.5, color: MUTED }}>
            {lead.contact_name || '—'} · {lead.source}
          </div>
        </div>
        {lead.estimated_value ? (
          <span style={{ fontSize: 12, color: BEIGE, fontWeight: 600 }}>
            {fmtMoney(lead.estimated_value)}
          </span>
        ) : null}
        <StatusPill status={lead.status} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: 12 }}
          >
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                fontSize: 12.5,
                color: MUTED,
                marginBottom: 10,
              }}
            >
              {lead.contact_email && (
                <a href={`mailto:${lead.contact_email}`} style={{ color: BEIGE }}>
                  {lead.contact_email}
                </a>
              )}
              {lead.contact_phone && (
                <a href={`tel:${lead.contact_phone}`} style={{ color: BEIGE }}>
                  {lead.contact_phone}
                </a>
              )}
              {lead.contact_whatsapp && (
                <a
                  href={`https://wa.me/${String(lead.contact_whatsapp).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#4ade80' }}
                >
                  WhatsApp
                </a>
              )}
            </div>
            {lead.notes && (
              <div
                style={{
                  fontSize: 12.5,
                  color: 'rgba(245,245,242,0.75)',
                  marginBottom: 10,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {lead.notes}
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              {(lead._activities || []).map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    padding: '4px 0',
                  }}
                >
                  <Icon d={ACT_ICON[a.activity_type] || Ic.edit} size={12} />
                  <span style={{ fontSize: 11.5, color: MUTED, flex: 1 }}>
                    {a.description}
                  </span>
                  <span style={{ fontSize: 10, color: FAINT }}>
                    {timeAgo(a.created_at)}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 10,
              }}
            >
              {(nextStatuses[lead.status] || []).map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => setStatus(s)}
                  style={{
                    fontSize: 11.5,
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: `${STATUS_COLORS[s]}1f`,
                    border: `0.5px solid ${STATUS_COLORS[s]}55`,
                    color: STATUS_COLORS[s],
                  }}
                >
                  → {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select
                value={actType}
                onChange={(e) => setActType(e.target.value)}
                style={input({ width: 'auto', padding: '8px 10px', fontSize: 12 })}
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="demo">Demo</option>
                <option value="note">Note</option>
              </select>
              <input
                value={actDesc}
                onChange={(e) => setActDesc(e.target.value)}
                placeholder="Activity description"
                style={input({ flex: 1, minWidth: 140, padding: '8px 10px', fontSize: 12 })}
              />
              <button
                disabled={busy}
                onClick={addActivity}
                style={beigeBtn({ padding: '8px 14px', minHeight: 36, fontSize: 12 })}
              >
                Log
              </button>
            </div>
            {lead.status === 'closed_won' && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: '#4ade80',
                }}
              >
                Won — submit a deal from the Deals tab.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ===================== ADD LEAD PANEL =====================
function AddLeadPanel({ rep, onClose, reload, toast, isMobile }) {
  const [f, setF] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_whatsapp: '',
    industry: '',
    location: '',
    source: 'cold_outreach',
    estimated_value: '',
    notes: '',
  })
  const [services, setServices] = useState([])
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function save() {
    if (!f.company_name.trim()) return
    setBusy(true)
    const d = await api('add_lead', {
      method: 'POST',
      body: {
        rep_id: rep.id,
        ...f,
        estimated_value: f.estimated_value ? Number(f.estimated_value) : null,
        service_interest: services,
      },
    })
    setBusy(false)
    if (d.success) {
      toast('Lead added')
      reload()
      onClose()
    } else toast(d.error || 'Failed', 'error')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        justifyContent: isMobile ? 'stretch' : 'flex-end',
      }}
    >
      <motion.div
        initial={{ x: isMobile ? 0 : 420, y: isMobile ? '100%' : 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: isMobile ? 0 : 420, y: isMobile ? '100%' : 0 }}
        transition={{ type: 'tween', duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG,
          borderLeft: isMobile ? 'none' : '0.5px solid rgba(194,181,155,0.1)',
          width: isMobile ? '100%' : 420,
          height: '100%',
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>
            Add Lead
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: MUTED,
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <input style={input()} placeholder="Company name *" value={f.company_name} onChange={set('company_name')} />
        <input style={input()} placeholder="Contact name" value={f.contact_name} onChange={set('contact_name')} />
        <input style={input()} placeholder="Email" value={f.contact_email} onChange={set('contact_email')} />
        <input style={input()} placeholder="Phone" value={f.contact_phone} onChange={set('contact_phone')} />
        <input style={input()} placeholder="WhatsApp" value={f.contact_whatsapp} onChange={set('contact_whatsapp')} />
        <input style={input()} placeholder="Industry" value={f.industry} onChange={set('industry')} />
        <input style={input()} placeholder="Location" value={f.location} onChange={set('location')} />
        <select style={input()} value={f.source} onChange={set('source')}>
          <option value="cold_outreach">Cold Outreach</option>
          <option value="referral">Referral</option>
          <option value="inbound">Inbound</option>
          <option value="event">Event</option>
          <option value="social">Social</option>
        </select>
        <input
          style={input()}
          placeholder="Estimated value"
          type="number"
          value={f.estimated_value}
          onChange={set('estimated_value')}
        />
        <textarea
          style={input({ minHeight: 70, resize: 'vertical' })}
          placeholder="Notes"
          value={f.notes}
          onChange={set('notes')}
        />
        <button disabled={busy} onClick={save} style={beigeBtn({ width: '100%' })}>
          {busy ? 'Saving…' : 'Save Lead'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ===================== DEALS TAB =====================
function DealsTab({ rep, deals, leads, services, reload, toast, isMobile }) {
  const [show, setShow] = useState(false)
  const earned = deals
    .filter((d) => ['approved', 'commission_paid'].includes(d.status))
    .reduce((s, d) => s + Number(d.commission_amount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
          My Deals
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 12,
              color: BEIGE,
              border: `0.5px solid rgba(194,181,155,0.4)`,
              borderRadius: 999,
              padding: '5px 12px',
            }}
          >
            Earned {fmtMoney(earned)}
          </span>
          <button onClick={() => setShow(true)} style={beigeBtn({ padding: '8px 14px' })}>
            + Submit Deal
          </button>
        </div>
      </div>
      {deals.length === 0 && (
        <div style={{ color: FAINT, fontSize: 13, padding: 20, textAlign: 'center' }}>
          No deals submitted yet
        </div>
      )}
      {deals.map((d) => {
        const b = DEAL_BADGE[d.status] || { c: MUTED, l: d.status }
        return (
          <div
            key={d.id}
            style={{
              background: 'rgba(194,181,155,0.03)',
              border: CARD_BORDER,
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
                {d.company_name} — {d.service_name}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED }}>
                {fmtMoney(d.deal_value)} · {fmtDate(d.created_at)}
              </div>
            </div>
            <span style={{ fontSize: 13, color: BEIGE, fontWeight: 600 }}>
              {fmtMoney(d.commission_amount)}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 999,
                background: `${b.c}1f`,
                border: `0.5px solid ${b.c}55`,
                color: b.c,
              }}
            >
              {b.l}
            </span>
          </div>
        )
      })}
      <AnimatePresence>
        {show && (
          <SubmitDealModal
            rep={rep}
            leads={leads}
            services={services}
            onClose={() => setShow(false)}
            reload={reload}
            toast={toast}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function SubmitDealModal({ rep, leads, services, onClose, reload, toast, isMobile }) {
  const won = leads.filter((l) => l.status === 'closed_won')
  const [leadId, setLeadId] = useState(won[0]?.id || '')
  const [svc, setSvc] = useState('')
  const [value, setValue] = useState('')
  const [rate, setRate] = useState(rep.commission_rate || 10)
  const [proof, setProof] = useState('')
  const [busy, setBusy] = useState(false)
  const commission = (Number(value) || 0) * (Number(rate) || 0) / 100

  function pickSvc(name) {
    setSvc(name)
    const s = services.find((x) => x.name === name)
    if (s) setRate(s.commission_rate)
  }
  async function submit() {
    if (!leadId || !svc || !value) {
      toast('Fill all fields', 'error')
      return
    }
    setBusy(true)
    const d = await api('submit_deal', {
      method: 'POST',
      body: {
        rep_id: rep.id,
        lead_id: leadId,
        service_name: svc,
        deal_value: Number(value),
        commission_rate: Number(rate),
        payment_proof_url: proof || null,
      },
    })
    setBusy(false)
    if (d.success) {
      toast('Deal submitted for approval')
      reload()
      onClose()
    } else toast(d.error || 'Failed', 'error')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 20,
      }}
    >
      <motion.div
        initial={{ scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 0 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG,
          border: '0.5px solid rgba(194,181,155,0.15)',
          borderRadius: isMobile ? 0 : 16,
          padding: 22,
          width: isMobile ? '100%' : 420,
          height: isMobile ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>
          Submit Deal
        </div>
        <select style={input()} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          <option value="">Select won lead…</option>
          {won.map((l) => (
            <option key={l.id} value={l.id}>
              {l.company_name}
            </option>
          ))}
        </select>
        <select style={input()} value={svc} onChange={(e) => pickSvc(e.target.value)}>
          <option value="">Select service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          style={input()}
          type="number"
          placeholder="Deal value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          style={input()}
          type="number"
          placeholder="Commission rate %"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: BEIGE,
            textAlign: 'center',
            padding: 8,
          }}
        >
          You earn: {fmtMoney(commission)}
        </div>
        <input
          style={input()}
          placeholder="Payment proof URL"
          value={proof}
          onChange={(e) => setProof(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={busy} onClick={submit} style={beigeBtn({ flex: 1 })}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '0.5px solid rgba(194,181,155,0.2)',
              color: MUTED,
              borderRadius: 10,
              padding: '12px 18px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ===================== LEADERBOARD TAB =====================
function LeaderboardTab({ rep, leaderboard }) {
  const rankColor = ['#FFD700', '#C0C0C0', '#CD7F32']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
        Top Performers
      </div>
      {leaderboard[0]?.id === rep.id && (
        <div
          style={{
            background: 'rgba(194,181,155,0.1)',
            border: `0.5px solid rgba(194,181,155,0.4)`,
            color: BEIGE,
            borderRadius: 10,
            padding: 12,
            fontSize: 13,
          }}
        >
          You're leading the team! 🏆
        </div>
      )}
      {leaderboard.map((r, i) => {
        const me = r.id === rep.id
        return (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(194,181,155,0.03)',
              border: me
                ? `0.5px solid ${BEIGE}`
                : CARD_BORDER,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: rankColor[i] || WHITE,
                width: 28,
              }}
            >
              #{i + 1}
            </span>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(194,181,155,0.15)',
                color: BEIGE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {initials(r.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: WHITE, fontWeight: 500 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: FAINT }}>
                {r.total_leads} leads · {r.deals_closed} deals
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: WHITE, fontWeight: 600 }}>
                {fmtMoney(r.revenue)}
              </div>
              <div style={{ fontSize: 11, color: BEIGE }}>
                {fmtMoney(r.earnings)} comm.
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ===================== SCRIPTS TAB =====================
function ScriptsTab({ services, toast }) {
  const [objection, setObjection] = useState('')
  const [aiResp, setAiResp] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [openAcc, setOpenAcc] = useState(null)

  async function askAI() {
    if (!objection.trim()) return
    setLoadingAI(true)
    setAiResp('')
    try {
      const d = await api('objection_help', {
        method: 'POST',
        body: { objection },
      })
      setAiResp(d.success ? d.response : d.error || 'No response')
    } catch {
      setAiResp('Network error')
    } finally {
      setLoadingAI(false)
    }
  }
  function copyPitch(s) {
    const t = `Hi, I'm calling from Lithos Labs. We help businesses like yours ${s.description}. Our ${s.name} starts from ${fmtMoney(s.price_min)}. Would you have 10 minutes to learn more?`
    navigator.clipboard?.writeText(t)
    toast('Pitch copied')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
        Sales Resources
      </div>

      <div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>
          Services & Pricing
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))',
            gap: 10,
          }}
        >
          {services.map((s) => (
            <div
              key={s.id}
              style={{
                background: CARD,
                border: CARD_BORDER,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
                {s.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: BEIGE,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: '4px 0',
                }}
              >
                {s.category}
              </div>
              <div style={{ fontSize: 12, color: MUTED }}>
                {fmtMoney(s.price_min)} – {fmtMoney(s.price_max)}
              </div>
              <div style={{ fontSize: 12, color: BEIGE, marginTop: 4 }}>
                Commission {s.commission_rate}%
              </div>
              <button
                onClick={() => copyPitch(s)}
                style={{
                  marginTop: 8,
                  width: '100%',
                  fontSize: 12,
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: 'rgba(194,181,155,0.1)',
                  border: '0.5px solid rgba(194,181,155,0.3)',
                  color: BEIGE,
                  cursor: 'pointer',
                }}
              >
                Copy Pitch
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>
          Cold Call Scripts
        </div>
        {['CRM Setup', 'AI Marketing System', 'Website Development'].map((title) => (
          <div
            key={title}
            style={{
              background: CARD,
              border: CARD_BORDER,
              borderRadius: 10,
              marginBottom: 8,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpenAcc(openAcc === title ? null : title)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                color: WHITE,
                fontSize: 13.5,
                fontWeight: 500,
                padding: 14,
                cursor: 'pointer',
              }}
            >
              {title}
            </button>
            <AnimatePresence>
              {openAcc === title && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{
                    overflow: 'hidden',
                    padding: '0 14px 14px',
                    fontSize: 12.5,
                    color: 'rgba(245,245,242,0.75)',
                    lineHeight: 1.6,
                  }}
                >
                  <p>
                    <b style={{ color: BEIGE }}>Opening:</b> Hi, this is [name]
                    from Lithos Labs. We build {title.toLowerCase()} systems for
                    growing businesses — do you have a quick minute?
                  </p>
                  <p>
                    <b style={{ color: BEIGE }}>Discovery:</b> How are you
                    currently handling this? What's the biggest bottleneck? What
                    would solving it be worth to you?
                  </p>
                  <p>
                    <b style={{ color: BEIGE }}>Objections:</b> "Too expensive"
                    → reframe to ROI. "We have a system" → ask what's missing.
                    "Not now" → book a follow-up.
                  </p>
                  <p>
                    <b style={{ color: BEIGE }}>Close:</b> Let's get 20 minutes
                    on the calendar so I can show you exactly how this works for
                    your business. Does Thursday or Friday work better?
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div
        style={{
          background: CARD,
          border: CARD_BORDER,
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 8 }}>
          Handle Any Objection with AI
        </div>
        <textarea
          value={objection}
          onChange={(e) => setObjection(e.target.value)}
          placeholder="Type the objection you heard... e.g. We already have a CRM"
          style={input({ minHeight: 70, resize: 'vertical', marginBottom: 8 })}
        />
        <button
          onClick={askAI}
          disabled={loadingAI}
          style={beigeBtn({ width: '100%' })}
        >
          {loadingAI ? 'Thinking…' : 'Get AI Response'}
        </button>
        {aiResp && (
          <div
            style={{
              marginTop: 12,
              background: 'rgba(194,181,155,0.06)',
              border: `0.5px solid rgba(194,181,155,0.3)`,
              borderRadius: 10,
              padding: 14,
              fontSize: 13,
              color: WHITE,
              lineHeight: 1.6,
            }}
          >
            {aiResp}
            <button
              onClick={() => {
                navigator.clipboard?.writeText(aiResp)
                toast('Copied')
              }}
              style={{
                display: 'block',
                marginTop: 10,
                fontSize: 11,
                background: 'transparent',
                border: '0.5px solid rgba(194,181,155,0.3)',
                color: BEIGE,
                borderRadius: 8,
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===================== ADMIN TAB =====================
function AdminTab({ rep, toast }) {
  const [sub, setSub] = useState('pending')
  const [pending, setPending] = useState([])
  const [reps, setReps] = useState([])
  const [services, setServices] = useState([])

  const load = useCallback(async () => {
    const [pd, ar, sc] = await Promise.all([
      api('admin_deals', { params: { status: 'pending_approval' } }),
      api('admin_all_reps'),
      api('services_catalog'),
    ])
    setPending(pd.deals || [])
    setReps(ar.reps || [])
    setServices(sc.services || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function decide(deal, approved, notes) {
    await api('approve_deal', {
      method: 'POST',
      body: {
        deal_id: deal.id,
        admin_id: rep.id,
        approved,
        admin_notes: notes,
      },
    })
    setPending((p) => p.filter((x) => x.id !== deal.id))
    toast(approved ? 'Deal approved' : 'Deal rejected')
  }
  async function markPaid(dealId) {
    await api('mark_commission_paid', { method: 'POST', body: { deal_id: dealId } })
    toast('Marked commission paid')
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>Admin</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          ['pending', 'Pending Deals'],
          ['reps', 'All Reps'],
          ['settings', 'Settings'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              background: sub === k ? 'rgba(194,181,155,0.15)' : 'transparent',
              border: '0.5px solid rgba(194,181,155,0.15)',
              color: sub === k ? BEIGE : MUTED,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {sub === 'pending' &&
        (pending.length === 0 ? (
          <div style={{ color: FAINT, fontSize: 13, padding: 20, textAlign: 'center' }}>
            No deals pending approval
          </div>
        ) : (
          pending.map((d) => <PendingDealCard key={d.id} d={d} onDecide={decide} />)
        ))}

      {sub === 'reps' && (
        <div style={{ overflowX: 'auto' }}>
          {reps.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'rgba(194,181,155,0.03)',
                border: CARD_BORDER,
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flex: 1, minWidth: 120, color: WHITE, fontSize: 13 }}>
                {r.name}
              </span>
              <span style={{ fontSize: 12, color: MUTED }}>
                {r.total_leads} leads
              </span>
              <span style={{ fontSize: 12, color: MUTED }}>
                {r.deals_closed} deals
              </span>
              <span style={{ fontSize: 12, color: '#fbbf24' }}>
                {fmtMoney(r.pending_commission)} pending
              </span>
              <span style={{ fontSize: 12, color: BEIGE }}>
                {fmtMoney(r.paid_commission)} paid
              </span>
            </div>
          ))}
        </div>
      )}

      {sub === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: MUTED }}>Services</div>
          {services.map((s) => (
            <div
              key={s.id}
              style={{
                background: 'rgba(194,181,155,0.03)',
                border: CARD_BORDER,
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                color: WHITE,
              }}
            >
              <span>{s.name}</span>
              <span style={{ color: BEIGE }}>{s.commission_rate}%</span>
            </div>
          ))}
          <div
            style={{
              background: CARD,
              border: CARD_BORDER,
              borderRadius: 10,
              padding: 12,
              marginTop: 8,
            }}
          >
            <div style={{ fontSize: 12, color: MUTED }}>Invite Code</div>
            <div style={{ fontSize: 14, color: WHITE, letterSpacing: 3 }}>
              ••••••••
            </div>
            <div style={{ fontSize: 11, color: FAINT, marginTop: 4 }}>
              Set via SALES_REP_INVITE_CODE env var. Share it with new reps to
              let them register.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PendingDealCard({ d, onDecide }) {
  const [notes, setNotes] = useState('')
  const [rejecting, setRejecting] = useState(false)
  return (
    <div
      style={{
        background: 'rgba(194,181,155,0.03)',
        border: CARD_BORDER,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
        {d.rep_name} — {d.company_name}
      </div>
      <div style={{ fontSize: 12, color: MUTED, margin: '4px 0' }}>
        {d.service_name} · {fmtMoney(d.deal_value)} · commission{' '}
        <span style={{ color: BEIGE }}>{fmtMoney(d.commission_amount)}</span>
      </div>
      {d.payment_proof_url && (
        <a
          href={d.payment_proof_url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: BEIGE }}
        >
          View payment proof
        </a>
      )}
      {rejecting && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rejection notes"
          style={input({ minHeight: 50, marginTop: 8, fontSize: 12 })}
        />
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={() => onDecide(d, true)}
          style={{
            flex: 1,
            background: 'rgba(74,222,128,0.15)',
            border: '0.5px solid rgba(74,222,128,0.4)',
            color: '#4ade80',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Approve
        </button>
        <button
          onClick={() => (rejecting ? onDecide(d, false, notes) : setRejecting(true))}
          style={{
            flex: 1,
            background: 'rgba(248,113,113,0.12)',
            border: '0.5px solid rgba(248,113,113,0.4)',
            color: '#f87171',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {rejecting ? 'Confirm Reject' : 'Reject'}
        </button>
      </div>
    </div>
  )
}

// ===================== NOTIFICATIONS =====================
function NotifBell({ rep, toast }) {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const prevUnread = useRef(0)
  const unread = list.filter((n) => !n.read).length

  const load = useCallback(async () => {
    const d = await api('sales_notifications', { params: { rep_id: rep.id } })
    const ns = d.notifications || []
    const u = ns.filter((n) => !n.read).length
    if (u > prevUnread.current && prevUnread.current !== 0) {
      toast(ns[0]?.title || 'New notification')
    }
    prevUnread.current = u
    setList(ns)
  }, [rep.id, toast])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  async function markRead() {
    await api('mark_notifications_read', {
      method: 'POST',
      body: { rep_id: rep.id },
    })
    load()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 4,
        }}
      >
        <Icon d={Ic.bell} size={20} color={WHITE} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#f87171',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 999,
              minWidth: 15,
              height: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute',
              right: 0,
              top: 32,
              width: 300,
              maxHeight: 380,
              overflowY: 'auto',
              background: 'rgba(20,18,16,0.98)',
              border: '0.5px solid rgba(194,181,155,0.15)',
              borderRadius: 12,
              padding: 10,
              zIndex: 200,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, color: MUTED }}>Notifications</span>
              <button
                onClick={markRead}
                style={{
                  fontSize: 11,
                  background: 'transparent',
                  border: 'none',
                  color: BEIGE,
                  cursor: 'pointer',
                }}
              >
                Mark all read
              </button>
            </div>
            {list.length === 0 && (
              <div style={{ fontSize: 12, color: FAINT, padding: 10 }}>
                No notifications
              </div>
            )}
            {list.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  marginBottom: 4,
                  background: n.read
                    ? 'transparent'
                    : 'rgba(194,181,155,0.06)',
                }}
              >
                <div style={{ fontSize: 12.5, color: WHITE, fontWeight: 500 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED }}>{n.message}</div>
                <div style={{ fontSize: 10, color: FAINT, marginTop: 2 }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===================== ROOT =====================
export default function SalesRep() {
  const isMobile = useIsMobile()
  const [rep, setRep] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [tab, setTab] = useState('dashboard')
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [overdue, setOverdue] = useState([])
  const [kpis, setKpis] = useState(null)
  const [services, setServices] = useState([])
  const [showAddLead, setShowAddLead] = useState(false)
  const [toastState, setToastState] = useState(null)

  const toast = useCallback((msg, kind) => {
    setToastState({ msg, kind })
    setTimeout(() => setToastState(null), 3000)
  }, [])

  const reload = useCallback(async () => {
    if (!rep) return
    const [ld, dl, lb, ov, sc] = await Promise.all([
      api('rep_leads', { params: { rep_id: rep.id } }),
      api('rep_deals', { params: { rep_id: rep.id } }),
      api('leaderboard'),
      api('overdue_followups', { params: { rep_id: rep.id } }),
      api('services_catalog'),
    ])
    const leadsArr = ld.leads || []
    // Pull activities per lead for the dashboard/timeline.
    setLeads(leadsArr)
    setDeals(dl.deals || [])
    setLeaderboard(lb.leaderboard || [])
    setOverdue(ov.overdue || [])
    setServices(sc.services || [])
    const prof = await api('rep_profile', { params: { rep_id: rep.id } })
    if (prof.profile) setKpis(prof.profile)
  }, [rep])

  useEffect(() => {
    reload()
  }, [reload])

  if (!rep) return <LoginScreen onAuthed={setRep} />

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setRep(null)
  }

  const tabs = [
    ['dashboard', 'Dashboard'],
    ['leads', 'My Leads'],
    ['deals', 'My Deals'],
    ['leaderboard', 'Leaderboard'],
    ['scripts', 'Scripts'],
    ...(rep.role === 'admin' ? [['admin', 'Admin']] : []),
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: WHITE,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        paddingBottom: isMobile ? 70 : 0,
      }}
    >
      <Toast toast={toastState} />

      {/* top nav */}
      <div
        style={{
          height: 56,
          background: 'rgba(11,11,13,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid rgba(194,181,155,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: WHITE }}>Lithos</span>
          <span style={{ fontWeight: 300, color: BEIGE }}>Labs</span>
          <span
            style={{
              fontSize: 10,
              color: BEIGE,
              border: `0.5px solid rgba(194,181,155,0.4)`,
              borderRadius: 999,
              padding: '2px 8px',
              marginLeft: 4,
            }}
          >
            Sales
          </span>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background:
                    tab === k ? 'rgba(194,181,155,0.1)' : 'transparent',
                  border: 'none',
                  color: tab === k ? BEIGE : MUTED,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NotifBell rep={rep} toast={toast} />
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(194,181,155,0.15)',
              color: BEIGE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {initials(rep.name)}
          </div>
          <button
            onClick={logout}
            style={{
              background: 'transparent',
              border: 'none',
              color: MUTED,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {tab === 'dashboard' && (
          <DashboardTab
            rep={rep}
            leads={leads}
            deals={deals}
            leaderboard={leaderboard}
            overdue={overdue}
            kpis={kpis}
            isMobile={isMobile}
            goTab={setTab}
          />
        )}
        {tab === 'leads' && (
          <LeadsTab
            rep={rep}
            leads={leads}
            reload={reload}
            toast={toast}
            isMobile={isMobile}
            onAddLead={() => setShowAddLead(true)}
          />
        )}
        {tab === 'deals' && (
          <DealsTab
            rep={rep}
            deals={deals}
            leads={leads}
            services={services}
            reload={reload}
            toast={toast}
            isMobile={isMobile}
          />
        )}
        {tab === 'leaderboard' && (
          <LeaderboardTab rep={rep} leaderboard={leaderboard} />
        )}
        {tab === 'scripts' && <ScriptsTab services={services} toast={toast} />}
        {tab === 'admin' && rep.role === 'admin' && (
          <AdminTab rep={rep} toast={toast} />
        )}
      </div>

      {/* bottom nav (mobile) */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            background: 'rgba(11,11,13,0.98)',
            borderTop: '0.5px solid rgba(194,181,155,0.1)',
            display: 'flex',
            zIndex: 100,
          }}
        >
          {[
            ['dashboard', 'Home'],
            ['leads', 'Leads'],
            ['deals', 'Deals'],
            ['leaderboard', 'Board'],
            ['scripts', 'Scripts'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: tab === k ? BEIGE : MUTED,
                fontSize: 11,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAddLead && (
          <AddLeadPanel
            rep={rep}
            onClose={() => setShowAddLead(false)}
            reload={reload}
            toast={toast}
            isMobile={isMobile}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
