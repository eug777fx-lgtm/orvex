import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Phone,
  Repeat,
  Calendar,
  MessageSquare,
  RefreshCw,
  Check,
  Loader2,
  Trash2,
  X,
  PhoneCall,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { workflowApi } from '../lib/auth'

const TEMPLATES = [
  {
    type: 'lead_capture',
    name: 'Lead Capture → CRM',
    icon: Zap,
    desc: 'Form submitted → CRM saved → Rep notified → Welcome email sent',
    flow: ['Form', 'CRM', 'Email', 'Rep'],
    fields: [
      { key: 'webhook_url', label: 'Webhook URL' },
      { key: 'notify_email', label: 'Email to notify' },
      { key: 'assign_rep', label: 'Rep to assign' },
    ],
  },
  {
    type: 'missed_call',
    name: 'Missed Call Text-Back',
    icon: Phone,
    desc: 'Missed call → Instant WhatsApp → Qualify lead → Book appointment',
    flow: ['Missed call', 'WhatsApp', 'Qualify', 'Book'],
    fields: [
      { key: 'business_phone', label: 'Business phone number' },
      { key: 'whatsapp_number', label: 'WhatsApp number' },
    ],
  },
  {
    type: 'follow_up',
    name: 'Follow-Up Sequence',
    icon: Repeat,
    desc: 'New lead → Day 1 → Day 3 → Day 7 → Day 30 reactivation',
    flow: ['Day 1', 'Day 3', 'Day 7', 'Day 30'],
    fields: [
      { key: 'lead_source', label: 'Lead source' },
      { key: 'email_template', label: 'Email template' },
    ],
  },
  {
    type: 'appointment_reminder',
    name: 'Appointment Reminder',
    icon: Calendar,
    desc: '24h before → WhatsApp reminder → Confirm attendance',
    flow: ['24h before', 'Reminder', 'Confirm'],
    fields: [
      { key: 'calendar_link', label: 'Calendar link' },
      { key: 'whatsapp_number', label: 'WhatsApp number' },
    ],
  },
  {
    type: 'whatsapp_ai',
    name: 'WhatsApp AI Chatbot',
    icon: MessageSquare,
    desc: 'Customer messages → AI responds 24/7 → Qualifies → Books → Saves to CRM',
    flow: ['Message', 'AI reply', 'Qualify', 'Book'],
    fields: [
      { key: 'whatsapp_business', label: 'WhatsApp Business number' },
      { key: 'ai_persona', label: 'AI persona name' },
    ],
  },
  {
    type: 'reactivation',
    name: 'Lead Reactivation',
    icon: RefreshCw,
    desc: '30 days inactive → Reactivation campaign → Special offer → Book call',
    flow: ['Inactive', 'Campaign', 'Offer', 'Book'],
    fields: [
      { key: 'inactive_days', label: 'Inactive days threshold' },
      { key: 'offer_text', label: 'Offer text' },
    ],
  },
]

const card = {
  background: 'rgba(194,181,155,0.03)',
  border: '0.5px solid rgba(194,181,155,0.08)',
  borderRadius: 14,
  padding: 20,
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(255,255,255,0.4)',
  marginBottom: 6,
  display: 'block',
}

export default function Automations() {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [automations, setAutomations] = useState([])
  const [deployTemplate, setDeployTemplate] = useState(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [toast, setToast] = useState('')

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) || null,
    [clients, clientId],
  )

  function showToast(m) {
    setToast(m)
    setTimeout(() => setToast(''), 2600)
  }

  async function loadClients() {
    try {
      const data = await workflowApi('get_clients')
      setClients(data?.clients || [])
    } catch (e) {
      /* noop */
    }
  }

  async function loadAutomations(cid) {
    try {
      const data = await workflowApi('get_automations', {
        params: cid ? { client_id: cid } : {},
      })
      setAutomations(data?.automations || [])
    } catch (e) {
      setAutomations([])
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    loadAutomations(clientId)
  }, [clientId])

  async function toggleAutomation(a) {
    const next = a.status === 'active' ? 'inactive' : 'active'
    setAutomations((list) =>
      list.map((x) => (x.id === a.id ? { ...x, status: next } : x)),
    )
    try {
      await workflowApi('toggle_automation', {
        method: 'POST',
        body: { automation_id: a.id, status: next },
      })
    } catch (e) {
      loadAutomations(clientId)
    }
  }

  async function deleteAutomation(id) {
    setAutomations((list) => list.filter((x) => x.id !== id))
    try {
      await workflowApi('delete_automation', {
        method: 'POST',
        body: { automation_id: id },
      })
    } catch (e) {
      loadAutomations(clientId)
    }
  }

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.4px' }}>
            Automations
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            Manage client automation workflows
          </p>
        </div>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {TEMPLATES.map((t) => {
          const Icon = t.icon
          return (
            <div key={t.type} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(194,181,155,0.12)',
                    border: '0.5px solid rgba(194,181,155,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C2B59B',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff' }}>
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.42)',
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {t.desc}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {t.flow.map((step, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.55)',
                        background: 'rgba(255,255,255,0.04)',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                        borderRadius: 6,
                        padding: '3px 8px',
                      }}
                    >
                      {step}
                    </span>
                    {i < t.flow.length - 1 && (
                      <span style={{ color: 'rgba(194,181,155,0.5)', fontSize: 11 }}>→</span>
                    )}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setDeployTemplate(t)}
                style={{
                  marginTop: 'auto',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#C2B59B',
                  background: 'rgba(194,181,155,0.08)',
                  border: '0.5px solid rgba(194,181,155,0.22)',
                }}
              >
                Deploy for Client
              </button>
            </div>
          )
        })}
      </div>

      {/* Active automations */}
      <div style={{ ...card }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            marginBottom: 14,
          }}
        >
          Active Automations{' '}
          {selectedClient && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              · {selectedClient.company_name}
            </span>
          )}
        </h3>
        {automations.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)' }}>
            No automations deployed{selectedClient ? ' for this client' : ''} yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {automations.map((a) => {
              const active = a.status === 'active'
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#fff', fontWeight: 500 }}>
                    {a.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: '3px 8px',
                    }}
                  >
                    {a.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAutomation(a)}
                    aria-label="Toggle"
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background: active
                        ? 'rgba(74,222,128,0.6)'
                        : 'rgba(255,255,255,0.12)',
                      position: 'relative',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: active ? 21 : 3,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.15s ease',
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAutomation(a.id)}
                    style={iconBtn}
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Voice Agents */}
      <div style={{ marginTop: 8 }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>AI Voice Agents</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 5, marginBottom: 16 }}>
          24/7 AI phone receptionist for your clients
        </p>

        <div
          style={{
            background: 'rgba(125,211,252,0.04)',
            border: '0.5px solid rgba(125,211,252,0.15)',
            borderRadius: 14,
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: 'rgba(125,211,252,0.12)',
                border: '0.5px solid rgba(125,211,252,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7DD3FC',
              }}
            >
              <PhoneCall size={20} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>
                AI Phone Receptionist
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                Never miss a call. AI answers 24/7, qualifies leads, books
                appointments automatically.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              'Answers in English, Papiamento, Spanish',
              'Qualifies every caller automatically',
              'Books appointments to Google Calendar',
              'Saves callers to CRM automatically',
              'Sends instant WhatsApp confirmation',
            ].map((f) => (
              <div
                key={f}
                style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}
              >
                <Check size={14} style={{ color: '#7DD3FC', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#7DD3FC',
                background: 'rgba(125,211,252,0.1)',
                border: '0.5px solid rgba(125,211,252,0.25)',
                borderRadius: 999,
                padding: '6px 14px',
              }}
            >
              From $300/month per client
            </span>
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: '#0B0B0D',
                background: '#7DD3FC',
                border: 'none',
              }}
            >
              Set Up Voice Agent
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deployTemplate && (
          <DeployModal
            template={deployTemplate}
            client={selectedClient}
            onClose={() => setDeployTemplate(null)}
            onSaved={() => {
              setDeployTemplate(null)
              loadAutomations(clientId)
              showToast('Automation saved')
            }}
          />
        )}
        {voiceOpen && (
          <VoiceModal
            client={selectedClient}
            onClose={() => setVoiceOpen(false)}
            onSaved={() => {
              setVoiceOpen(false)
              showToast('Voice agent request submitted')
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
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
              background: '#16161A',
              border: '0.5px solid rgba(194,181,155,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              padding: '12px 22px',
              borderRadius: 12,
              zIndex: 300,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

const iconBtn = {
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'rgba(255,120,120,0.7)',
  cursor: 'pointer',
  flexShrink: 0,
}

function ModalShell({ title, children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#111113',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 460,
          maxHeight: '88vh',
          overflowY: 'auto',
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
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ ...iconBtn, border: 'none', color: 'rgba(255,255,255,0.55)' }}
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

const saveBtnStyle = (color) => ({
  width: '100%',
  marginTop: 18,
  background: color,
  color: '#0B0B0D',
  border: 'none',
  borderRadius: 12,
  padding: 13,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
})

function DeployModal({ template, client, onClose, onSaved }) {
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    try {
      const data = await workflowApi('save_automation', {
        method: 'POST',
        body: {
          client_id: client?.id || null,
          name: template.name,
          type: template.type,
          trigger_type: template.flow[0],
          steps: { flow: template.flow, config: values },
        },
      })
      if (data?.success) onSaved()
    } catch (e) {
      /* noop */
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title={template.name} onClose={onClose}>
      <div
        style={{
          fontSize: 12.5,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 16,
        }}
      >
        Client:{' '}
        <span style={{ color: '#fff', fontWeight: 600 }}>
          {client ? client.company_name : 'No client selected'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {template.fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input
              style={inputStyle}
              value={values[f.key] || ''}
              onChange={set(f.key)}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 11.5,
          color: 'rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '10px 12px',
          lineHeight: 1.5,
        }}
      >
        Make.com integration coming soon — we will connect this manually for
        early clients.
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={saveBtnStyle('#C2B59B')}
      >
        {saving && <Loader2 size={15} className="spin" />}
        Save Automation
      </button>
    </ModalShell>
  )
}

function VoiceModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    business_name: client?.company_name || '',
    phone_number: '',
    business_hours: '',
    services: '',
    booking_link: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit() {
    setSaving(true)
    try {
      const data = await workflowApi('voice_agent_request', {
        method: 'POST',
        body: { client_id: client?.id || null, ...form },
      })
      if (data?.success) onSaved()
    } catch (e) {
      /* noop */
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell title="Vapi AI Voice Agent Setup" onClose={onClose}>
      <p
        style={{
          fontSize: 12.5,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 16,
          lineHeight: 1.55,
        }}
      >
        We configure AI voice agents manually for each client. Fill in the
        details below and we will set it up within 48 hours.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { key: 'business_name', label: 'Client business name' },
          { key: 'phone_number', label: 'Phone number' },
          { key: 'business_hours', label: 'Business hours' },
          { key: 'services', label: 'Services to handle' },
          { key: 'booking_link', label: 'Booking link' },
        ].map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input style={inputStyle} value={form[f.key]} onChange={set(f.key)} />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        style={saveBtnStyle('#7DD3FC')}
      >
        {saving && <Loader2 size={15} className="spin" />}
        Submit Request
      </button>
    </ModalShell>
  )
}
