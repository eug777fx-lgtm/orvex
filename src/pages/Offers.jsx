import { useEffect, useState } from 'react'
import { Plus, Check, Pencil, FileText } from 'lucide-react'
import db from '../lib/db'
import AddOfferModal from '../components/AddOfferModal'
import { seedOffersIfEmpty } from '../utils/seedOffers'
import PageShell from '../components/PageShell'

const pageHeadingStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const pageSubStyle = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.45)',
  marginTop: 6,
}

const cardStyle = {
  background: 'rgba(17,17,20,0.7)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  position: 'relative',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  marginBottom: 8,
}

const addButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  cursor: 'pointer',
}

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.75)',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const solidSmallButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 999,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  cursor: 'pointer',
}

function formatPrice(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatPriceRange(min, max) {
  if (min && max && min !== max) return `${formatPrice(min)} – ${formatPrice(max)}`
  if (min) return `${formatPrice(min)}+`
  if (max) return `Up to ${formatPrice(max)}`
  return '—'
}

function pillStyle({ active = true } = {}) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
    color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.02em',
  }
}

function tinyPillStyle() {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: 500,
  }
}

function TogglePill({ active, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        ...pillStyle({ active }),
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.06)',
        background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: active ? '#ffffff' : 'rgba(255,255,255,0.3)',
          marginRight: 6,
        }}
      />
      {active ? 'Active' : 'Inactive'}
    </button>
  )
}

function IncludedItem({ text }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '6px 0',
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Check size={10} strokeWidth={3} color="rgba(255,255,255,0.85)" />
      </span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        {text}
      </span>
    </div>
  )
}

function OfferCard({ offer, onToggleActive, onEdit }) {
  const included = Array.isArray(offer.included) ? offer.included : []
  const problems = Array.isArray(offer.problems_solved) ? offer.problems_solved : []
  const industries = Array.isArray(offer.target_industries) ? offer.target_industries : []

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            {offer.name}
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginTop: 8,
              lineHeight: 1.1,
            }}
          >
            {formatPriceRange(offer.price_min, offer.price_max)}
          </div>
          {offer.delivery_days != null && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
              Delivered in {offer.delivery_days} {offer.delivery_days === 1 ? 'day' : 'days'}
            </div>
          )}
        </div>
        <TogglePill
          active={offer.is_active !== false}
          onToggle={() => onToggleActive(offer)}
        />
      </div>

      {offer.description && (
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.55,
          }}
        >
          {offer.description}
        </div>
      )}

      {included.length > 0 && (
        <div>
          <div style={sectionLabelStyle}>What's Included</div>
          <div>
            {included.map((item, idx) => (
              <IncludedItem key={idx} text={item} />
            ))}
          </div>
        </div>
      )}

      {problems.length > 0 && (
        <div>
          <div style={sectionLabelStyle}>Solves</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {problems.map((p) => (
              <span key={p} style={pillStyle()}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {industries.length > 0 && (
        <div>
          <div style={sectionLabelStyle}>Industries</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {industries.map((i) => (
              <span key={i} style={tinyPillStyle()}>
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 14,
          marginTop: 'auto',
        }}
      >
        <button type="button" style={ghostButtonStyle} onClick={() => onEdit(offer)}>
          <Pencil size={11} />
          Edit
        </button>
        <button
          type="button"
          style={{ ...solidSmallButtonStyle, opacity: 0.85 }}
          title="Coming in Phase 9"
        >
          <FileText size={11} />
          Generate Proposal
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div
      style={{
        ...cardStyle,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
        textAlign: 'center',
        gridColumn: '1 / -1',
      }}
    >
      <div style={{ fontSize: 16, color: '#ffffff', fontWeight: 500 }}>No packages yet</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
        Add your first package to start selling
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{ ...addButtonStyle, marginTop: 10 }}
      >
        <Plus size={14} strokeWidth={2.5} />
        Add Package
      </button>
    </div>
  )
}

export default function Offers() {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchOffers() {
    if (!db) {
      setLoading(false)
      setError(
        'Database not connected. Please add VITE_DATABASE_URL to your .env file and restart the dev server.',
      )
      return
    }
    setLoading(true)
    setError(null)
    try {
      await seedOffersIfEmpty()
      const rows = await db.query(
        'SELECT * FROM offers ORDER BY price_min ASC NULLS LAST, created_at ASC',
      )
      setOffers(rows || [])
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load offers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [])

  async function toggleActive(offer) {
    if (!db) return
    const next = !(offer.is_active !== false)
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, is_active: next } : o)),
    )
    try {
      await db.query('UPDATE offers SET is_active = $1 WHERE id = $2', [next, offer.id])
    } catch (err) {
      console.error(err)
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, is_active: !next } : o)),
      )
    }
  }

  function handleEdit() {
    // Edit modal coming later
  }

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={pageHeadingStyle}>Offers</h2>
          <p style={pageSubStyle}>Your service packages and pricing</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} style={addButtonStyle}>
          <Plus size={14} strokeWidth={2.5} />
          Add Package
        </button>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
          }}
        >
          Loading packages...
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : offers.length === 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          <EmptyState onAdd={() => setModalOpen(true)} />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
        >
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onToggleActive={toggleActive}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <AddOfferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchOffers}
      />
    </PageShell>
  )
}
