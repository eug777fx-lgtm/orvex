import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import sql from '../lib/db'

const STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'proposal', label: 'Proposal Sent' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
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

const lockedFieldStyle = {
  ...inputStyle,
  color: 'rgba(255,255,255,0.7)',
  cursor: 'not-allowed',
  background: 'rgba(255,255,255,0.02)',
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

function Field({ label, children }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

function formatPrice(n) {
  if (n === null || n === undefined || n === '') return ''
  const v = Number(n)
  if (Number.isNaN(v)) return ''
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function offerLabel(offer) {
  const min = formatPrice(offer.price_min)
  const max = formatPrice(offer.price_max)
  const range = min && max && min !== max ? `${min} – ${max}` : min || max || ''
  return range ? `${offer.name} · ${range}` : offer.name
}

export default function CreateDealModal({ open, lead, onClose, onCreated }) {
  const [offers, setOffers] = useState([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [offerId, setOfferId] = useState('')
  const [price, setPrice] = useState('')
  const [stage, setStage] = useState('lead')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setOfferId('')
    setPrice('')
    setStage('lead')
    setNotes('')
    setError(null)
    setSubmitting(false)

    if (!sql) return
    setLoadingOffers(true)
    sql`SELECT id, name, price_min, price_max FROM offers WHERE is_active = true ORDER BY price_min ASC NULLS LAST`
      .then((rows) => setOffers(rows || []))
      .catch((err) => {
        console.error(err)
        setError(err?.message || 'Failed to load packages.')
      })
      .finally(() => setLoadingOffers(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function onSelectOffer(e) {
    const value = e.target.value
    setOfferId(value)
    const selected = offers.find((o) => String(o.id) === String(value))
    if (selected && selected.price_min != null && price === '') {
      setPrice(String(selected.price_min))
    } else if (selected && selected.price_min != null) {
      setPrice(String(selected.price_min))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!lead?.id) {
      setError('Missing lead context.')
      return
    }

    if (!sql) {
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }

    const proposedPrice = price === '' ? null : Number(price)
    const offerValue = offerId === '' ? null : offerId

    setSubmitting(true)
    try {
      const rows = await sql`
        INSERT INTO deals (lead_id, offer_id, proposed_price, stage, notes)
        VALUES (${lead.id}, ${offerValue}, ${proposedPrice}, ${stage}, ${notes.trim() || null})
        RETURNING id
      `
      const dealId = rows?.[0]?.id ?? null
      onCreated?.({ id: dealId })
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to create deal.')
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
          <div style={titleStyle}>Create Deal</div>
          <div style={subtitleStyle}>Start a new deal for this lead</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Lead">
            <input
              style={lockedFieldStyle}
              value={lead?.company_name || ''}
              readOnly
              disabled
            />
          </Field>

          <Field label="Package">
            <select style={selectStyle} value={offerId} onChange={onSelectOffer}>
              <option value="">{loadingOffers ? 'Loading packages...' : 'Select a package'}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {offerLabel(o)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Proposed Price">
            <div style={prefixWrap}>
              <span style={prefixStyle}>$</span>
              <input
                type="number"
                min="0"
                style={{ ...inputStyle, paddingLeft: 26 }}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </Field>

          <Field label="Stage">
            <select
              style={selectStyle}
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes">
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, next steps, expected close..."
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
            {submitting ? 'Creating...' : 'Create Deal'}
          </button>

          {error && <div style={errorStyle}>{error}</div>}
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
