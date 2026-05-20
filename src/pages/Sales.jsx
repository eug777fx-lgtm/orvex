import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useIsMobile from '../utils/useIsMobile'

// ===== Lithos Labs — Sales Portal (CEO-identical shell) =====
const BG = '#000000'
const NAV_BG = 'rgba(0, 0, 0,0.95)'
const STAT_BG = '#111111'
const SECTION_BG = '#0A0A0A'
const BORDER = '0.5px solid rgba(255,255,255,0.06)'
const BEIGE = '#FFFFFF'
const WHITE = '#ffffff'
const T40 = 'rgba(255,255,255,0.4)'
const T35 = 'rgba(255,255,255,0.35)'
const T45 = 'rgba(255,255,255,0.45)'
const T70 = 'rgba(255,255,255,0.7)'
const AUTH_KEY = 'lithos_sales_auth'

const STAGES = [
  { key: 'new', label: 'New', color: '#AAAAAA' },
  { key: 'contacted', label: 'Contacted', color: '#AAAAAA' },
  { key: 'interested', label: 'Interested', color: '#AAAAAA' },
  { key: 'demo_booked', label: 'Demo Booked', color: '#AAAAAA' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#AAAAAA' },
  { key: 'closed_won', label: 'Closed Won', color: '#FFFFFF' },
  { key: 'closed_lost', label: 'Closed Lost', color: '#FF4444' },
]
const STAGE_COLOR = Object.fromEntries(STAGES.map((s) => [s.key, s.color]))
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]))
const PIPELINE_STAGES = STAGES.slice(0, 6)

async function salesApi(action, { method = 'GET', params, body } = {}) {
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

const money = (n) => '$' + Math.round(Number(n || 0)).toLocaleString()
const initials = (n) =>
  String(n || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
function timeAgo(d) {
  if (!d) return '—'
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function I({ d, size = 16, color = T70 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
const IC = {
  bell: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4',
  check: 'M4 12l5 5L20 6',
  x: 'M6 6l12 12M18 6L6 18',
  phone: 'M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 005 5l1-2 5 2v2a2 2 0 01-2 2A16 16 0 013 5z',
  mail: 'M3 5h18v14H3zM3 5l9 7 9-7',
  plus: 'M12 5v14M5 12h14',
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '11px 14px',
  color: WHITE,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}
const btnPrimary = {
  background: WHITE,
  color: '#000',
  fontWeight: 600,
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  border: 'none',
  cursor: 'pointer',
}
const btnGhost = {
  border: '0.5px solid rgba(255,255,255,0.15)',
  color: T70,
  background: 'transparent',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  cursor: 'pointer',
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: STAT_BG, border: BORDER, borderRadius: 12, padding: 24, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: T40 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 600, color: accent ? BEIGE : WHITE, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 13, color: T35, marginTop: 4 }}>{sub}</div>
    </div>
  )
}
function Section({ title, subtitle, right, children, style }) {
  return (
    <div style={{ background: SECTION_BG, border: BORDER, borderRadius: 16, padding: 24, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 4 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: T35 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}
function StatusPill({ status }) {
  const c = STAGE_COLOR[status] || '#AAAAAA'
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: `${c}1f`, border: `0.5px solid ${c}55`, color: c, whiteSpace: 'nowrap' }}>
      {STAGE_LABEL[status] || status}
    </span>
  )
}

// ===================== LOGIN =====================
function Login({ onAuthed }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '', invite_code: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e?.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const d =
        mode === 'login'
          ? await salesApi('rep_login', { method: 'POST', body: { email: f.email, password: f.password } })
          : await salesApi('rep_register', {
              method: 'POST',
              body: { name: f.name, email: f.email, password: f.password, invite_code: f.invite_code },
            })
      if (d.success) {
        const rep = d.rep.commission_rate != null ? d.rep : { ...d.rep, commission_rate: 10 }
        localStorage.setItem(AUTH_KEY, JSON.stringify(rep))
        onAuthed(rep)
      } else setErr(d.error || 'Failed')
    } catch {
      setErr('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <img src="/lithos-logo.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        <span style={{ fontWeight: 700, color: WHITE, fontSize: 18 }}>Lithos</span>
        <span style={{ fontWeight: 300, color: T40, fontSize: 18 }}>Labs</span>
        <span style={{ border: `0.5px solid rgba(255, 255, 255,0.4)`, color: BEIGE, fontSize: 10, padding: '2px 8px', borderRadius: 999, marginLeft: 4 }}>
          SALES
        </span>
      </div>
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: STAT_BG, border: BORDER, borderRadius: 16, padding: 32, width: '100%', maxWidth: 380 }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
          {mode === 'login' ? 'Welcome back' : 'Join the team'}
        </div>
        <div style={{ fontSize: 13, color: T40, marginBottom: 24 }}>
          {mode === 'login' ? 'Sign in to your sales dashboard' : 'Register with your invite code'}
        </div>
        {mode === 'register' && (
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Full name" value={f.name} onChange={set('name')} />
        )}
        <input style={{ ...inputStyle, marginBottom: 10 }} type="email" placeholder="Email" value={f.email} onChange={set('email')} />
        <input style={{ ...inputStyle, marginBottom: 10 }} type="password" placeholder="Password" value={f.password} onChange={set('password')} />
        {mode === 'register' && (
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Invite code" value={f.invite_code} onChange={set('invite_code')} />
        )}
        <button type="submit" disabled={busy} style={{ ...btnPrimary, width: '100%', padding: 12, fontSize: 14, marginTop: 8 }}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
        </button>
        {err && <div style={{ fontSize: 12, color: 'rgba(255, 68, 68,0.8)', marginTop: 8 }}>{err}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: T35 }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div style={{ fontSize: 13, color: T35, textAlign: 'center' }}>
          {mode === 'login' ? 'New to the team? ' : 'Have an account? '}
          <span
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setErr('')
            }}
            style={{ color: BEIGE, cursor: 'pointer' }}
          >
            {mode === 'login' ? 'Register with invite code' : 'Sign in'}
          </span>
        </div>
      </motion.form>
    </div>
  )
}

// ===================== NOTIFICATIONS =====================
function Bell({ repId }) {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const unread = list.filter((n) => !n.read).length
  const load = useCallback(async () => {
    const d = await salesApi('sales_notifications', { params: { rep_id: repId } })
    setList(d.notifications || [])
  }, [repId])
  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])
  async function markRead() {
    await salesApi('mark_notifications_read', { method: 'POST', body: { rep_id: repId } })
    load()
  }
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', padding: 4 }}>
        <I d={IC.bell} size={20} color={WHITE} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, background: '#FF4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 999, minWidth: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
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
            style={{ position: 'absolute', right: 0, top: 34, width: 300, maxHeight: 380, overflowY: 'auto', background: STAT_BG, border: BORDER, borderRadius: 12, padding: 10, zIndex: 200 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T40 }}>Notifications</span>
              <button onClick={markRead} style={{ background: 'transparent', border: 'none', color: BEIGE, fontSize: 11, cursor: 'pointer' }}>
                Mark all read
              </button>
            </div>
            {list.length === 0 && <div style={{ fontSize: 12, color: T35, padding: 10 }}>No notifications</div>}
            {list.map((n) => (
              <div key={n.id} style={{ padding: 8, borderRadius: 8, marginBottom: 4, background: n.read ? 'transparent' : 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 12.5, color: WHITE, fontWeight: 500 }}>{n.title}</div>
                <div style={{ fontSize: 11.5, color: T40 }}>{n.message}</div>
                <div style={{ fontSize: 10, color: T35, marginTop: 2 }}>{timeAgo(n.created_at)}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===================== SLIDE PANEL =====================
function SlidePanel({ open, onClose, children, isMobile }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />
          <motion.div
            initial={{ x: isMobile ? 0 : 460, y: isMobile ? '100%' : 0 }}
            animate={{ x: 0, y: isMobile ? '0%' : 0 }}
            exit={{ x: isMobile ? 0 : 460, y: isMobile ? '100%' : 0 }}
            transition={{ type: 'tween', duration: 0.25 }}
            style={{ position: 'fixed', top: isMobile ? 0 : 56, right: 0, bottom: 0, width: isMobile ? '100%' : 440, background: SECTION_BG, borderLeft: BORDER, overflowY: 'auto', padding: 24, zIndex: 50 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ===================== ADD LEAD =====================
const SOURCES = ['Cold Call', 'Cold Email', 'Referral', 'Social', 'Walk-in']
function AddLeadPanel({ rep, prefill, onClose, onSaved, toast, isMobile }) {
  const [f, setF] = useState({
    company_name: prefill?.company_name || '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_whatsapp: '',
    industry: prefill?.industry || '',
    location: prefill?.location || '',
    source: prefill ? 'Social' : 'Cold Call',
    estimated_value: prefill?.estimated_value || '',
    notes: prefill?.why_good_fit ? `Why fit: ${prefill.why_good_fit}\nAngle: ${prefill.outreach_angle || ''}` : '',
    next_followup: '',
  })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function save() {
    if (!f.company_name.trim()) return
    setBusy(true)
    const d = await salesApi('add_lead', {
      method: 'POST',
      body: {
        rep_id: rep.id,
        ...f,
        source: prefill ? 'discover' : f.source,
        estimated_value: f.estimated_value ? Number(f.estimated_value) : null,
      },
    })
    setBusy(false)
    if (d.success) {
      toast('Lead added')
      onSaved()
      onClose()
    } else toast(d.error || 'Failed', 'error')
  }
  const L = ({ label, k, type }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T40, marginBottom: 4 }}>{label}</div>
      <input style={inputStyle} type={type || 'text'} value={f[k]} onChange={set(k)} />
    </div>
  )
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>Add Lead</div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T40, cursor: 'pointer' }}>
          <I d={IC.x} size={18} />
        </button>
      </div>
      <L label="Company name *" k="company_name" />
      <L label="Contact name" k="contact_name" />
      <L label="Email" k="contact_email" />
      <L label="Phone" k="contact_phone" />
      <L label="WhatsApp" k="contact_whatsapp" />
      <L label="Industry" k="industry" />
      <L label="Location" k="location" />
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: T40, marginBottom: 4 }}>Source</div>
        <select style={inputStyle} value={f.source} onChange={set('source')}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <L label="Estimated value" k="estimated_value" type="number" />
      <L label="Next follow-up" k="next_followup" type="date" />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T40, marginBottom: 4 }}>Notes</div>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={f.notes} onChange={set('notes')} />
      </div>
      <button onClick={save} disabled={busy} style={{ ...btnPrimary, width: '100%', padding: 12 }}>
        {busy ? 'Saving…' : 'Save Lead'}
      </button>
    </div>
  )
}

// ===================== LEAD DETAIL =====================
function LeadDetail({ rep, lead, onClose, onChanged, toast }) {
  const [activities, setActivities] = useState([])
  const [note, setNote] = useState(lead.notes || '')
  const [actType, setActType] = useState('call')
  const [actDesc, setActDesc] = useState('')
  const next = {
    new: ['contacted', 'closed_lost'],
    contacted: ['interested', 'closed_lost'],
    interested: ['demo_booked', 'closed_lost'],
    demo_booked: ['proposal_sent', 'closed_lost'],
    proposal_sent: ['closed_won', 'closed_lost'],
  }
  const loadActs = useCallback(async () => {
    const d = await salesApi('lead_activities', { params: { lead_id: lead.id } })
    setActivities(d.activities || [])
  }, [lead.id])
  useEffect(() => {
    loadActs()
  }, [loadActs])

  async function setStatus(status) {
    await salesApi('update_lead_status', { method: 'POST', body: { lead_id: lead.id, rep_id: rep.id, status } })
    toast(`Moved to ${STAGE_LABEL[status]}`)
    onChanged()
    loadActs()
  }
  async function saveNote() {
    await salesApi('update_lead_status', { method: 'POST', body: { lead_id: lead.id, rep_id: rep.id, status: lead.status, notes: note } })
    toast('Note saved')
    onChanged()
  }
  async function addActivity() {
    if (!actDesc.trim()) return
    await salesApi('add_activity', { method: 'POST', body: { lead_id: lead.id, rep_id: rep.id, activity_type: actType, description: actDesc } })
    setActDesc('')
    toast('Activity logged')
    loadActs()
    onChanged()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>{lead.company_name}</div>
          <div style={{ marginTop: 6 }}>
            <StatusPill status={lead.status} />
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T40, cursor: 'pointer' }}>
          <I d={IC.x} size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {(next[lead.status] || []).map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={{ ...btnGhost, fontSize: 12, padding: '5px 10px', color: STAGE_COLOR[s], borderColor: `${STAGE_COLOR[s]}55` }}>
            → {STAGE_LABEL[s]}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: T70, display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {lead.contact_name && <div>{lead.contact_name}</div>}
        {lead.contact_email && <a href={`mailto:${lead.contact_email}`} style={{ color: BEIGE }}>{lead.contact_email}</a>}
        {lead.contact_phone && <a href={`tel:${lead.contact_phone}`} style={{ color: BEIGE }}>{lead.contact_phone}</a>}
        {lead.contact_whatsapp && (
          <a href={`https://wa.me/${String(lead.contact_whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#FFFFFF' }}>
            WhatsApp
          </a>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: T40, marginBottom: 4 }}>Notes</div>
        <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={saveNote} style={{ ...btnGhost, marginTop: 8, fontSize: 12 }}>
          Save note
        </button>
      </div>

      <div style={{ fontSize: 11, color: T40, marginBottom: 8 }}>Activity</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <select style={{ ...inputStyle, width: 'auto', padding: '8px 10px', fontSize: 12 }} value={actType} onChange={(e) => setActType(e.target.value)}>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="note">Note</option>
        </select>
        <input style={{ ...inputStyle, flex: 1, padding: '8px 10px', fontSize: 12 }} placeholder="Description" value={actDesc} onChange={(e) => setActDesc(e.target.value)} />
        <button onClick={addActivity} style={{ ...btnPrimary, padding: '8px 12px' }}>
          Log
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {activities.map((a) => (
          <div key={a.id} style={{ fontSize: 12, color: T70, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>
              <b style={{ color: WHITE, textTransform: 'capitalize' }}>{a.activity_type}</b> · {a.description}
            </span>
            <span style={{ color: T35, whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</span>
          </div>
        ))}
      </div>
      {lead.status === 'closed_won' && (
        <SubmitDeal rep={rep} lead={lead} toast={toast} onDone={onChanged} />
      )}
    </div>
  )
}

function SubmitDeal({ rep, lead, toast, onDone }) {
  const [open, setOpen] = useState(false)
  const [services, setServices] = useState([])
  const [svc, setSvc] = useState('')
  const [value, setValue] = useState(lead.estimated_value || '')
  const [rate, setRate] = useState(rep.commission_rate || 10)
  const [proof, setProof] = useState('')
  useEffect(() => {
    salesApi('services_catalog').then((d) => setServices(d.services || []))
  }, [])
  const commission = (Number(value) || 0) * (Number(rate) || 0) / 100
  async function submit() {
    if (!svc || !value) return toast('Pick service + value', 'error')
    const d = await salesApi('submit_deal', {
      method: 'POST',
      body: { rep_id: rep.id, lead_id: lead.id, service_name: svc, deal_value: Number(value), commission_rate: Number(rate), payment_proof_url: proof || null },
    })
    if (d.success) {
      toast('Deal submitted for approval')
      setOpen(false)
      onDone()
    } else toast(d.error || 'Failed', 'error')
  }
  if (!open)
    return (
      <button onClick={() => setOpen(true)} style={{ width: '100%', background: 'rgba(255, 255, 255,0.14)', border: `0.5px solid rgba(255, 255, 255,0.5)`, color: BEIGE, fontWeight: 600, borderRadius: 8, padding: 12, fontSize: 13, cursor: 'pointer' }}>
        Submit Deal
      </button>
    )
  return (
    <div style={{ border: `0.5px solid rgba(255, 255, 255,0.3)`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select style={inputStyle} value={svc} onChange={(e) => { setSvc(e.target.value); const s = services.find((x) => x.name === e.target.value); if (s) setRate(s.commission_rate) }}>
        <option value="">Select service…</option>
        {services.map((s) => (
          <option key={s.id} value={s.name}>{s.name}</option>
        ))}
      </select>
      <input style={inputStyle} type="number" placeholder="Deal value" value={value} onChange={(e) => setValue(e.target.value)} />
      <input style={inputStyle} type="number" placeholder="Commission %" value={rate} onChange={(e) => setRate(e.target.value)} />
      <div style={{ textAlign: 'center', color: BEIGE, fontWeight: 600, fontSize: 18 }}>You earn: {money(commission)}</div>
      <input style={inputStyle} placeholder="Payment proof URL" value={proof} onChange={(e) => setProof(e.target.value)} />
      <button onClick={submit} style={{ ...btnPrimary, padding: 10 }}>Submit Deal</button>
    </div>
  )
}

// ===================== DASHBOARD =====================
function Dashboard({ rep, data, onTab, onAddLead }) {
  const { leads = [], deals = [], kpis = {}, tasks = [], activities = [], leaderboard = [] } = data
  const closed = deals.filter((d) => ['approved', 'commission_paid'].includes(d.status))
  const commission = closed.reduce((s, d) => s + Number(d.commission_amount || 0), 0)
  const pipelineValue = leads
    .filter((l) => !['closed_won', 'closed_lost'].includes(l.status))
    .reduce((s, l) => s + Number(l.estimated_value || 0), 0)
  const wins = leads.filter((l) => l.status === 'closed_won').length
  const winRate = leads.length ? Math.round((wins / leads.length) * 100) : 0
  const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, leads.filter((l) => l.status === s.key).length]))
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toISOString().slice(0, 10)
  const todayTasks = tasks.filter((t) => t.status !== 'done' && String(t.due_date || '').slice(0, 10) === today)
  const recentLeads = [...leads].slice(0, 5)
  const upcoming = leads
    .filter((l) => l.next_followup)
    .sort((a, b) => new Date(a.next_followup) - new Date(b.next_followup))
    .slice(0, 5)
  const wk = kpis.week || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, color: WHITE }}>
            {greet}, {String(rep.name || '').split(' ')[0]}
          </div>
          <div style={{ fontSize: 13, color: T35, marginTop: 2 }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnGhost} onClick={onAddLead}>+ Add Lead</button>
          <button style={btnGhost} onClick={() => onTab('tasks')}>+ Add Task</button>
          <button style={btnGhost} onClick={() => onTab('pipeline')}>↗ View Pipeline</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total Leads" value={leads.length} sub="In your pipeline" />
        <StatCard label="Deals Closed" value={closed.length} sub="All time" />
        <StatCard label="Commission Earned" value={money(commission)} sub="approved" accent />
        <StatCard label="Pipeline Value" value={money(pipelineValue)} sub="Open deals value" />
        <StatCard label="Win Rate" value={`${winRate}%`} sub="Close rate" />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Section title="Pipeline by Stage" subtitle="Active distribution" style={{ flex: '1 1 60%', minWidth: 320 }}>
          {leads.length === 0 ? (
            <div style={{ color: T35, fontSize: 13 }}>No leads yet — add your first lead to get started</div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PIPELINE_STAGES.map((s) => (
                <div key={s.key} style={{ flex: '1 0 90px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, margin: '0 auto 6px' }} />
                  <div style={{ fontSize: 22, fontWeight: 600, color: WHITE }}>{counts[s.key]}</div>
                  <div style={{ fontSize: 11, color: T35 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section
          title="Today's Tasks"
          subtitle="Due today"
          right={<span style={{ fontSize: 12, color: T40 }}>{todayTasks.length}</span>}
          style={{ flex: '1 1 30%', minWidth: 260 }}
        >
          {todayTasks.length === 0 ? (
            <div style={{ color: T35, fontSize: 13, textAlign: 'center', padding: 12 }}>You're all clear today</div>
          ) : (
            todayTasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <I d={IC.check} size={14} color={T40} />
                <span style={{ fontSize: 13, color: WHITE, flex: 1 }}>{t.title}</span>
              </div>
            ))
          )}
          <button onClick={() => onTab('tasks')} style={{ ...btnGhost, width: '100%', marginTop: 10 }}>
            View All Tasks
          </button>
        </Section>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Section title="Recent Leads" style={{ flex: 1, minWidth: 240 }}>
          {recentLeads.length === 0 && <div style={{ color: T35, fontSize: 13 }}>None yet</div>}
          {recentLeads.map((l) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <div>
                <div style={{ fontSize: 13, color: WHITE, fontWeight: 600 }}>{l.company_name}</div>
                <div style={{ fontSize: 11, color: T35 }}>{l.industry || '—'}</div>
              </div>
              <StatusPill status={l.status} />
            </div>
          ))}
        </Section>
        <Section title="Upcoming Follow-ups" style={{ flex: 1, minWidth: 240 }}>
          {upcoming.length === 0 && <div style={{ color: T35, fontSize: 13 }}>Nothing scheduled</div>}
          {upcoming.map((l) => {
            const od = new Date(l.next_followup) <= new Date()
            return (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <div style={{ fontSize: 13, color: WHITE }}>
                  {od && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#FF4444', marginRight: 6 }} />}
                  {l.company_name}
                </div>
                <span style={{ fontSize: 11, color: T35 }}>{new Date(l.next_followup).toLocaleDateString()}</span>
              </div>
            )
          })}
        </Section>
        <Section title="Activity This Week" style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              ['Calls', wk.calls_made || 0],
              ['Emails', wk.emails_sent || 0],
              ['Leads', wk.leads_added || 0],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 26, fontWeight: 600, color: WHITE }}>{v}</div>
                <div style={{ fontSize: 11, color: T35 }}>{k}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

// ===================== LEADS =====================
function Leads({ rep, leads, reload, toast, isMobile, onAddLead }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [sel, setSel] = useState(null)
  const filtered = leads.filter((l) => {
    if (filter !== 'all' && l.status !== filter) return false
    if (q && !`${l.company_name} ${l.contact_name || ''}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
          My Leads <span style={{ fontSize: 13, color: T40 }}>({leads.length})</span>
        </div>
        <button style={btnPrimary} onClick={onAddLead}>+ Add Lead</button>
      </div>
      <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Search leads..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {['all', ...STAGES.map((s) => s.key)].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', background: filter === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: BORDER, color: filter === k ? WHITE : T45 }}
          >
            {k === 'all' ? 'All' : STAGE_LABEL[k]}
          </button>
        ))}
      </div>
      <div style={{ background: SECTION_BG, border: BORDER, borderRadius: 16, padding: 8 }}>
        {filtered.length === 0 && <div style={{ color: T35, fontSize: 13, padding: 24, textAlign: 'center' }}>No leads</div>}
        {filtered.map((l) => (
          <div
            key={l.id}
            onClick={() => setSel(l)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
          >
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{l.company_name}</div>
              <div style={{ fontSize: 13, color: T40 }}>{l.contact_name || '—'}</div>
            </div>
            <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', color: T70 }}>
              {l.industry || '—'}
            </span>
            <div style={{ flex: 1 }}>
              <StatusPill status={l.status} />
            </div>
            <span style={{ fontSize: 13, color: T40, width: 90, textAlign: 'right' }}>{l.estimated_value ? money(l.estimated_value) : '—'}</span>
            <span style={{ fontSize: 12, color: T35, width: 80, textAlign: 'right' }}>{timeAgo(l.last_activity || l.updated_at)}</span>
            <button style={{ ...btnGhost, padding: '5px 12px', fontSize: 12 }}>View</button>
          </div>
        ))}
      </div>
      <SlidePanel open={!!sel} onClose={() => setSel(null)} isMobile={isMobile}>
        {sel && (
          <LeadDetail
            rep={rep}
            lead={sel}
            onClose={() => setSel(null)}
            onChanged={() => {
              reload()
              setSel(null)
            }}
            toast={toast}
          />
        )}
      </SlidePanel>
    </div>
  )
}

// ===================== DISCOVER =====================
function Discover({ rep, toast, onPrefill }) {
  const [q, setQ] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('Aruba')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  async function search() {
    if (!q.trim()) return
    setLoading(true)
    setResults([])
    const d = await salesApi('discover_leads', { method: 'POST', body: { query: q, industry, location, rep_id: rep.id } })
    setLoading(false)
    if (d.success) setResults(d.results || [])
    else toast(d.error || 'Discovery failed', 'error')
  }
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>Discover Leads</div>
      <div style={{ fontSize: 12, color: T35, marginBottom: 16 }}>Find potential clients in Aruba and beyond</div>
      <Section title="Search" subtitle="AI-generated prospect profiles">
        <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Search for businesses, industries, or locations..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <select style={{ ...inputStyle, width: 'auto' }} value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">Any industry</option>
            {['Real Estate', 'Ecommerce', 'Services', 'Restaurant', 'Hotel', 'Retail'].map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
          <select style={{ ...inputStyle, width: 'auto' }} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option>Aruba</option>
            <option>International</option>
          </select>
          <button style={btnPrimary} onClick={search}>
            Search
          </button>
        </div>
      </Section>
      {loading && <div style={{ color: T35, fontSize: 13, marginTop: 16 }}>Generating prospects…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12, marginTop: 16 }}>
        {results.map((r, i) => (
          <div key={i} style={{ background: STAT_BG, border: BORDER, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{r.company_name}</div>
              {r.estimated_value ? <span style={{ fontSize: 12, color: BEIGE }}>{money(r.estimated_value)}</span> : null}
            </div>
            <div style={{ fontSize: 11, color: T35, margin: '4px 0' }}>
              {r.industry} · {r.location}
            </div>
            <div style={{ fontSize: 12, color: T40, fontStyle: 'italic', marginBottom: 4 }}>Why fit: {r.why_good_fit}</div>
            <div style={{ fontSize: 12, color: T70, marginBottom: 10 }}>Angle: {r.outreach_angle}</div>
            <button
              style={{ ...btnGhost, width: '100%' }}
              onClick={() => onPrefill(r)}
            >
              Save as Lead
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================== PIPELINE (kanban) =====================
function Pipeline({ rep, leads, reload, toast }) {
  const [drag, setDrag] = useState(null)
  async function drop(stage) {
    if (!drag) return
    await salesApi('update_lead_status', { method: 'POST', body: { lead_id: drag, rep_id: rep.id, status: stage } })
    setDrag(null)
    toast(`Moved to ${STAGE_LABEL[stage]}`)
    reload()
  }
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE, marginBottom: 16 }}>Pipeline</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {PIPELINE_STAGES.map((s) => {
          const col = leads.filter((l) => l.status === s.key)
          const total = col.reduce((a, l) => a + Number(l.estimated_value || 0), 0)
          return (
            <div
              key={s.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(s.key)}
              style={{ minWidth: 240, flex: '1 0 240px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, minHeight: 400 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: s.color, marginRight: 6 }} />
                  {s.label} <span style={{ color: T40 }}>{col.length}</span>
                </span>
                <span style={{ fontSize: 11, color: T35 }}>{money(total)}</span>
              </div>
              {col.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={() => setDrag(l.id)}
                  style={{ background: STAT_BG, border: BORDER, borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'grab' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{l.company_name}</div>
                  <div style={{ fontSize: 12, color: T40 }}>{l.contact_name || '—'}</div>
                  <div style={{ fontSize: 12, color: T35, marginTop: 4 }}>{l.estimated_value ? money(l.estimated_value) : ''}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===================== OFFERS =====================
const INCLUDED = {
  'CRM Setup': ['CRM platform setup', 'Pipeline configuration', 'Automation rules', 'Team training', '30-day support'],
  'AI Marketing System': ['Brand memory setup', 'AI content generation', 'Social scheduling', 'Monthly report'],
  'Website Development': ['Design + development', 'CMS', 'Mobile responsive', 'SEO basics', '2 revisions'],
  'Lead Generation System': ['Landing page', 'Email sequences', 'Lead capture automation', 'Monthly leads report'],
  'Full Business Operating System': ['Everything above', 'Dedicated account manager', 'Strategy calls'],
  'Brand Identity': ['Logo', 'Color system', 'Brand guide', 'Social templates'],
}
function Offers({ rep, toast }) {
  const [services, setServices] = useState([])
  const [desc, setDesc] = useState('')
  const [rec, setRec] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    salesApi('services_catalog').then((d) => setServices(d.services || []))
  }, [])
  function copyPitch(s) {
    navigator.clipboard?.writeText(
      `Hi — this is ${rep.name} from Lithos Labs. We help businesses with ${s.name.toLowerCase()}: ${s.description}. It starts from ${money(s.price_min)}. Could I grab 10 minutes to show you how it works?`,
    )
    toast('Pitch copied')
  }
  async function recommend() {
    if (!desc.trim()) return
    setBusy(true)
    const d = await salesApi('discover_leads', { method: 'POST', body: { mode: 'recommendation', business: desc } })
    setBusy(false)
    if (d.success) setRec(d.recommendation)
    else toast(d.error || 'Failed', 'error')
  }
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>Agency Offers</div>
      <div style={{ fontSize: 12, color: T35, marginBottom: 16 }}>Know your products inside out</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {services.map((s) => {
          const cMin = (Number(s.price_min || 0) * Number(s.commission_rate || 0)) / 100
          const cMax = (Number(s.price_max || s.price_min || 0) * Number(s.commission_rate || 0)) / 100
          return (
            <div key={s.id} style={{ background: STAT_BG, border: BORDER, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>{s.name}</div>
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', color: T70 }}>{s.category}</span>
                  <div style={{ fontSize: 13, color: T40, marginTop: 8 }}>{s.description}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: T70 }}>From {money(s.price_min)}</div>
                  <div style={{ fontSize: 13, color: BEIGE, fontWeight: 600, marginTop: 4 }}>
                    Your cut: {money(cMin)}–{money(cMax)}
                  </div>
                </div>
              </div>
              <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: T40, fontSize: 12 }}>
                {(INCLUDED[s.name] || []).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <button onClick={() => copyPitch(s)} style={{ ...btnGhost, marginTop: 12 }}>
                Copy Pitch
              </button>
            </div>
          )
        })}
      </div>
      <Section title="Not sure which offer fits?" style={{ marginTop: 16 }}>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', marginBottom: 10 }} placeholder="Describe the prospect's business..." value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button style={btnPrimary} onClick={recommend} disabled={busy}>
          {busy ? 'Thinking…' : 'Get AI Recommendation'}
        </button>
        {rec && (
          <div style={{ marginTop: 12, background: 'rgba(255, 255, 255,0.06)', border: `0.5px solid rgba(255, 255, 255,0.2)`, borderRadius: 10, padding: 16, color: '#FFFFFF', fontSize: 13 }}>
            <b style={{ color: BEIGE }}>{rec.recommended_service}</b>
            <div style={{ marginTop: 6 }}>{rec.why}</div>
            <div style={{ marginTop: 6, color: T70 }}>{rec.pitch}</div>
          </div>
        )}
      </Section>
    </div>
  )
}

// ===================== SCRIPTS =====================
function Scripts({ toast }) {
  const [sub, setSub] = useState('call')
  const [obj, setObj] = useState('')
  const [resp, setResp] = useState('')
  const [busy, setBusy] = useState(false)
  const [acc, setAcc] = useState(null)
  const services = ['CRM Setup', 'AI Marketing System', 'Website Development', 'Lead Generation System']
  async function ask() {
    if (!obj.trim()) return
    setBusy(true)
    setResp('')
    const d = await salesApi('objection_help', {
      method: 'POST',
      body: { objection: obj, brand_context: 'Lithos Labs CRM and AI marketing agency in Aruba' },
    })
    setBusy(false)
    setResp(d.success ? d.response : d.error || 'No response')
  }
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>Sales Scripts</div>
      <div style={{ fontSize: 12, color: T35, marginBottom: 16 }}>Everything you need to close</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['call', 'Call Scripts'], ['dm', 'DM & Email'], ['obj', 'Objection Handler']].map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', background: sub === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: sub === k ? WHITE : T45 }}>
            {l}
          </button>
        ))}
      </div>

      {sub === 'call' &&
        services.map((s) => (
          <div key={s} style={{ background: STAT_BG, border: BORDER, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setAcc(acc === s ? null : s)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: WHITE, fontSize: 14, fontWeight: 500, padding: 14, cursor: 'pointer' }}>
              {s}
            </button>
            {acc === s && (
              <div style={{ padding: '0 14px 14px', fontSize: 12.5, color: T70, lineHeight: 1.6 }}>
                <p><b style={{ color: BEIGE }}>Opening (15s):</b> Hi, this is [name] from Lithos Labs — we build {s.toLowerCase()} for growing businesses. Do you have 30 seconds?</p>
                <p><b style={{ color: BEIGE }}>Discovery:</b> How are you handling this today? What's the biggest bottleneck? What would fixing it be worth?</p>
                <p><b style={{ color: BEIGE }}>Value pitch:</b> We set this up end-to-end so you stop losing time and leads — most clients see ROI within the first month.</p>
                <p><b style={{ color: BEIGE }}>Handling silence:</b> Take your time — what part feels most relevant to your situation?</p>
                <p><b style={{ color: BEIGE }}>Closing:</b> Let's book 20 minutes so I can show you exactly how it works. Thursday or Friday?</p>
                <button style={{ ...btnGhost, marginTop: 6 }} onClick={() => { navigator.clipboard?.writeText(`${s} call script`); toast('Script copied') }}>Copy Script</button>
              </div>
            )}
          </div>
        ))}

      {sub === 'dm' &&
        services.map((s) => (
          <div key={s} style={{ background: STAT_BG, border: BORDER, borderRadius: 10, padding: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 8 }}>{s}</div>
            {[
              ['Instagram DM', `Hey [COMPANY] team — love what you're doing. We help businesses with ${s.toLowerCase()} at Lithos Labs. Open to a quick chat?`],
              ['WhatsApp', `Hi, this is [name] from Lithos Labs. We set up ${s.toLowerCase()} for businesses like [COMPANY]. Worth 10 minutes?`],
              ['Cold Email', `Subject: ${s} for [COMPANY]\n\nHi [name], Lithos Labs helps companies like [COMPANY] with ${s.toLowerCase()}. Could we find 15 minutes this week?`],
            ].map(([label, txt]) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: T40, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12.5, color: T70, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 }}>{txt}</div>
                <button style={{ ...btnGhost, marginTop: 6, fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(txt); toast('Copied') }}>Copy</button>
              </div>
            ))}
          </div>
        ))}

      {sub === 'obj' && (
        <Section title="Handle any objection with AI">
          <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', marginBottom: 10 }} placeholder="Type what the prospect said... e.g. We already have a system" value={obj} onChange={(e) => setObj(e.target.value)} />
          <button style={btnPrimary} onClick={ask} disabled={busy}>
            {busy ? 'Thinking…' : 'Get Response'}
          </button>
          {resp && (
            <div style={{ marginTop: 12, background: 'rgba(255, 255, 255,0.06)', border: `0.5px solid rgba(255, 255, 255,0.2)`, borderRadius: 10, padding: 16, color: '#FFFFFF', fontSize: 13, lineHeight: 1.6 }}>
              {resp}
              <button style={{ ...btnGhost, display: 'block', marginTop: 10, fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(resp); toast('Copied') }}>Copy Response</button>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}

// ===================== TASKS =====================
function Tasks({ rep, tasks, leads, reload, toast }) {
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const shown = tasks.filter((t) => {
    if (filter === 'done') return t.status === 'done'
    if (filter === 'today') return t.status !== 'done' && String(t.due_date || '').slice(0, 10) === today
    if (filter === 'overdue') return t.status !== 'done' && t.due_date && String(t.due_date).slice(0, 10) < today
    if (filter === 'week') return t.status !== 'done'
    return true
  })
  async function toggle(t) {
    await salesApi('update_task', {
      method: 'POST',
      body: { task_id: t.id, status: t.status === 'done' ? 'open' : 'done', completed_at: t.status === 'done' ? null : new Date().toISOString() },
    })
    reload()
  }
  async function del(t) {
    await salesApi('delete_task', { method: 'POST', body: { task_id: t.id } })
    reload()
  }
  const PRI = { high: '#FF4444', medium: '#AAAAAA', low: '#AAAAAA' }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: WHITE }}>
          My Tasks <span style={{ fontSize: 13, color: T40 }}>({tasks.length})</span>
        </div>
        <button style={btnPrimary} onClick={() => setModal(true)}>+ Add Task</button>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'today', 'overdue', 'week', 'done'].map((k) => (
          <button key={k} onClick={() => setFilter(k)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', background: filter === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: BORDER, color: filter === k ? WHITE : T45, textTransform: 'capitalize' }}>
            {k}
          </button>
        ))}
      </div>
      <div style={{ background: SECTION_BG, border: BORDER, borderRadius: 16, padding: 8 }}>
        {shown.length === 0 && <div style={{ color: T35, fontSize: 13, padding: 24, textAlign: 'center' }}>No tasks</div>}
        {shown.map((t) => {
          const overdue = t.status !== 'done' && t.due_date && String(t.due_date).slice(0, 10) < today
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px',
                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                opacity: t.status === 'done' ? 0.4 : 1,
                background: overdue ? 'rgba(170, 170, 170,0.04)' : 'transparent',
                borderLeft: overdue ? '2px solid rgba(170, 170, 170,0.4)' : '2px solid transparent',
              }}
            >
              <button onClick={() => toggle(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                <I d={IC.check} size={16} color={t.status === 'done' ? '#FFFFFF' : T40} />
              </button>
              <span style={{ flex: 1, fontSize: 14, color: WHITE, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                {t.title}
              </span>
              {t.priority && (
                <span style={{ fontSize: 11, color: PRI[t.priority], border: `0.5px solid ${PRI[t.priority]}55`, borderRadius: 999, padding: '2px 8px', textTransform: 'capitalize' }}>
                  {t.priority}
                </span>
              )}
              {t.due_date && <span style={{ fontSize: 12, color: T35 }}>{String(t.due_date).slice(0, 10)}</span>}
              {t.lead_company && <span style={{ fontSize: 12, color: T40 }}>{t.lead_company}</span>}
              <button onClick={() => del(t)} style={{ background: 'transparent', border: 'none', color: T35, cursor: 'pointer' }}>
                <I d={IC.x} size={14} />
              </button>
            </div>
          )
        })}
      </div>
      {modal && <AddTask rep={rep} leads={leads} onClose={() => setModal(false)} onSaved={() => { reload(); setModal(false) }} toast={toast} />}
    </div>
  )
}
function AddTask({ rep, leads, onClose, onSaved, toast }) {
  const [f, setF] = useState({ title: '', description: '', priority: 'medium', due_date: '', lead_id: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  async function save() {
    if (!f.title.trim()) return
    const d = await salesApi('add_task', { method: 'POST', body: { rep_id: rep.id, ...f, lead_id: f.lead_id || null } })
    if (d.success) {
      toast('Task added')
      onSaved()
    } else toast(d.error || 'Failed', 'error')
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: STAT_BG, border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>Add Task</div>
        <input style={inputStyle} placeholder="Title" value={f.title} onChange={set('title')} />
        <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Description" value={f.description} onChange={set('description')} />
        <select style={inputStyle} value={f.priority} onChange={set('priority')}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input style={inputStyle} type="date" value={f.due_date} onChange={set('due_date')} />
        <select style={inputStyle} value={f.lead_id} onChange={set('lead_id')}>
          <option value="">Link to lead (optional)</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>{l.company_name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...btnPrimary, flex: 1, padding: 10 }} onClick={save}>Save</button>
          <button style={btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ===================== ADMIN =====================
function Admin({ rep, toast }) {
  const [sub, setSub] = useState('overview')
  const [reps, setReps] = useState([])
  const [pending, setPending] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [services, setServices] = useState([])
  const load = useCallback(async () => {
    const [ar, pd, al, sc] = await Promise.all([
      salesApi('admin_all_reps'),
      salesApi('admin_deals', { params: { status: 'pending_approval' } }),
      salesApi('admin_all_leads'),
      salesApi('services_catalog'),
    ])
    setReps(ar.reps || [])
    setPending(pd.deals || [])
    setAllLeads(al.leads || [])
    setServices(sc.services || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  async function decide(d, approved, notes) {
    await salesApi('approve_deal', { method: 'POST', body: { deal_id: d.id, admin_id: rep.id, approved, admin_notes: notes } })
    setPending((p) => p.filter((x) => x.id !== d.id))
    toast(approved ? 'Deal approved' : 'Deal rejected')
  }
  async function markPaid(dealId) {
    await salesApi('mark_commission_paid', { method: 'POST', body: { deal_id: dealId } })
    toast('Marked paid')
    load()
  }

  const teamLeads = reps.reduce((a, r) => a + Number(r.total_leads || 0), 0)
  const teamDeals = reps.reduce((a, r) => a + Number(r.deals_closed || 0), 0)
  const owed = reps.reduce((a, r) => a + Number(r.pending_commission || 0), 0)
  const paid = reps.reduce((a, r) => a + Number(r.paid_commission || 0), 0)

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Admin</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['overview', 'Overview'], ['assignment', 'Lead Assignment'], ['pending', `Pending Deals${pending.length ? ` (${pending.length})` : ''}`], ['team', 'Team'], ['leads', 'All Leads'], ['settings', 'Settings']].map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', background: sub === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: BORDER, color: sub === k ? WHITE : T45 }}>
            {l}
          </button>
        ))}
      </div>

      {sub === 'overview' && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <StatCard label="Team Leads" value={teamLeads} sub="All reps" />
            <StatCard label="Deals Closed" value={teamDeals} sub="Team total" />
            <StatCard label="Commission Owed" value={money(owed)} sub="Approved unpaid" accent />
            <StatCard label="Commission Paid" value={money(paid)} sub="All time" />
            <StatCard label="Reps" value={reps.length} sub="Active team" />
          </div>
          <Section title="Team Performance">
            {reps.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: WHITE }}>
                  {initials(r.name)}
                </div>
                <span style={{ flex: 1, fontSize: 14, color: WHITE }}>{r.name}</span>
                <span style={{ fontSize: 12, color: T40, width: 70 }}>{r.total_leads} leads</span>
                <span style={{ fontSize: 12, color: T40, width: 70 }}>{r.deals_closed} deals</span>
                <span style={{ fontSize: 12, color: '#AAAAAA', width: 110 }}>{money(r.pending_commission)} owed</span>
                <span style={{ fontSize: 12, color: BEIGE, width: 100 }}>{money(r.paid_commission)} paid</span>
              </div>
            ))}
          </Section>
        </>
      )}

      {sub === 'assignment' && <LeadAssignment rep={rep} toast={toast} />}

      {sub === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pending.length === 0 && <div style={{ color: T35, fontSize: 13, padding: 24, textAlign: 'center' }}>No deals pending</div>}
          {pending.map((d) => (
            <PendingDeal key={d.id} d={d} onDecide={decide} />
          ))}
        </div>
      )}

      {sub === 'team' && (
        <Section title="Team">
          {reps.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
              <span style={{ flex: 1, fontSize: 14, color: WHITE }}>{r.name}</span>
              <span style={{ fontSize: 12, color: T40 }}>{r.email}</span>
              <span style={{ fontSize: 12, color: T40 }}>{r.commission_rate}%</span>
              {Number(r.pending_commission || 0) > 0 && (
                <button style={{ ...btnGhost, fontSize: 12, padding: '4px 10px' }} onClick={() => toast('Use Pending Deals to pay individual deals')}>
                  {money(r.pending_commission)} owed
                </button>
              )}
            </div>
          ))}
        </Section>
      )}

      {sub === 'leads' && (
        <Section title="All Leads" subtitle={`${allLeads.length} total`}>
          {allLeads.slice(0, 100).map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
              <span style={{ flex: 1, fontSize: 13, color: WHITE }}>{l.company_name}</span>
              <span style={{ fontSize: 12, color: T40, width: 120 }}>{l.rep_name || '—'}</span>
              <StatusPill status={l.status} />
            </div>
          ))}
        </Section>
      )}

      {sub === 'settings' && (
        <Section title="Services Catalog">
          {services.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)', fontSize: 13, color: WHITE }}>
              <span>{s.name}</span>
              <span style={{ color: BEIGE }}>{s.commission_rate}% · {money(s.price_min)}+</span>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 12, color: T35 }}>
            Invite code: •••••••• — set via SALES_REP_INVITE_CODE env var.
          </div>
        </Section>
      )}
    </div>
  )
}
function LeadAssignment({ rep, toast }) {
  const [team, setTeam] = useState([])
  const [pool, setPool] = useState([])
  const [filterRep, setFilterRep] = useState('all')
  const [selected, setSelected] = useState([])
  const [bulkRep, setBulkRep] = useState('')

  const load = useCallback(async () => {
    const [to, lp] = await Promise.all([
      salesApi('team_overview'),
      salesApi('admin_leads_pool'),
    ])
    setTeam(to.team || [])
    setPool(lp.leads || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const unassigned = (pool || []).filter((l) => !l.rep_id)
  const maxLeads = Math.max(1, ...(team || []).map((t) => Number(t.total_leads || 0)))

  async function assign(leadId, repId, repName) {
    if (!repId) return
    await salesApi('assign_lead', {
      method: 'POST',
      body: { lead_id: leadId, rep_id: repId, admin_id: rep.id },
    })
    setPool((p) => p.filter((x) => x.id !== leadId))
    setSelected((s) => s.filter((x) => x !== leadId))
    toast(`Assigned to ${repName || 'rep'}`)
    load()
  }
  async function bulkAssign() {
    if (!bulkRep || selected.length === 0) return
    await salesApi('bulk_assign_leads', {
      method: 'POST',
      body: { lead_ids: selected, rep_id: bulkRep, admin_id: rep.id },
    })
    toast(`Assigned ${selected.length} leads`)
    setSelected([])
    setBulkRep('')
    load()
  }
  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const byRep =
    filterRep === 'all'
      ? pool
      : (pool || []).filter((l) => l.rep_id === filterRep)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>
          Lead Assignment
        </div>
        <div style={{ fontSize: 12, color: T35 }}>
          Distribute leads to your sales team
        </div>
      </div>

      {/* TASK 7 — weekly distribution */}
      <Section title="This Week's Distribution">
        {(team || []).length === 0 && (
          <div style={{ fontSize: 12, color: T35 }}>No reps yet</div>
        )}
        {(team || []).map((t) => {
          const n = Number(t.total_leads || 0)
          return (
            <div
              key={t.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}
            >
              <span style={{ width: 120, fontSize: 13, color: WHITE }}>
                {t.name}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 10,
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 5,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round((n / maxLeads) * 100)}%`,
                    height: '100%',
                    background: BEIGE,
                  }}
                />
              </div>
              <span style={{ width: 60, fontSize: 12, color: T40, textAlign: 'right' }}>
                {n} leads
              </span>
            </div>
          )
        })}
        {unassigned.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#AAAAAA' }}>
            Total unassigned: {unassigned.length}
          </div>
        )}
      </Section>

      {/* Team overview cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(team || []).map((t) => (
          <div
            key={t.id}
            onClick={() => setFilterRep(filterRep === t.id ? 'all' : t.id)}
            style={{
              flex: '1 1 200px',
              background: STAT_BG,
              border:
                filterRep === t.id
                  ? `0.5px solid ${BEIGE}`
                  : BORDER,
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: WHITE,
                }}
              >
                {initials(t.name)}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
                {t.name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: T40 }}>
                {t.total_leads || 0} total
              </span>
              <span style={{ fontSize: 12, color: '#FFFFFF' }}>
                {t.closed || 0} closed
              </span>
              <span style={{ fontSize: 12, color: '#AAAAAA' }}>
                {t.in_progress || 0} in progress
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Unassigned leads + bulk assign */}
      <Section
        title="Unassigned Leads"
        right={
          unassigned.length > 0 ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#FF4444',
                background: 'rgba(255, 68, 68,0.12)',
                border: '0.5px solid rgba(255, 68, 68,0.4)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {unassigned.length}
            </span>
          ) : null
        }
      >
        {selected.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: T40 }}>
              {selected.length} selected · Assign to:
            </span>
            <select
              style={{ ...inputStyle, width: 'auto', padding: '6px 10px' }}
              value={bulkRep}
              onChange={(e) => setBulkRep(e.target.value)}
            >
              <option value="">Select rep…</option>
              {(team || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button style={btnPrimary} onClick={bulkAssign} disabled={!bulkRep}>
              Assign
            </button>
          </div>
        )}
        {unassigned.length === 0 && (
          <div style={{ fontSize: 12, color: T35 }}>All leads are assigned</div>
        )}
        {unassigned.map((l) => (
          <div
            key={l.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(l.id)}
              onChange={() => toggle(l.id)}
            />
            <span style={{ flex: 1, fontSize: 13, color: WHITE }}>
              {l.company_name}
            </span>
            <span style={{ fontSize: 12, color: T40, width: 110 }}>
              {l.contact_name || '—'}
            </span>
            <span style={{ fontSize: 12, color: T40, width: 90 }}>
              {l.industry || '—'}
            </span>
            <span style={{ fontSize: 11, color: T35, width: 90 }}>
              {timeAgo(l.created_at)}
            </span>
            <select
              style={{ ...inputStyle, width: 'auto', padding: '5px 8px', fontSize: 12 }}
              defaultValue=""
              onChange={(e) => {
                const t = (team || []).find((x) => x.id === e.target.value)
                assign(l.id, e.target.value, t?.name)
              }}
            >
              <option value="">Assign to…</option>
              {(team || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </Section>

      {/* All leads by rep */}
      <Section title="All Leads by Rep">
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {['all', ...(team || []).map((t) => t.id)].map((id) => {
            const label =
              id === 'all'
                ? 'All'
                : (team || []).find((t) => t.id === id)?.name || 'Rep'
            return (
              <button
                key={id}
                onClick={() => setFilterRep(id)}
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  background:
                    filterRep === id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: BORDER,
                  color: filterRep === id ? WHITE : T45,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {(byRep || []).slice(0, 100).map((l) => (
          <div
            key={l.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ flex: 1, fontSize: 13, color: WHITE }}>
              {l.company_name}
            </span>
            <StatusPill status={l.status} />
            <span style={{ fontSize: 11, color: T35, width: 90 }}>
              {timeAgo(l.updated_at)}
            </span>
            <select
              style={{ ...inputStyle, width: 'auto', padding: '5px 8px', fontSize: 12 }}
              value={l.rep_id || ''}
              onChange={(e) => {
                const t = (team || []).find((x) => x.id === e.target.value)
                assign(l.id, e.target.value, t?.name)
              }}
            >
              <option value="">Unassigned</option>
              {(team || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </Section>
    </div>
  )
}

function PendingDeal({ d, onDecide }) {
  const [notes, setNotes] = useState('')
  const [rej, setRej] = useState(false)
  return (
    <div style={{ background: STAT_BG, border: BORDER, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
        {d.rep_name} — {d.company_name}
      </div>
      <div style={{ fontSize: 12, color: T40, margin: '4px 0' }}>
        {d.service_name} · {money(d.deal_value)} · commission <span style={{ color: BEIGE }}>{money(d.commission_amount)}</span> · {new Date(d.created_at).toLocaleDateString()}
      </div>
      {d.payment_proof_url && (
        <a href={d.payment_proof_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: BEIGE }}>
          View payment proof
        </a>
      )}
      {rej && <textarea style={{ ...inputStyle, minHeight: 50, marginTop: 8, fontSize: 12 }} placeholder="Rejection notes" value={notes} onChange={(e) => setNotes(e.target.value)} />}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={() => onDecide(d, true)} style={{ flex: 1, background: 'rgba(255, 255, 255,0.15)', border: '0.5px solid rgba(255, 255, 255,0.4)', color: '#FFFFFF', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          Approve
        </button>
        <button onClick={() => (rej ? onDecide(d, false, notes) : setRej(true))} style={{ flex: 1, background: 'rgba(255, 68, 68,0.12)', border: '0.5px solid rgba(255, 68, 68,0.4)', color: '#FF4444', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
          {rej ? 'Confirm Reject' : 'Reject'}
        </button>
      </div>
    </div>
  )
}

// ===================== ROOT =====================
export default function Sales() {
  const isMobile = useIsMobile()
  const [rep, setRep] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState({})
  const [addLead, setAddLead] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [toastState, setToastState] = useState(null)

  const toast = useCallback((msg, kind) => {
    setToastState({ msg, kind })
    setTimeout(() => setToastState(null), 3000)
  }, [])

  const reload = useCallback(async () => {
    if (!rep) return
    const [leads, deals, kpis, tasks, activities, lb] = await Promise.all([
      salesApi('rep_leads', { params: { rep_id: rep.id } }),
      salesApi('rep_deals', { params: { rep_id: rep.id } }),
      salesApi('rep_kpis', { params: { rep_id: rep.id } }),
      salesApi('rep_tasks', { params: { rep_id: rep.id } }),
      salesApi('rep_activities', { params: { rep_id: rep.id } }),
      salesApi('leaderboard'),
    ])
    setData({
      leads: leads.leads || [],
      deals: deals.deals || [],
      kpis: kpis || {},
      tasks: tasks.tasks || [],
      activities: activities.activities || [],
      leaderboard: lb.leaderboard || [],
    })
  }, [rep])

  useEffect(() => {
    reload()
  }, [reload])

  if (!rep) return <Login onAuthed={setRep} />

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setRep(null)
  }
  const navItems = [
    ['dashboard', 'Dashboard'],
    ['leads', 'Leads'],
    ['discover', 'Discover'],
    ['pipeline', 'Pipeline'],
    ['offers', 'Offers'],
    ['scripts', 'Scripts'],
    ['tasks', 'Tasks'],
    ...(rep.role === 'admin' ? [['admin', 'Admin']] : []),
  ]
  const mobileNav = [
    ['dashboard', 'Dashboard'],
    ['leads', 'Leads'],
    ['pipeline', 'Pipeline'],
    ['tasks', 'Tasks'],
  ]

  function openAddLead(pf) {
    setPrefill(pf || null)
    setAddLead(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: WHITE, fontFamily: 'system-ui, -apple-system, sans-serif', paddingBottom: isMobile ? 64 : 0 }}>
      <AnimatePresence>
        {toastState && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ position: 'fixed', top: 70, right: 16, zIndex: 300, background: 'rgba(20, 20, 20,0.97)', border: `0.5px solid ${toastState.kind === 'error' ? 'rgba(255, 68, 68,0.5)' : 'rgba(255, 255, 255,0.5)'}`, color: toastState.kind === 'error' ? '#FF4444' : BEIGE, padding: '10px 16px', borderRadius: 10, fontSize: 13, maxWidth: 320 }}
          >
            {toastState.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAV */}
      <div style={{ height: 56, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: NAV_BG, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/lithos-logo.png" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, color: WHITE }}>Lithos</span>
          <span style={{ fontWeight: 300, color: T40 }}>Labs</span>
          <span style={{ border: `0.5px solid rgba(255, 255, 255,0.4)`, color: BEIGE, fontSize: 10, padding: '2px 8px', borderRadius: 999, marginLeft: 4 }}>
            SALES
          </span>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 2 }}>
            {navItems.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{ fontSize: 14, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', background: tab === k ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', fontWeight: tab === k ? 500 : 400, color: tab === k ? WHITE : T45 }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Bell repId={rep.id} />
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: WHITE }}>
            {initials(rep.name)}
          </div>
          <button onClick={logout} style={{ background: 'transparent', border: 'none', color: T45, fontSize: 13, cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '56px auto 0', padding: isMobile ? 16 : 32 }}>
        {tab === 'dashboard' && <Dashboard rep={rep} data={data} onTab={setTab} onAddLead={() => openAddLead()} />}
        {tab === 'leads' && <Leads rep={rep} leads={data.leads || []} reload={reload} toast={toast} isMobile={isMobile} onAddLead={() => openAddLead()} />}
        {tab === 'discover' && <Discover rep={rep} toast={toast} onPrefill={(r) => openAddLead(r)} />}
        {tab === 'pipeline' && <Pipeline rep={rep} leads={data.leads || []} reload={reload} toast={toast} />}
        {tab === 'offers' && <Offers rep={rep} toast={toast} />}
        {tab === 'scripts' && <Scripts toast={toast} />}
        {tab === 'tasks' && <Tasks rep={rep} tasks={data.tasks || []} leads={data.leads || []} reload={reload} toast={toast} />}
        {tab === 'admin' && rep.role === 'admin' && <Admin rep={rep} toast={toast} />}
      </div>

      {/* MOBILE NAV */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: NAV_BG, borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', zIndex: 100 }}>
          {mobileNav.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, background: 'transparent', border: 'none', color: tab === k ? WHITE : T45, fontSize: 11, cursor: 'pointer', minHeight: 44 }}>
              {l}
            </button>
          ))}
          <button onClick={() => setTab('more') || setTab('offers')} style={{ flex: 1, background: 'transparent', border: 'none', color: T45, fontSize: 11, cursor: 'pointer', minHeight: 44 }}>
            More
          </button>
        </div>
      )}

      <SlidePanel open={addLead} onClose={() => setAddLead(false)} isMobile={isMobile}>
        {addLead && (
          <AddLeadPanel
            rep={rep}
            prefill={prefill}
            onClose={() => {
              setAddLead(false)
              setPrefill(null)
            }}
            onSaved={reload}
            toast={toast}
            isMobile={isMobile}
          />
        )}
      </SlidePanel>
    </div>
  )
}
