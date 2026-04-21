import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import db from '../lib/db'

const TYPES = [
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'closing', label: 'Closing' },
  { value: 'objection', label: 'Objection' },
]

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
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
  maxWidth: 640,
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

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
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

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.75)',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
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

const INITIAL = {
  name: '',
  type: 'cold_call',
  industries: '',
  problems: '',
  opening: '',
  problem_hook: '',
  value_prop: '',
  cta: '',
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

function parseList(str) {
  return (str || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export default function AddScriptModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL)
  const [objections, setObjections] = useState([{ trigger: '', response: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(INITIAL)
      setObjections([{ trigger: '', response: '' }])
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateObjection(idx, key, value) {
    setObjections((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [key]: value } : o)),
    )
  }

  function addObjection() {
    setObjections((prev) => [...prev, { trigger: '', response: '' }])
  }

  function removeObjection(idx) {
    setObjections((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Script name is required.')
      return
    }

    if (!db) {
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }

    const industryTags = parseList(form.industries)
    const problemTags = parseList(form.problems)
    const cleanObjections = objections
      .filter((o) => o.trigger.trim() || o.response.trim())
      .map((o) => ({ trigger: o.trigger.trim(), response: o.response.trim() }))

    setSubmitting(true)
    try {
      await db.query(
        `INSERT INTO scripts (
          name, type, industry_tags, problem_tags,
          opening, problem_hook, value_prop, cta,
          objections, is_active
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6,
          $7, $8,
          $9, true
        )`,
        [
          form.name.trim(),
          form.type,
          industryTags,
          problemTags,
          form.opening.trim() || null,
          form.problem_hook.trim() || null,
          form.value_prop.trim() || null,
          form.cta.trim() || null,
          JSON.stringify(cleanObjections),
        ],
      )
      onCreated?.()
      onClose?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to add script.')
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
          <div style={titleStyle}>Add Script</div>
          <div style={subtitleStyle}>Create a reusable sales script</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Script Name" required>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="No Website — Service Business"
              required
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Type">
              <select
                style={selectStyle}
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Industries (comma separated)">
              <input
                style={inputStyle}
                value={form.industries}
                onChange={(e) => update('industries', e.target.value)}
                placeholder="plumber, electrician, hvac"
              />
            </Field>
          </div>

          <Field label="Problems this addresses (comma separated)">
            <input
              style={inputStyle}
              value={form.problems}
              onChange={(e) => update('problems', e.target.value)}
              placeholder="no_website, no_crm, manual_processes"
            />
          </Field>

          <Field label="Opening">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.opening}
              onChange={(e) => update('opening', e.target.value)}
            />
          </Field>

          <Field label="Problem Hook">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.problem_hook}
              onChange={(e) => update('problem_hook', e.target.value)}
            />
          </Field>

          <Field label="Value Prop">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.value_prop}
              onChange={(e) => update('value_prop', e.target.value)}
            />
          </Field>

          <Field label="Call to Action">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.cta}
              onChange={(e) => update('cta', e.target.value)}
            />
          </Field>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
            }}
          >
            <div style={sectionLabelStyle}>Objections</div>
            <button type="button" style={ghostButtonStyle} onClick={addObjection}>
              <Plus size={12} />
              Add Objection
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {objections.map((o, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(120px, 1fr) minmax(0, 2fr) auto',
                  gap: 8,
                  alignItems: 'start',
                }}
              >
                <input
                  style={inputStyle}
                  value={o.trigger}
                  onChange={(e) => updateObjection(idx, 'trigger', e.target.value)}
                  placeholder="not interested"
                />
                <input
                  style={inputStyle}
                  value={o.response}
                  onChange={(e) => updateObjection(idx, 'response', e.target.value)}
                  placeholder="Response..."
                />
                <button
                  type="button"
                  onClick={() => removeObjection(idx)}
                  style={{
                    ...ghostButtonStyle,
                    padding: '8px 10px',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                  aria-label="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...submitButtonStyle,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
              marginTop: 6,
            }}
          >
            {submitting ? 'Adding...' : 'Add Script'}
          </button>

          {error && <div style={errorStyle}>{error}</div>}
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
