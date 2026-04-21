import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Pencil,
  Plus,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  X,
} from 'lucide-react'
import db from '@/lib/db'
import EditLeadModal from '../components/EditLeadModal'
import CreateDealModal from '../components/CreateDealModal'
import PageShell from '../components/PageShell'
import { pickBestScript } from '../utils/matchScript'
import { suggestOffer } from '../utils/suggestOffer'

const STATUS_STYLES = {
  new: { bg: 'rgba(255,255,255,0.08)' },
  contacted: { bg: 'rgba(255,255,255,0.12)' },
  follow_up: { bg: 'rgba(255,255,255,0.15)' },
  interested: { bg: 'rgba(255,255,255,0.2)' },
  closed: { bg: 'rgba(255,255,255,0.25)' },
  lost: { bg: 'rgba(255,255,255,0.05)', strike: true },
}

const cardStyle = {
  background: 'rgba(17,17,20,0.65)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.5rem',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const cardHeaderRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
}

const cardTitleStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: '#ffffff',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const cardSubtitleStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.4)',
  marginTop: 2,
}

const labelStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 500,
}

const valueStyle = {
  fontSize: 14,
  color: '#ffffff',
  marginTop: 4,
  wordBreak: 'break-word',
}

const mutedValueStyle = {
  fontSize: 14,
  color: 'rgba(255,255,255,0.35)',
  marginTop: 4,
}

const linkStyle = {
  ...valueStyle,
  color: 'rgba(255,255,255,0.85)',
  textDecoration: 'underline',
  textDecorationColor: 'rgba(255,255,255,0.2)',
  textUnderlineOffset: 3,
}

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.8)',
  borderRadius: 10,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const solidButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 10,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  transition: 'opacity 0.15s ease',
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#ffffff',
  padding: '10px 14px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255,255,255,0.5)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
  cursor: 'pointer',
}

const fieldLabelStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.55)',
  fontWeight: 500,
  marginBottom: 6,
}

function Pill({ children, bg = 'rgba(255,255,255,0.08)', strike = false, muted = false }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 999,
        background: bg,
        color: muted ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'lowercase',
        textDecoration: strike ? 'line-through' : 'none',
      }}
    >
      {children}
    </span>
  )
}

function StatusPill({ status }) {
  const conf = STATUS_STYLES[status] || STATUS_STYLES.new
  return (
    <Pill bg={conf.bg} strike={conf.strike} muted={conf.strike}>
      {status || 'new'}
    </Pill>
  )
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        {Icon ? <Icon size={14} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ marginTop: 2 }}>{children}</div>
      </div>
    </div>
  )
}

function CompanyInfoCard({ lead, onEdit }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Company Info</div>
          <div style={cardSubtitleStyle}>Contact and business details</div>
        </div>
        <button type="button" style={ghostButtonStyle} onClick={onEdit}>
          <Pencil size={12} />
          Edit
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
        }}
      >
        <InfoRow icon={Building2} label="Company">
          <div style={valueStyle}>{lead.company_name || '—'}</div>
          {lead.owner_name && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
              {lead.owner_name}
            </div>
          )}
        </InfoRow>

        <InfoRow icon={Phone} label="Phone">
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} style={linkStyle}>
              {lead.phone}
            </a>
          ) : (
            <div style={mutedValueStyle}>—</div>
          )}
        </InfoRow>

        <InfoRow icon={Mail} label="Email">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} style={linkStyle}>
              {lead.email}
            </a>
          ) : (
            <div style={mutedValueStyle}>—</div>
          )}
        </InfoRow>

        <InfoRow icon={MapPin} label="Location">
          <div style={valueStyle}>{lead.location || '—'}</div>
        </InfoRow>

        <InfoRow icon={Building2} label="Industry">
          {lead.industry ? (
            <div style={{ marginTop: 4 }}>
              <Pill>{lead.industry}</Pill>
            </div>
          ) : (
            <div style={mutedValueStyle}>—</div>
          )}
        </InfoRow>

        <InfoRow icon={Globe} label="Website">
          {lead.website_url ? (
            <a
              href={lead.website_url}
              target="_blank"
              rel="noreferrer"
              style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Visit site
              <ExternalLink size={12} />
            </a>
          ) : (
            <div style={mutedValueStyle}>No website</div>
          )}
        </InfoRow>

        <InfoRow icon={ExternalLink} label="Source">
          <div style={valueStyle}>{lead.source || '—'}</div>
        </InfoRow>

        <InfoRow icon={Calendar} label="Created">
          <div style={valueStyle}>{formatDate(lead.created_at)}</div>
        </InfoRow>
      </div>
    </div>
  )
}

const FLAG_ROWS = [
  { key: 'no_website', label: 'No website', derive: (l) => !l.has_website },
  { key: 'poor_website', label: 'Poor website', derive: (l) => l.website_quality === 'poor' },
  { key: 'no_crm', label: 'No CRM / No System', derive: (l) => !l.has_crm },
  { key: 'manual_processes', label: 'Manual Processes', derive: (l) => !!l.manual_processes },
  {
    key: 'low_reviews',
    label: 'Low reviews',
    derive: (l) => (l.review_count ?? 0) < 10 || (Number(l.avg_rating) || 0) < 3.5,
  },
]

function FlagsCard({ lead }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Opportunity Flags</div>
          <div style={cardSubtitleStyle}>What's missing from this business</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {FLAG_ROWS.map((row, idx) => {
          const yes = row.derive(lead)
          return (
            <div
              key={row.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom:
                  idx === FLAG_ROWS.length - 1
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{row.label}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: yes ? '#ffffff' : 'rgba(255,255,255,0.25)',
                }}
              >
                {yes ? 'YES' : 'NO'}
              </span>
            </div>
          )
        })}
      </div>
      <div
        style={{
          marginTop: 18,
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Opportunity Score</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
          {lead.opportunity_score ?? 0}
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 500 }}>/10</span>
        </div>
      </div>
    </div>
  )
}

function ActivityLogCard({
  leadId,
  companyName,
  activities,
  onLogged,
  onTaskAutoCreated,
  onToast,
  prefillType,
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [type, setType] = useState('call')
  const [outcome, setOutcome] = useState('spoke')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (prefillType) {
      setType(prefillType.type || 'call')
      setFormOpen(true)
    }
  }, [prefillType])

  async function submit(e) {
    e?.preventDefault?.()
    if (!db) return
    setSubmitting(true)
    setError(null)
    try {
      await db.query(
        `INSERT INTO activities (lead_id, type, outcome, notes)
         VALUES ($1, $2, $3, $4)`,
        [leadId, type, outcome, notes.trim() || null],
      )

      if (outcome === 'callback' || outcome === 'follow_up') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const yyyy = tomorrow.getFullYear()
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0')
        const dd = String(tomorrow.getDate()).padStart(2, '0')
        const dueDate = `${yyyy}-${mm}-${dd}`
        const title = `Follow up with ${companyName || 'this lead'}`
        try {
          await db.query(
            `INSERT INTO tasks (lead_id, title, type, due_date, priority, is_complete)
             VALUES ($1, $2, 'follow_up', $3, 'high', false)`,
            [leadId, title, dueDate],
          )
          onTaskAutoCreated?.()
          onToast?.('Follow-up task created for tomorrow')
        } catch (taskErr) {
          console.error('auto follow-up task failed', taskErr)
        }
      }

      setNotes('')
      setFormOpen(false)
      onLogged?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to log activity.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Activity Log</div>
          <div style={cardSubtitleStyle}>History of calls, messages and touchpoints</div>
        </div>
        <button
          type="button"
          style={ghostButtonStyle}
          onClick={() => setFormOpen((v) => !v)}
        >
          {formOpen ? <X size={12} /> : <Plus size={12} />}
          {formOpen ? 'Cancel' : 'Log Activity'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={submit}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={fieldLabelStyle}>Type</div>
              <select style={selectStyle} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="call">call</option>
                <option value="whatsapp">whatsapp</option>
                <option value="email">email</option>
                <option value="dm">dm</option>
              </select>
            </div>
            <div>
              <div style={fieldLabelStyle}>Outcome</div>
              <select
                style={selectStyle}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="no_answer">no_answer</option>
                <option value="spoke">spoke</option>
                <option value="interested">interested</option>
                <option value="not_interested">not_interested</option>
                <option value="callback">callback</option>
              </select>
            </div>
          </div>
          <div>
            <div style={fieldLabelStyle}>Notes</div>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened?"
            />
          </div>
          {error && (
            <div style={{ fontSize: 12, color: '#ff8888' }}>{error}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...solidButtonStyle,
                borderRadius: 999,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Logging...' : 'Log'}
            </button>
          </div>
        </form>
      )}

      {activities.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 0',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
          }}
        >
          No activities logged yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {activities.map((a, idx) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 14,
                padding: '14px 0',
                borderBottom:
                  idx === activities.length - 1
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0, paddingTop: 4 }}>
                <span
                  style={{
                    display: 'block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                    boxShadow: '0 0 0 3px rgba(255,255,255,0.08)',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <Pill>{a.type || '—'}</Pill>
                  {a.outcome && <Pill bg="rgba(255,255,255,0.04)">{a.outcome}</Pill>}
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {formatDateTime(a.created_at)}
                  </span>
                </div>
                {a.notes && (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.5,
                    }}
                  >
                    {a.notes}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NotesCard({ leadId, initialNotes, onSaved }) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setNotes(initialNotes || '')
  }, [initialNotes])

  async function save() {
    if (!db) return
    setSaving(true)
    setError(null)
    try {
      await db.query('UPDATE leads SET notes = $1 WHERE id = $2', [notes, leadId])
      onSaved?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to save notes.')
    } finally {
      setSaving(false)
    }
  }

  const dirty = (notes || '') !== (initialNotes || '')

  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Notes</div>
          <div style={cardSubtitleStyle}>Private working notes for this lead</div>
        </div>
        <button
          type="button"
          style={{
            ...ghostButtonStyle,
            background: dirty ? '#ffffff' : 'transparent',
            color: dirty ? '#000000' : 'rgba(255,255,255,0.5)',
            borderColor: dirty ? '#ffffff' : 'rgba(255,255,255,0.1)',
            opacity: saving ? 0.6 : 1,
            cursor: saving || !dirty ? 'default' : 'pointer',
          }}
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
      <textarea
        rows={6}
        style={{ ...inputStyle, resize: 'vertical' }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write notes, context, next steps..."
      />
      {error && (
        <div style={{ fontSize: 12, color: '#ff8888', marginTop: 8 }}>{error}</div>
      )}
    </div>
  )
}

function QuickActionsPanel({ onCreateDeal, onAddTask, onLogCall }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Quick Actions</div>
          <div style={cardSubtitleStyle}>Jump to common workflows</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={onCreateDeal}
          style={{ ...solidButtonStyle, width: '100%', padding: '10px 16px' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Create Deal
        </button>
        <button
          type="button"
          onClick={onAddTask}
          style={{ ...ghostButtonStyle, width: '100%', justifyContent: 'center', padding: '10px 16px' }}
        >
          <Plus size={14} />
          Add Task
        </button>
        <button
          type="button"
          onClick={onLogCall}
          style={{ ...ghostButtonStyle, width: '100%', justifyContent: 'center', padding: '10px 16px' }}
        >
          <Phone size={14} />
          Log Call
        </button>
      </div>
    </div>
  )
}

function TasksPanel({ leadId, tasks, onChanged, formOpen, onOpenForm, onCloseForm }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('call')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function addTask(e) {
    e.preventDefault()
    if (!db) return
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await db.query(
        `INSERT INTO tasks (lead_id, title, type, due_date, priority, is_complete)
         VALUES ($1, $2, $3, $4, $5, false)`,
        [leadId, title.trim(), type, dueDate || null, priority],
      )
      setTitle('')
      setDueDate('')
      setPriority('medium')
      setType('call')
      onCloseForm?.()
      onChanged?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to add task.')
    } finally {
      setSubmitting(false)
    }
  }

  async function complete(taskId) {
    if (!db) return
    try {
      await db.query('UPDATE tasks SET is_complete = true WHERE id = $1', [taskId])
      onChanged?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Tasks</div>
          <div style={cardSubtitleStyle}>Open follow-ups</div>
        </div>
        <button
          type="button"
          style={ghostButtonStyle}
          onClick={formOpen ? onCloseForm : onOpenForm}
        >
          {formOpen ? <X size={12} /> : <Plus size={12} />}
          {formOpen ? 'Cancel' : 'Add'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={addTask}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            style={inputStyle}
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select style={selectStyle} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="call">call</option>
              <option value="follow_up">follow_up</option>
              <option value="send_info">send_info</option>
              <option value="meeting">meeting</option>
            </select>
            <select
              style={selectStyle}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <input
            type="date"
            style={inputStyle}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {error && <div style={{ fontSize: 12, color: '#ff8888' }}>{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            style={{
              ...solidButtonStyle,
              width: '100%',
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 0',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
          }}
        >
          No open tasks
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tasks.map((t, idx) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 0',
                borderBottom:
                  idx === tasks.length - 1
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <button
                type="button"
                onClick={() => complete(t.id)}
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                aria-label="Mark complete"
              >
                <Check size={11} color="rgba(255,255,255,0.2)" strokeWidth={3} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 500 }}>{t.title}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  {t.priority && <Pill bg="rgba(255,255,255,0.06)">{t.priority}</Pill>}
                  {t.due_date && (
                    <span
                      style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}
                    >
                      {formatDate(t.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestedScriptPanel({ script, onView }) {
  if (!script) {
    return (
      <div style={cardStyle}>
        <div style={cardHeaderRowStyle}>
          <div>
            <div style={cardTitleStyle}>Suggested Script</div>
            <div style={cardSubtitleStyle}>Best match for this lead</div>
          </div>
        </div>
        <div
          style={{
            padding: '1.5rem 0',
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          No matching script yet
        </div>
      </div>
    )
  }

  const preview = (script.opening || '').slice(0, 120)
  const truncated = (script.opening || '').length > 120

  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Suggested Script</div>
          <div style={cardSubtitleStyle}>Best match for this lead</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              minWidth: 0,
            }}
          >
            {script.name}
          </div>
          <Pill>{script.type || '—'}</Pill>
        </div>
        {preview && (
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.5,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {preview}
            {truncated && '...'}
          </div>
        )}
        <button
          type="button"
          onClick={onView}
          style={{ ...ghostButtonStyle, width: '100%', justifyContent: 'center' }}
        >
          View Full Script
        </button>
      </div>
    </div>
  )
}

function formatPriceCompact(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (Number.isNaN(n)) return null
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function RecommendedPackagesPanel({ recommendations, onViewAll }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={cardHeaderRowStyle}>
          <div>
            <div style={cardTitleStyle}>Recommended Packages</div>
            <div style={cardSubtitleStyle}>Best fits for this lead</div>
          </div>
        </div>
        <div
          style={{
            padding: '1.5rem 0',
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          No matching packages yet
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Recommended Packages</div>
          <div style={cardSubtitleStyle}>Best fits for this lead</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {recommendations.map(({ offer, matches }) => {
          const min = formatPriceCompact(offer.price_min)
          const max = formatPriceCompact(offer.price_max)
          const priceLabel =
            min && max && min !== max ? `${min} – ${max}` : min || max || '—'
          return (
            <div
              key={offer.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                    minWidth: 0,
                  }}
                >
                  {offer.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                  {priceLabel}
                </div>
              </div>
              {matches && matches.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.45)',
                  }}
                >
                  Solves: {matches.join(', ')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        style={{ ...ghostButtonStyle, width: '100%', justifyContent: 'center', marginTop: 2 }}
      >
        View Packages
      </button>
    </div>
  )
}

function DealPanel({ deal, onCreate, onView }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderRowStyle}>
        <div>
          <div style={cardTitleStyle}>Deal</div>
          <div style={cardSubtitleStyle}>Active opportunity</div>
        </div>
      </div>
      {deal ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={labelStyle}>Offer</div>
            <div style={valueStyle}>{deal.offer_name || '—'}</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={labelStyle}>Proposed Price</div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#ffffff',
                  marginTop: 4,
                  letterSpacing: '-0.01em',
                }}
              >
                {formatPrice(deal.proposed_price)}
              </div>
            </div>
            <Pill>{deal.stage || '—'}</Pill>
          </div>
          <button
            type="button"
            style={{ ...ghostButtonStyle, width: '100%', justifyContent: 'center' }}
            onClick={onView}
          >
            View Deal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              padding: '1.5rem 0',
              textAlign: 'center',
              fontSize: 13,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            No active deal
          </div>
          <button
            type="button"
            onClick={onCreate}
            style={{ ...solidButtonStyle, width: '100%' }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Create Deal
          </button>
        </div>
      )}
    </div>
  )
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [lead, setLead] = useState(null)
  const [activities, setActivities] = useState([])
  const [tasks, setTasks] = useState([])
  const [deal, setDeal] = useState(null)
  const [scripts, setScripts] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [activityPrefill, setActivityPrefill] = useState(null)
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  const loadAll = useCallback(async () => {
    if (!db) {
      setError('Database not connected. Add VITE_DATABASE_URL to your .env file.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [leadRows, activityRows, taskRows, dealRows, scriptRows, offerRows] =
        await Promise.all([
          db.query('SELECT * FROM leads WHERE id = $1 LIMIT 1', [id]),
          db.query(
            'SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC',
            [id],
          ),
          db.query(
            'SELECT * FROM tasks WHERE lead_id = $1 AND is_complete = false ORDER BY due_date ASC NULLS LAST',
            [id],
          ),
          db.query(
            `SELECT deals.*, offers.name as offer_name
             FROM deals
             LEFT JOIN offers ON deals.offer_id = offers.id
             WHERE deals.lead_id = $1
               AND deals.stage != 'closed_won'
               AND deals.stage != 'closed_lost'
             ORDER BY deals.created_at DESC
             LIMIT 1`,
            [id],
          ),
          db.query(
            `SELECT * FROM scripts WHERE type = 'cold_call' AND is_active = true`,
          ),
          db.query('SELECT * FROM offers WHERE is_active = true'),
        ])
      setLead(leadRows[0] || null)
      setActivities(activityRows || [])
      setTasks(taskRows || [])
      setDeal(dealRows[0] || null)
      setScripts(scriptRows || [])
      setOffers(offerRows || [])
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load lead.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const reloadLead = useCallback(async () => {
    if (!db) return
    try {
      const rows = await db.query('SELECT * FROM leads WHERE id = $1 LIMIT 1', [id])
      setLead(rows[0] || null)
    } catch (err) {
      console.error(err)
    }
  }, [id])

  const reloadActivities = useCallback(async () => {
    if (!db) return
    try {
      const rows = await db.query(
        'SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC',
        [id],
      )
      setActivities(rows || [])
    } catch (err) {
      console.error(err)
    }
  }, [id])

  const reloadTasks = useCallback(async () => {
    if (!db) return
    try {
      const rows = await db.query(
        'SELECT * FROM tasks WHERE lead_id = $1 AND is_complete = false ORDER BY due_date ASC NULLS LAST',
        [id],
      )
      setTasks(rows || [])
    } catch (err) {
      console.error(err)
    }
  }, [id])

  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '6rem 1rem',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <button
          type="button"
          onClick={() => navigate('/leads')}
          style={{ ...ghostButtonStyle, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={12} />
          Leads
        </button>
        <div
          style={{
            textAlign: 'center',
            padding: '6rem 1rem',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
          }}
        >
          {error || 'Lead not found'}
        </div>
      </div>
    )
  }

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/leads')}
            style={ghostButtonStyle}
          >
            <ArrowLeft size={12} />
            Leads
          </button>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            {lead.company_name}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusPill status={lead.status} />
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            style={ghostButtonStyle}
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 65fr) minmax(0, 35fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <CompanyInfoCard lead={lead} onEdit={() => setEditOpen(true)} />
          <FlagsCard lead={lead} />
          <ActivityLogCard
            leadId={lead.id}
            companyName={lead.company_name}
            activities={activities}
            onLogged={reloadActivities}
            onTaskAutoCreated={reloadTasks}
            onToast={(msg) => setToastMessage(msg)}
            prefillType={activityPrefill}
          />
          <NotesCard
            leadId={lead.id}
            initialNotes={lead.notes}
            onSaved={reloadLead}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <QuickActionsPanel
            onCreateDeal={() => setDealModalOpen(true)}
            onAddTask={() => setTaskFormOpen(true)}
            onLogCall={() => setActivityPrefill({ type: 'call', ts: Date.now() })}
          />
          <SuggestedScriptPanel
            script={pickBestScript(scripts, lead, { type: 'cold_call' })}
            onView={() => navigate('/scripts')}
          />
          <RecommendedPackagesPanel
            recommendations={suggestOffer(lead, offers)}
            onViewAll={() => navigate('/offers')}
          />
          <TasksPanel
            leadId={lead.id}
            tasks={tasks}
            onChanged={reloadTasks}
            formOpen={taskFormOpen}
            onOpenForm={() => setTaskFormOpen(true)}
            onCloseForm={() => setTaskFormOpen(false)}
          />
          <DealPanel
            deal={deal}
            onCreate={() => setDealModalOpen(true)}
            onView={() => navigate('/pipeline')}
          />
        </div>
      </div>

      <EditLeadModal
        open={editOpen}
        lead={lead}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false)
          reloadLead()
        }}
      />

      <CreateDealModal
        open={dealModalOpen}
        lead={lead}
        onClose={() => setDealModalOpen(false)}
        onCreated={() => {
          setDealModalOpen(false)
          navigate('/pipeline')
        }}
      />

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </PageShell>
  )
}

function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onDismiss?.(), 3000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, x: 80, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 80 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#1a1a1a',
            color: '#ffffff',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: '0.75rem 1.25rem',
            fontSize: 13,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(99,120,255,0.08)',
            zIndex: 100,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
