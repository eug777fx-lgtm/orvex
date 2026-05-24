import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  PhoneCall,
  BellRing,
  CheckCircle2,
  TrendingUp,
  PhoneMissed,
  MessageCircle,
  Mail,
  CalendarClock,
  Eye,
  Pencil,
  X,
  Loader2,
} from 'lucide-react'
import PageShell from '../components/PageShell'

// ---- tokens (monochrome + minimal status colors) ----
const BG_CARD = '#111111'
const BG_ELEVATED = '#1A1A1A'
const BG_INPUT = '#141414'
const BORDER = '#2A2A2A'
const BORDER_SUBTLE = '#1A1A1A'
const TEXT = '#FFFFFF'
const TEXT_MUTED = '#A0A0A0'
const TEXT_DIM = '#666666'

const STATUS = {
  LIVE: { label: 'LIVE', bg: 'rgba(34, 197, 94, 0.12)', color: '#4ADE80', border: 'rgba(34, 197, 94, 0.35)' },
  BUILDING: { label: 'BUILDING', bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', border: 'rgba(245, 158, 11, 0.35)' },
  PLANNED: { label: 'PLANNED', bg: 'rgba(120, 120, 120, 0.12)', color: '#A0A0A0', border: 'rgba(120, 120, 120, 0.35)' },
}

const card = {
  background: BG_CARD,
  border: '1px solid ' + BORDER,
  borderRadius: 12,
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: TEXT_MUTED,
  marginBottom: 6,
  display: 'block',
}

const inputStyle = {
  width: '100%',
  background: BG_INPUT,
  border: '1px solid ' + BORDER,
  borderRadius: 8,
  color: TEXT,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
}

const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: '#FFFFFF',
  color: '#000000',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'transparent',
  color: TEXT,
  border: '1px solid ' + BORDER,
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 12.5,
  fontWeight: 500,
  cursor: 'pointer',
}

// ---- catalog of automations ----
const AUTOMATIONS = [
  {
    id: 'ai_receptionist',
    status: 'LIVE',
    icon: PhoneCall,
    title: 'AI Receptionist — Marco',
    desc: 'Answers every call 24/7, qualifies leads, logs call summaries automatically.',
    platform: 'Retell AI',
    extra: { 'Agent ID': 'agent_62e644f7e87b21baf4f1d84144', 'Call logs (this month)': '0' },
  },
  {
    id: 'new_lead',
    status: 'LIVE',
    icon: BellRing,
    title: 'New Lead Notification',
    desc: 'Fires instantly when a new lead is added — notifies the team via email.',
    platform: 'Make.com',
  },
  {
    id: 'deal_approval',
    status: 'LIVE',
    icon: CheckCircle2,
    title: 'Deal Approval Alert',
    desc: 'When a deal is submitted for approval, owner gets notified immediately.',
    platform: 'Make.com',
  },
  {
    id: 'daily_report',
    status: 'LIVE',
    icon: TrendingUp,
    title: 'Daily Performance Report',
    desc: 'Every day at 8PM sends a full pipeline summary to the team.',
    platform: 'Make.com',
  },
  {
    id: 'missed_call',
    status: 'BUILDING',
    icon: PhoneMissed,
    title: 'Missed Call Text-Back',
    desc: 'Client misses a call → instant WhatsApp message sent to the caller automatically.',
    platform: 'Make.com + WhatsApp API',
  },
  {
    id: 'whatsapp_ai',
    status: 'BUILDING',
    icon: MessageCircle,
    title: 'WhatsApp AI Chatbot',
    desc: '24/7 AI chatbot per client — each business gets its own brain and persona.',
    platform: 'Make.com + Claude API + Meta',
  },
  {
    id: 'follow_up',
    status: 'PLANNED',
    icon: Mail,
    title: 'Follow-Up Sequence',
    desc: 'New lead → Day 1, 3, 7, 30 automated follow-up emails.',
    platform: 'Make.com',
  },
  {
    id: 'appt_reminder',
    status: 'PLANNED',
    icon: CalendarClock,
    title: 'Appointment Reminder',
    desc: 'Booking confirmed → WhatsApp reminder sent 24h before.',
    platform: 'Make.com',
  },
]

// ---- seed WhatsApp clients (local state for now) ----
const SEED_CLIENTS = [
  {
    id: 'awatec',
    business_name: 'AWATEC',
    whatsapp_number: '+297 5626784',
    prompt:
      'Leak detection & plumbing company in Aruba. Answer questions about leak detection, pressure service, plumbing repairs. Pricing: Inspection Afl.150. Always be professional and friendly. Escalate to human if customer is angry.',
    ai_enabled: true,
  },
  {
    id: 'restaurant_demo',
    business_name: 'Restaurant Demo',
    whatsapp_number: '+297 7401234',
    prompt:
      'Italian restaurant in Oranjestad. Hours: Mon-Sat 11am-10pm. Take reservations via WhatsApp. Menu includes pasta, pizza, seafood. Specials change daily.',
    ai_enabled: true,
  },
  {
    id: 'salon_demo',
    business_name: 'Salon Demo',
    whatsapp_number: '+297 7405678',
    prompt:
      'Beauty salon in Noord. Services: hair, nails, facials. Book appointments Mon-Sat 9am-6pm. Walk-ins welcome if available.',
    ai_enabled: true,
  },
  {
    id: 'car_dealer_demo',
    business_name: 'Car Dealer Demo',
    whatsapp_number: '+297 7409012',
    prompt:
      'Used car dealership in Santa Cruz. Stock changes weekly. Offer test drives by appointment. Financing available.',
    ai_enabled: false,
  },
  {
    id: 'real_estate_demo',
    business_name: 'Real Estate Demo',
    whatsapp_number: '+297 7403456',
    prompt:
      'Real estate agency covering all of Aruba. Rentals and sales. Respond in English and Papiamento.',
    ai_enabled: true,
  },
]

const TABS = [
  { key: 'overview', label: 'Overview', icon: Zap },
  { key: 'clients', label: 'WhatsApp Clients', icon: MessageCircle },
]

export default function Automations() {
  const [tab, setTab] = useState('overview')
  const [toast, setToast] = useState('')
  const [viewing, setViewing] = useState(null)
  const [clients, setClients] = useState(SEED_CLIENTS)
  const [editingClient, setEditingClient] = useState(null)

  function showToast(m) {
    setToast(m)
    setTimeout(() => setToast(''), 2400)
  }

  function toggleAi(id) {
    setClients((list) =>
      list.map((c) => (c.id === id ? { ...c, ai_enabled: !c.ai_enabled } : c)),
    )
  }

  function saveBrain(id, prompt) {
    setClients((list) => list.map((c) => (c.id === id ? { ...c, prompt } : c)))
    showToast('Brain updated')
    setEditingClient(null)
  }

  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header */}
        <div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: TEXT,
              letterSpacing: '-0.3px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Zap size={22} /> AI Automations Hub
          </h2>
          <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 6 }}>
            Every active and planned automation across Lithos Labs clients.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? '#000000' : TEXT_MUTED,
                  background: active ? '#FFFFFF' : 'transparent',
                  border: active ? '1px solid #FFFFFF' : '1px solid ' + BORDER,
                  borderRadius: 10,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
        </div>

        {tab === 'overview' && (
          <OverviewTab onView={setViewing} />
        )}
        {tab === 'clients' && (
          <ClientsTab
            clients={clients}
            onToggle={toggleAi}
            onEditBrain={setEditingClient}
            onViewChats={() => showToast('Coming soon')}
          />
        )}
      </div>

      <AnimatePresence>
        {viewing && <DetailsModal automation={viewing} onClose={() => setViewing(null)} />}
        {editingClient && (
          <EditBrainModal
            client={editingClient}
            onClose={() => setEditingClient(null)}
            onSave={(prompt) => saveBrain(editingClient.id, prompt)}
          />
        )}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: BG_ELEVATED,
              border: '1px solid ' + BORDER,
              color: TEXT,
              fontSize: 13,
              fontWeight: 500,
              padding: '12px 22px',
              borderRadius: 12,
              zIndex: 300,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

// ---------- Overview ----------
function OverviewTab({ onView }) {
  const grouped = useMemo(() => {
    return {
      LIVE: AUTOMATIONS.filter((a) => a.status === 'LIVE'),
      BUILDING: AUTOMATIONS.filter((a) => a.status === 'BUILDING'),
      PLANNED: AUTOMATIONS.filter((a) => a.status === 'PLANNED'),
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {(['LIVE', 'BUILDING', 'PLANNED']).map((key) => {
        const list = grouped[key]
        if (list.length === 0) return null
        return (
          <section key={key} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: TEXT,
                  textTransform: 'uppercase',
                }}
              >
                {key}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  color: TEXT_DIM,
                  background: BG_ELEVATED,
                  borderRadius: 999,
                  padding: '2px 8px',
                  border: '1px solid ' + BORDER_SUBTLE,
                }}
              >
                {list.length}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 14,
              }}
            >
              {list.map((a) => (
                <AutomationCard key={a.id} automation={a} onView={() => onView(a)} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS[status]
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        background: s.bg,
        color: s.color,
        border: '1px solid ' + s.border,
        borderRadius: 999,
        padding: '3px 10px',
      }}
    >
      {s.label}
    </span>
  )
}

function PlatformBadge({ platform }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        color: TEXT_MUTED,
        background: BG_ELEVATED,
        border: '1px solid ' + BORDER_SUBTLE,
        borderRadius: 6,
        padding: '3px 8px',
      }}
    >
      {platform}
    </span>
  )
}

function AutomationCard({ automation, onView }) {
  const Icon = automation.icon
  return (
    <div
      style={{
        ...card,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: BG_ELEVATED,
            border: '1px solid ' + BORDER_SUBTLE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TEXT,
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </div>
        <StatusBadge status={automation.status} />
      </div>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT, letterSpacing: '-0.1px' }}>
          {automation.title}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: TEXT_MUTED,
            marginTop: 6,
            lineHeight: 1.55,
          }}
        >
          {automation.desc}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <PlatformBadge platform={automation.platform} />
      </div>
      {automation.extra && (
        <div
          style={{
            fontSize: 11,
            color: TEXT_DIM,
            background: '#0A0A0A',
            border: '1px solid ' + BORDER_SUBTLE,
            borderRadius: 8,
            padding: '8px 10px',
            lineHeight: 1.6,
            wordBreak: 'break-all',
          }}
        >
          {Object.entries(automation.extra).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: TEXT_MUTED }}>{k}:</span>{' '}
              <span style={{ color: TEXT, fontFamily: k.toLowerCase().includes('id') ? 'monospace' : 'inherit' }}>
                {v}
              </span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onView}
        style={{
          ...ghostBtn,
          width: '100%',
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        <Eye size={13} /> View Details
      </button>
    </div>
  )
}

// ---------- WhatsApp Clients ----------
function ClientsTab({ clients, onToggle, onEditBrain, onViewChats }) {
  const totalClients = clients.length
  const activeBots = clients.filter((c) => c.ai_enabled).length

  const stats = [
    { label: 'Clients connected', value: totalClients },
    { label: 'Active AI bots', value: activeBots },
    { label: 'Messages this month', value: 0 },
    { label: 'Avg response time', value: '< 2s' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ ...card, padding: 18 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: TEXT_DIM,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: '-0.5px' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 14,
        }}
      >
        {clients.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            onToggle={() => onToggle(c.id)}
            onEditBrain={() => onEditBrain(c)}
            onViewChats={() => onViewChats(c)}
          />
        ))}
      </div>
    </div>
  )
}

function AiToggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label="Toggle AI"
      style={{
        width: 46,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'rgba(34, 197, 94, 0.85)' : '#333333',
        position: 'relative',
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 25 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#FFFFFF',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
        }}
      />
    </button>
  )
}

function ClientCard({ client, onToggle, onEditBrain, onViewChats }) {
  const preview = (client.prompt || '').slice(0, 80) + ((client.prompt || '').length > 80 ? '…' : '')
  return (
    <div
      style={{
        ...card,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{client.business_name}</div>
          <div
            style={{
              fontSize: 12,
              color: TEXT_MUTED,
              marginTop: 3,
              fontFamily: 'monospace',
            }}
          >
            {client.whatsapp_number}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.06em',
              color: client.ai_enabled ? '#4ADE80' : TEXT_DIM,
            }}
          >
            {client.ai_enabled ? 'AI ON' : 'AI OFF'}
          </span>
          <AiToggle on={client.ai_enabled} onChange={onToggle} />
        </div>
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: TEXT_MUTED,
          background: '#0A0A0A',
          border: '1px solid ' + BORDER_SUBTLE,
          borderRadius: 8,
          padding: 10,
          lineHeight: 1.55,
          fontStyle: 'italic',
        }}
      >
        “{preview}”
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <PlatformBadge platform="Make.com + Claude API + Meta" />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onEditBrain}
          style={{ ...primaryBtn, padding: '8px 14px', fontSize: 12.5, flex: 1, justifyContent: 'center' }}
        >
          <Pencil size={12} /> Edit Brain
        </button>
        <button
          type="button"
          onClick={onViewChats}
          style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}
        >
          <Eye size={13} /> View Chats
        </button>
      </div>
    </div>
  )
}

// ---------- Modals ----------
function ModalShell({ onClose, title, children, maxWidth = 560 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.9)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid ' + BORDER_SUBTLE,
              borderRadius: 8,
              color: TEXT_MUTED,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function DetailsModal({ automation, onClose }) {
  const Icon = automation.icon
  return (
    <ModalShell onClose={onClose} title={automation.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: BG_ELEVATED,
              border: '1px solid ' + BORDER_SUBTLE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: TEXT,
              flexShrink: 0,
            }}
          >
            <Icon size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <StatusBadge status={automation.status} />
            <PlatformBadge platform={automation.platform} />
          </div>
        </div>

        <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{automation.desc}</p>

        {automation.extra && (
          <div
            style={{
              fontSize: 12,
              background: '#0A0A0A',
              border: '1px solid ' + BORDER_SUBTLE,
              borderRadius: 8,
              padding: 14,
              lineHeight: 1.7,
              color: TEXT,
              wordBreak: 'break-all',
            }}
          >
            {Object.entries(automation.extra).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: TEXT_MUTED, fontWeight: 600 }}>{k}:</span>{' '}
                <span style={{ fontFamily: k.toLowerCase().includes('id') ? 'monospace' : 'inherit' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function EditBrainModal({ client, onClose, onSave }) {
  const [prompt, setPrompt] = useState(client.prompt || '')
  const [saving, setSaving] = useState(false)

  function handleSave() {
    setSaving(true)
    // Local-only persistence for now — no API call.
    setTimeout(() => {
      onSave(prompt)
      setSaving(false)
    }, 200)
  }

  return (
    <ModalShell onClose={onClose} title="Edit AI Brain">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Business name</label>
          <input style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} value={client.business_name} readOnly />
        </div>
        <div>
          <label style={labelStyle}>WhatsApp number</label>
          <input
            style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed', fontFamily: 'monospace' }}
            value={client.whatsapp_number}
            readOnly
          />
        </div>
        <div>
          <label style={labelStyle}>System prompt — the AI's brain</label>
          <textarea
            rows={8}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 180, lineHeight: 1.5 }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 6 }}>
            {prompt.length} characters
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            paddingTop: 8,
            borderTop: '1px solid ' + BORDER_SUBTLE,
          }}
        >
          <button type="button" onClick={onClose} style={ghostBtn} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} style={primaryBtn} disabled={saving}>
            {saving && <Loader2 size={13} className="spin" />}
            Save Brain
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
