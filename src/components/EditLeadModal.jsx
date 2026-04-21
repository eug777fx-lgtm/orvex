import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import sql from '../lib/db'
import { calculateScore } from '../utils/scoring'

const INDUSTRIES = [
  'Plumber',
  'Electrician',
  'HVAC',
  'Pest Control',
  'Landscaping',
  'Cleaning',
  'Clothing Store',
  'Coffee Shop',
  'Smoothie Bar',
  'Food Truck',
  'Restaurant',
  'Bakery',
  'Salon',
  'Barbershop',
  'Gym',
]

const SOURCES = ['manual', 'scrape', 'referral']

const STATUSES = ['new', 'contacted', 'follow_up', 'interested', 'closed', 'lost']

const FLAG_OPTIONS = [
  { key: 'no_website', label: 'No website' },
  { key: 'poor_website', label: 'Poor website' },
  { key: 'no_crm', label: 'No CRM / no system' },
  { key: 'manual_processes', label: 'Manual processes (spreadsheets, paper, etc.)' },
  { key: 'low_reviews', label: 'Low reviews' },
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
  maxWidth: 560,
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

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
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

function CheckboxRow({ checked, label, onToggle }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: checked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${checked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 13,
        color: checked ? '#ffffff' : 'rgba(255,255,255,0.7)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 5,
          border: `1px solid ${checked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)'}`,
          background: checked ? '#ffffff' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && <Check size={12} color="#000000" strokeWidth={3} />}
      </span>
      {label}
    </label>
  )
}

function flagsFromLead(lead) {
  if (!lead) {
    return {
      no_website: false,
      poor_website: false,
      no_crm: false,
      manual_processes: false,
      low_reviews: false,
    }
  }
  return {
    no_website: !lead.has_website,
    poor_website: lead.website_quality === 'poor',
    no_crm: !lead.has_crm,
    manual_processes: !!lead.manual_processes,
    low_reviews:
      (lead.review_count ?? 0) < 10 || (Number(lead.avg_rating) || 0) < 3.5,
  }
}

function formFromLead(lead) {
  if (!lead) {
    return {
      company_name: '',
      owner_name: '',
      phone: '',
      email: '',
      location: '',
      industry: '',
      website_url: '',
      source: 'manual',
      status: 'new',
      notes: '',
    }
  }
  return {
    company_name: lead.company_name || '',
    owner_name: lead.owner_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    location: lead.location || '',
    industry: lead.industry || '',
    website_url: lead.website_url || '',
    source: lead.source || 'manual',
    status: lead.status || 'new',
    notes: lead.notes || '',
  }
}

export default function EditLeadModal({ open, lead, onClose, onSaved }) {
  const [form, setForm] = useState(() => formFromLead(lead))
  const [flags, setFlags] = useState(() => flagsFromLead(lead))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(formFromLead(lead))
      setFlags(flagsFromLead(lead))
      setError(null)
      setSubmitting(false)
    }
  }, [open, lead])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const score = calculateScore(flags)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleFlag(key) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.company_name.trim()) {
      setError('Company name is required.')
      return
    }

    if (!sql) {
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }

    setSubmitting(true)
    try {
      await sql`
        UPDATE leads SET
          company_name = ${form.company_name.trim()},
          owner_name = ${form.owner_name.trim() || null},
          phone = ${form.phone.trim() || null},
          email = ${form.email.trim() || null},
          location = ${form.location.trim() || null},
          industry = ${form.industry || null},
          website_url = ${form.website_url.trim() || null},
          source = ${form.source || 'manual'},
          status = ${form.status || 'new'},
          notes = ${form.notes.trim() || null},
          has_website = ${!flags.no_website},
          website_quality = ${flags.poor_website ? 'poor' : null},
          has_crm = ${!flags.no_crm},
          manual_processes = ${!!flags.manual_processes},
          opportunity_score = ${score}
        WHERE id = ${lead.id}
      `

      onSaved?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to update lead.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && lead && (
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
          <div style={titleStyle}>Edit Lead</div>
          <div style={subtitleStyle}>Update prospect details</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Company Name" required>
              <input
                style={inputStyle}
                value={form.company_name}
                onChange={(e) => update('company_name', e.target.value)}
                required
              />
            </Field>
            <Field label="Owner Name">
              <input
                style={inputStyle}
                value={form.owner_name}
                onChange={(e) => update('owner_name', e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Phone">
              <input
                style={inputStyle}
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                style={inputStyle}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Location">
              <input
                style={inputStyle}
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
              />
            </Field>
            <Field label="Industry">
              <select
                style={selectStyle}
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Website URL">
              <input
                style={inputStyle}
                value={form.website_url}
                onChange={(e) => update('website_url', e.target.value)}
              />
            </Field>
            <Field label="Source">
              <select
                style={selectStyle}
                value={form.source}
                onChange={(e) => update('source', e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Status">
            <select
              style={selectStyle}
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <div style={{ marginTop: 6 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={sectionLabelStyle}>Opportunity Flags</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                Score: {score}/10
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FLAG_OPTIONS.map((opt) => (
                <CheckboxRow
                  key={opt.key}
                  checked={flags[opt.key]}
                  label={opt.label}
                  onToggle={() => toggleFlag(opt.key)}
                />
              ))}
            </div>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...submitButtonStyle,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>

          {error && <div style={errorStyle}>{error}</div>}
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
