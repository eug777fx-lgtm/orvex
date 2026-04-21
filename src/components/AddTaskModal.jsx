import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import db from '../lib/db'
import { todayKey } from '../utils/dates'

const TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'send_info', label: 'Send Info' },
  { value: 'meeting', label: 'Meeting' },
]

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: '1.5rem',
}

const modalStyle = {
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20,
  padding: '2rem',
  width: '100%',
  maxWidth: 520,
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
}

const closeButtonStyle = {
  position: 'absolute',
  top: 16,
  right: 16,
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.5)',
  background: 'transparent',
  border: '1px solid transparent',
}

const titleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const subtitleStyle = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.4)',
  marginTop: 4,
}

const labelStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.55)',
  fontWeight: 500,
  marginBottom: 6,
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

const submitButtonStyle = {
  width: '100%',
  background: '#ffffff',
  color: '#000000',
  borderRadius: 10,
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
}

const errorStyle = {
  marginTop: 12,
  padding: '10px 12px',
  background: 'rgba(255, 80, 80, 0.08)',
  border: '1px solid rgba(255, 80, 80, 0.3)',
  color: '#ff8888',
  borderRadius: 10,
  fontSize: 12,
}

function Field({ label, required, children }) {
  return (
    <div>
      <div style={labelStyle}>
        {label}
        {required && <span style={{ color: 'rgba(255,255,255,0.35)' }}> *</span>}
      </div>
      {children}
    </div>
  )
}

function LeadCombobox({ leads, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!value) {
      setQuery('')
      return
    }
    const match = leads.find((l) => String(l.id) === String(value))
    if (match) setQuery(match.company_name || '')
  }, [value, leads])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = leads || []
    if (!q) return list.slice(0, 20)
    return list
      .filter((l) => (l.company_name || '').toLowerCase().includes(q))
      .slice(0, 20)
  }, [leads, query])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value.trim()) onChange('')
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search a lead (optional)"
      />
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#161616',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: 4,
            zIndex: 60,
            maxHeight: 220,
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          {filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onChange(l.id)
                setQuery(l.company_name || '')
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {l.company_name || '—'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddTaskModal({ open, onClose, onCreated, defaultLeadId = null }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('call')
  const [dueDate, setDueDate] = useState(todayKey())
  const [priority, setPriority] = useState('medium')
  const [leadId, setLeadId] = useState(defaultLeadId || '')
  const [notes, setNotes] = useState('')
  const [leads, setLeads] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setType('call')
    setDueDate(todayKey())
    setPriority('medium')
    setLeadId(defaultLeadId || '')
    setNotes('')
    setError(null)
    setSubmitting(false)

    if (!db) return
    db.query('SELECT id, company_name FROM leads ORDER BY company_name ASC')
      .then((rows) => setLeads(rows || []))
      .catch((err) => console.error('Failed to load leads', err))
  }, [open, defaultLeadId])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Task title is required.')
      return
    }

    if (!db) {
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }

    setSubmitting(true)
    try {
      await db.query(
        `INSERT INTO tasks (
          lead_id, title, type, due_date, priority, is_complete, notes
        ) VALUES (
          $1, $2, $3, $4,
          $5, false, $6
        )`,
        [
          leadId || null,
          title.trim(),
          type,
          dueDate || null,
          priority,
          notes.trim() || null,
        ],
      )
      onCreated?.()
      onClose?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to add task.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            style={modalStyle}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
        <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Close">
          <X size={16} />
        </button>

        <div style={{ marginBottom: 20 }}>
          <div style={titleStyle}>Add Task</div>
          <div style={subtitleStyle}>Create a follow-up, call, or reminder</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title" required>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call John at Acme Plumbing"
              required
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type">
              <select
                style={selectStyle}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                style={selectStyle}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Due Date">
            <input
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>

          <Field label="Link to Lead">
            <LeadCombobox leads={leads} value={leadId} onChange={setLeadId} />
          </Field>

          <Field label="Notes">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, script reference, etc."
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...submitButtonStyle,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {submitting ? 'Adding...' : 'Add Task'}
          </button>

          {error && <div style={errorStyle}>{error}</div>}
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
