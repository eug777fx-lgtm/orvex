import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'
import db from '@/lib/db'

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
  maxWidth: 600,
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

const titleStyle = { fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }
const subtitleStyle = { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }
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

function slugify(name) {
  const base = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return base ? `${base}-${suffix}` : `demo-${suffix}`
}

export const TEMPLATE_OPTIONS = [
  { key: 'gym', label: 'Gym / Fitness', tagline: 'Train hard. Look great. Feel unstoppable.' },
  { key: 'plumber', label: 'Plumber', tagline: 'Fast. Reliable. Done Right.' },
  { key: 'realestate', label: 'Real Estate Brokerage', tagline: 'Find Your Dream Property.' },
  { key: 'medspa', label: 'Med Spa', tagline: 'Reveal Your Best Self.' },
  { key: 'hvac', label: 'HVAC', tagline: 'Keep Your Home Comfortable Year-Round.' },
  { key: 'roofing', label: 'Roofing', tagline: 'Protect Your Home From the Top Down.' },
]

export const TEMPLATE_SERVICES = {
  gym: [
    { name: 'Personal Training', price: '$75/session' },
    { name: 'Group Classes', price: '$35/class' },
    { name: 'Nutrition Coaching', price: '$200/month' },
  ],
  plumber: [
    { name: 'Emergency Repairs', price: 'From $150' },
    { name: 'Pipe Installation', price: 'From $200' },
    { name: 'Drain Cleaning', price: 'From $100' },
    { name: 'Water Heater Service', price: 'From $175' },
  ],
  realestate: [
    { name: 'Property Listings', price: 'Free' },
    { name: 'Buyer Representation', price: 'No upfront cost' },
    { name: 'Property Valuation', price: 'Free consultation' },
    { name: 'Investment Consulting', price: 'Custom pricing' },
  ],
  medspa: [
    { name: 'Botox & Fillers', price: 'From $299' },
    { name: 'Laser Skin Treatments', price: 'From $199' },
    { name: 'Body Contouring', price: 'From $399' },
    { name: 'Facials & Peels', price: 'From $129' },
  ],
  hvac: [
    { name: 'AC Installation', price: 'From $1,200' },
    { name: 'AC Repair', price: 'From $150' },
    { name: 'Maintenance Service', price: 'From $99' },
    { name: 'Emergency Service', price: 'From $200' },
  ],
  roofing: [
    { name: 'Roof Installation', price: 'Free estimate' },
    { name: 'Roof Repair', price: 'From $300' },
    { name: 'Roof Inspection', price: 'From $150' },
    { name: 'Gutter Installation', price: 'From $400' },
  ],
}

function defaultsForTemplate(key) {
  const tpl = TEMPLATE_OPTIONS.find((t) => t.key === key) || TEMPLATE_OPTIONS[0]
  return {
    template: tpl.key,
    tagline: tpl.tagline,
    services: TEMPLATE_SERVICES[tpl.key] || [],
  }
}

const INITIAL = {
  template: 'gym',
  style: 'classic',
  business_name: '',
  client_name: '',
  primary_color: '#6378ff',
  tagline: 'Train hard. Look great. Feel unstoppable.',
  phone: '',
  email: '',
  location: '',
}

export default function CreateDemoModal({ open, onClose, onCreated, defaultTemplate = 'gym' }) {
  const [form, setForm] = useState({ ...INITIAL, template: defaultTemplate, tagline: defaultsForTemplate(defaultTemplate).tagline })
  const [services, setServices] = useState(
    defaultsForTemplate(defaultTemplate).services.map((s) => ({ ...s })),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      const def = defaultsForTemplate(defaultTemplate)
      setForm({ ...INITIAL, template: def.template, tagline: def.tagline })
      setServices(def.services.map((s) => ({ ...s })))
      setError(null)
      setSubmitting(false)
    }
  }, [open, defaultTemplate])

  function changeTemplate(key) {
    const def = defaultsForTemplate(key)
    setForm((prev) => ({ ...prev, template: def.template, tagline: def.tagline }))
    setServices(def.services.map((s) => ({ ...s })))
  }

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
  function updateService(idx, key, value) {
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)))
  }
  function addService() {
    setServices((prev) => [...prev, { name: '', price: '' }])
  }
  function removeService(idx) {
    setServices((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.business_name.trim()) {
      setError('Business name is required.')
      return
    }
    if (!db) {
      setError('Database not connected.')
      return
    }
    const cleanServices = services
      .map((s) => ({ name: s.name.trim(), price: s.price.trim() }))
      .filter((s) => s.name)
    const slug = slugify(form.business_name)
    const config = {
      business_name: form.business_name.trim(),
      tagline: form.tagline.trim() || 'Train hard. Look great. Feel unstoppable.',
      primary_color: form.primary_color || '#6378ff',
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      location: form.location.trim() || null,
      services: cleanServices,
      style: form.style === 'premium' ? 'premium' : 'classic',
    }
    setSubmitting(true)
    try {
      const rows = await db.query(
        `INSERT INTO demos (business_name, client_name, template, slug, config, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')
         RETURNING *`,
        [
          form.business_name.trim(),
          form.client_name.trim() || null,
          form.template || 'gym',
          slug,
          JSON.stringify(config),
        ],
      )
      onCreated?.(rows?.[0] || null)
      onClose?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to create demo.')
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
              <div style={titleStyle}>Create Demo</div>
              <div style={subtitleStyle}>Personalized website + dashboard preview</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Template" required>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TEMPLATE_OPTIONS.map((t) => {
                    const active = form.template === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => changeTemplate(t.key)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 500,
                          background: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          color: active ? '#000' : '#fff',
                          border: active
                            ? '1px solid #ffffff'
                            : '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Visual Style" required>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    {
                      key: 'classic',
                      label: 'Classic Dark',
                      desc: 'Monochrome glass aesthetic',
                      preview: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
                      accent: 'rgba(255,255,255,0.85)',
                    },
                    {
                      key: 'premium',
                      label: 'Warm Premium',
                      desc: 'Amber glow, floating widgets',
                      preview: 'linear-gradient(135deg, #0d0a08 0%, #1f1810 100%)',
                      accent: 'rgba(255,160,60,0.9)',
                    },
                  ].map((opt) => {
                    const active = (form.style || 'classic') === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => update('style', opt.key)}
                        style={{
                          textAlign: 'left',
                          padding: 12,
                          borderRadius: 12,
                          background: active ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                          border: active
                            ? `1px solid ${opt.accent}`
                            : '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                      >
                        <div
                          style={{
                            height: 44,
                            borderRadius: 8,
                            background: opt.preview,
                            border: '1px solid rgba(255,255,255,0.06)',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 6,
                              left: 8,
                              width: 24,
                              height: 4,
                              borderRadius: 2,
                              background: opt.accent,
                              opacity: 0.8,
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 14,
                              left: 8,
                              width: 40,
                              height: 3,
                              borderRadius: 2,
                              background: 'rgba(255,255,255,0.2)',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: opt.accent,
                              opacity: 0.25,
                              filter: 'blur(6px)',
                            }}
                          />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: active ? '#fff' : 'rgba(255,255,255,0.85)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {opt.label}
                            {active && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: opt.accent,
                                  display: 'inline-block',
                                }}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                            {opt.desc}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Business Name" required>
                  <input
                    style={inputStyle}
                    value={form.business_name}
                    onChange={(e) => update('business_name', e.target.value)}
                    placeholder="Iron Beach Gym"
                    required
                  />
                </Field>
                <Field label="Client Name">
                  <input
                    style={inputStyle}
                    value={form.client_name}
                    onChange={(e) => update('client_name', e.target.value)}
                    placeholder="Marco"
                  />
                </Field>
              </div>

              <Field label="Tagline">
                <input
                  style={inputStyle}
                  value={form.tagline}
                  onChange={(e) => update('tagline', e.target.value)}
                  placeholder="Train hard. Look great. Feel unstoppable."
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Primary Color">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => update('primary_color', e.target.value)}
                      style={{
                        width: 44,
                        height: 38,
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        padding: 2,
                        background: 'rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    />
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={form.primary_color}
                      onChange={(e) => update('primary_color', e.target.value)}
                      placeholder="#6378ff"
                    />
                  </div>
                </Field>
                <Field label="Location">
                  <input
                    style={inputStyle}
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="Oranjestad, Aruba"
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Phone">
                  <input
                    style={inputStyle}
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    placeholder="+297 555 0100"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    style={inputStyle}
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="hello@gym.com"
                  />
                </Field>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                <div style={{ ...labelStyle, marginBottom: 0 }}>Services</div>
                <button type="button" style={ghostButtonStyle} onClick={addService}>
                  <Plus size={12} />
                  Add Service
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {services.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr auto',
                      gap: 8,
                    }}
                  >
                    <input
                      style={inputStyle}
                      value={s.name}
                      onChange={(e) => updateService(idx, 'name', e.target.value)}
                      placeholder="Service name"
                    />
                    <input
                      style={inputStyle}
                      value={s.price}
                      onChange={(e) => updateService(idx, 'price', e.target.value)}
                      placeholder="$ / unit"
                    />
                    <button
                      type="button"
                      onClick={() => removeService(idx)}
                      style={{ ...ghostButtonStyle, padding: '8px 10px', color: 'rgba(255,255,255,0.4)' }}
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
                {submitting ? 'Creating...' : 'Create Demo'}
              </button>

              {error && <div style={errorStyle}>{error}</div>}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
