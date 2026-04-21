import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Trash2, Check } from 'lucide-react'
import db from '../lib/db'

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

const prefixWrap = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
}

const prefixStyle = {
  position: 'absolute',
  left: 14,
  color: 'rgba(255,255,255,0.45)',
  fontSize: 13,
  pointerEvents: 'none',
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

const INITIAL = {
  name: '',
  description: '',
  price_min: '',
  price_max: '',
  delivery_days: '',
  industries: '',
  problems: '',
  is_active: true,
}

export default function AddOfferModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL)
  const [included, setIncluded] = useState([''])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(INITIAL)
      setIncluded([''])
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

  function updateIncluded(idx, value) {
    setIncluded((prev) => prev.map((v, i) => (i === idx ? value : v)))
  }

  function addIncluded() {
    setIncluded((prev) => [...prev, ''])
  }

  function removeIncluded(idx) {
    setIncluded((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Package name is required.')
      return
    }

    if (!db) {
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }

    const priceMin = form.price_min === '' ? null : Number(form.price_min)
    const priceMax = form.price_max === '' ? null : Number(form.price_max)
    const deliveryDays = form.delivery_days === '' ? null : Number(form.delivery_days)
    const industries = parseList(form.industries)
    const problems = parseList(form.problems)
    const cleanIncluded = included.map((s) => s.trim()).filter(Boolean)

    setSubmitting(true)
    try {
      await db.query(
        `INSERT INTO offers (
          name, description, price_min, price_max,
          target_industries, problems_solved, delivery_days,
          is_active, included
        ) VALUES (
          $1, $2,
          $3, $4,
          $5, $6, $7,
          $8, $9
        )`,
        [
          form.name.trim(),
          form.description.trim() || null,
          priceMin,
          priceMax,
          industries,
          problems,
          deliveryDays,
          form.is_active,
          cleanIncluded,
        ],
      )
      onCreated?.()
      onClose?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to add package.')
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
          <div style={titleStyle}>Add Package</div>
          <div style={subtitleStyle}>Create a new service offering</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Package Name" required>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Starter Website"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="A clean, professional 5-page website..."
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Price Min">
              <div style={prefixWrap}>
                <span style={prefixStyle}>$</span>
                <input
                  type="number"
                  min="0"
                  style={{ ...inputStyle, paddingLeft: 26 }}
                  value={form.price_min}
                  onChange={(e) => update('price_min', e.target.value)}
                  placeholder="500"
                />
              </div>
            </Field>
            <Field label="Price Max">
              <div style={prefixWrap}>
                <span style={prefixStyle}>$</span>
                <input
                  type="number"
                  min="0"
                  style={{ ...inputStyle, paddingLeft: 26 }}
                  value={form.price_max}
                  onChange={(e) => update('price_max', e.target.value)}
                  placeholder="800"
                />
              </div>
            </Field>
            <Field label="Delivery Days">
              <input
                type="number"
                min="0"
                style={inputStyle}
                value={form.delivery_days}
                onChange={(e) => update('delivery_days', e.target.value)}
                placeholder="10"
              />
            </Field>
          </div>

          <Field label="Target Industries (comma separated)">
            <input
              style={inputStyle}
              value={form.industries}
              onChange={(e) => update('industries', e.target.value)}
              placeholder="plumber, electrician, hvac"
            />
          </Field>

          <Field label="Problems Solved (comma separated)">
            <input
              style={inputStyle}
              value={form.problems}
              onChange={(e) => update('problems', e.target.value)}
              placeholder="no_website, no_crm, manual_processes"
            />
          </Field>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <div style={sectionLabelStyle}>What's Included</div>
            <button type="button" style={ghostButtonStyle} onClick={addIncluded}>
              <Plus size={12} />
              Add Item
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {included.map((val, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={val}
                  onChange={(e) => updateIncluded(idx, e.target.value)}
                  placeholder={idx === 0 ? '5 custom pages' : 'Feature / deliverable'}
                />
                <button
                  type="button"
                  onClick={() => removeIncluded(idx)}
                  style={{
                    ...ghostButtonStyle,
                    padding: '8px 10px',
                    color: 'rgba(255,255,255,0.4)',
                    opacity: included.length === 1 ? 0.3 : 1,
                    cursor: included.length === 1 ? 'not-allowed' : 'pointer',
                  }}
                  disabled={included.length === 1}
                  aria-label="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: form.is_active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${form.is_active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: form.is_active ? '#ffffff' : 'rgba(255,255,255,0.6)',
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 5,
                border: `1px solid ${form.is_active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
                background: form.is_active ? '#ffffff' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {form.is_active && <Check size={12} color="#000000" strokeWidth={3} />}
            </span>
            Active (show in pipeline)
          </label>

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
            {submitting ? 'Adding...' : 'Add Package'}
          </button>

          {error && <div style={errorStyle}>{error}</div>}
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
