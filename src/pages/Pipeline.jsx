import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Check, ArrowUpRight } from 'lucide-react'
import db from '@/lib/db'
import PageShell from '../components/PageShell'

const STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'proposal', label: 'Proposal Sent' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

const STAGE_KEYS = STAGES.map((s) => s.value)
const CLOSED_STAGES = new Set(['closed_won', 'closed_lost'])

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

const statPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 999,
  padding: '8px 16px',
  minWidth: 0,
}

const statLabelStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

const statNumberStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
  whiteSpace: 'nowrap',
}

const columnStyle = {
  width: 280,
  flexShrink: 0,
  background: 'rgba(17,17,20,0.55)',
  border: '0.5px solid rgba(255,255,255,0.06)',
  borderRadius: 14,
  padding: '1rem',
  minHeight: 500,
  display: 'flex',
  flexDirection: 'column',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
}

const columnHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 14,
  padding: '0 2px',
}

const columnTitleStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: '#ffffff',
  letterSpacing: '0.01em',
}

const countBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 22,
  height: 22,
  padding: '0 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 11,
  fontWeight: 600,
}

const cardStyle = {
  background: 'rgba(26,26,30,0.85)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '1rem',
  marginBottom: '0.75rem',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, transform 0.15s ease',
  backdropFilter: 'blur(10px) saturate(160%)',
  WebkitBackdropFilter: 'blur(10px) saturate(160%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const moveButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.6)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.55)',
  fontSize: 11,
  fontWeight: 500,
}

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
  maxWidth: 500,
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
}

const closeBtnStyle = {
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

const labelStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 500,
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

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.8)',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const solidButtonStyle = {
  background: '#ffffff',
  color: '#000000',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

function formatPrice(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function daysSince(value) {
  if (!value) return 0
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 0
  const diff = Date.now() - then
  return Math.max(0, Math.floor(diff / 86400000))
}

function stageLabel(key) {
  return STAGES.find((s) => s.value === key)?.label || key
}

function computeStats(deals) {
  const openDeals = deals.filter((d) => !CLOSED_STAGES.has(d.stage))
  const total = openDeals.length
  const pipelineValue = openDeals.reduce(
    (sum, d) => sum + (Number(d.proposed_price) || 0),
    0,
  )
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const thisMonth = deals.filter((d) => {
    if (!d.created_at) return false
    const t = new Date(d.created_at)
    return t.getMonth() === month && t.getFullYear() === year
  }).length
  const wonCount = deals.filter((d) => d.stage === 'closed_won').length
  const lostCount = deals.filter((d) => d.stage === 'closed_lost').length
  const decided = wonCount + lostCount
  const winRate = decided === 0 ? 0 : Math.round((wonCount / decided) * 100)
  return { total, pipelineValue, thisMonth, winRate }
}

function Pill({ children }) {
  return <span style={pillStyle}>{children}</span>
}

function DealCard({ deal, onOpen, onMove, canMoveLeft, canMoveRight }) {
  const days = daysSince(deal.stage_changed_at || deal.created_at)
  return (
    <div
      style={cardStyle}
      onClick={() => onOpen(deal)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      <div
        style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {deal.company_name || 'Untitled deal'}
      </div>
      {deal.offer_name && (
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {deal.offer_name}
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
        {formatPrice(deal.proposed_price)}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        {days === 1 ? '1 day in stage' : `${days} days in stage`}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 6,
        }}
      >
        <div>{deal.industry ? <Pill>{deal.industry}</Pill> : <span />}</div>
        <div
          style={{ display: 'flex', gap: 6 }}
          onClick={(e) => e.stopPropagation()}
        >
          {canMoveLeft && (
            <button
              type="button"
              style={moveButtonStyle}
              onClick={(e) => {
                e.stopPropagation()
                onMove(deal, -1)
              }}
              aria-label="Move left"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {canMoveRight && (
            <button
              type="button"
              style={moveButtonStyle}
              onClick={(e) => {
                e.stopPropagation()
                onMove(deal, 1)
              }}
              aria-label="Move right"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Column({ stage, deals, onOpen, onMove }) {
  const stageIdx = STAGE_KEYS.indexOf(stage.value)
  const canLeft = stageIdx > 0
  const canRight = !CLOSED_STAGES.has(stage.value) && stageIdx < STAGE_KEYS.length - 1

  return (
    <div style={columnStyle}>
      <div style={columnHeaderStyle}>
        <div style={columnTitleStyle}>{stage.label}</div>
        <div style={countBadgeStyle}>{deals.length}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {deals.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 0',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 12,
            }}
          >
            No deals
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onOpen={onOpen}
              onMove={onMove}
              canMoveLeft={canLeft}
              canMoveRight={canRight}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DealDetailModal({ deal, onClose, onUpdate, onNavigateLead }) {
  const [finalPrice, setFinalPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!deal) return
    setFinalPrice(deal.final_price == null ? '' : String(deal.final_price))
    setNotes(deal.notes || '')
    setError(null)
  }, [deal])

  useEffect(() => {
    if (!deal) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deal, onClose])

  async function savePrice() {
    if (!db) return
    const value = finalPrice === '' ? null : Number(finalPrice)
    if (value === deal.final_price) return
    setSavingPrice(true)
    try {
      await db.query('UPDATE deals SET final_price = $1 WHERE id = $2', [value, deal.id])
      onUpdate?.({ ...deal, final_price: value })
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to save price.')
    } finally {
      setSavingPrice(false)
    }
  }

  async function saveNotes() {
    if (!db) return
    const next = notes.trim() === '' ? null : notes
    if ((next || '') === (deal.notes || '')) return
    setSavingNotes(true)
    try {
      await db.query('UPDATE deals SET notes = $1 WHERE id = $2', [next, deal.id])
      onUpdate?.({ ...deal, notes: next })
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to save notes.')
    } finally {
      setSavingNotes(false)
    }
  }

  async function setStage(newStage) {
    if (!db) return
    try {
      const closedAt = CLOSED_STAGES.has(newStage) ? new Date().toISOString() : null
      await db.query(
        `UPDATE deals
         SET stage = $1,
             stage_changed_at = now(),
             days_in_stage = 0,
             closed_at = $2
         WHERE id = $3`,
        [newStage, closedAt, deal.id],
      )
      onUpdate?.({
        ...deal,
        stage: newStage,
        stage_changed_at: new Date().toISOString(),
        days_in_stage: 0,
        closed_at: closedAt,
      })
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to update stage.')
    }
  }

  return (
    <AnimatePresence>
      {deal && (
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
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Close">
          <X size={16} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              minWidth: 0,
            }}
          >
            {deal.company_name || 'Deal'}
          </div>
          <Pill>{stageLabel(deal.stage)}</Pill>
        </div>
        {deal.offer_name && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
            {deal.offer_name}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Proposed Price</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginTop: 4,
            }}
          >
            {formatPrice(deal.proposed_price)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Final Price</div>
            <input
              type="number"
              min="0"
              style={inputStyle}
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              onBlur={savePrice}
              placeholder="Set when closed"
              disabled={savingPrice}
            />
          </div>

          <div>
            <div style={{ ...labelStyle, marginBottom: 6 }}>Notes</div>
            <textarea
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              placeholder="Working notes..."
              disabled={savingNotes}
            />
          </div>

          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            Created {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : '—'}
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ff8888' }}>{error}</div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              style={ghostButtonStyle}
              onClick={() => onNavigateLead(deal.lead_id)}
              disabled={!deal.lead_id}
            >
              <ArrowUpRight size={12} />
              View Lead
            </button>
            <button
              type="button"
              style={solidButtonStyle}
              onClick={() => setStage('closed_won')}
            >
              <Check size={12} />
              Mark Won
            </button>
            <button
              type="button"
              style={ghostButtonStyle}
              onClick={() => setStage('closed_lost')}
            >
              Mark Lost
            </button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function Pipeline() {
  const navigate = useNavigate()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  async function fetchDeals() {
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
      const rows = await db.query(`
        SELECT
          deals.*,
          leads.company_name,
          leads.industry,
          leads.location,
          offers.name AS offer_name
        FROM deals
        LEFT JOIN leads ON deals.lead_id = leads.id
        LEFT JOIN offers ON deals.offer_id = offers.id
        ORDER BY deals.created_at DESC
      `)
      setDeals(rows || [])
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load pipeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
  }, [])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STAGE_KEYS.map((k) => [k, []]))
    for (const d of deals) {
      const key = STAGE_KEYS.includes(d.stage) ? d.stage : 'lead'
      map[key].push(d)
    }
    return map
  }, [deals])

  const stats = useMemo(() => computeStats(deals), [deals])

  async function moveDeal(deal, direction) {
    const idx = STAGE_KEYS.indexOf(deal.stage)
    const nextIdx = idx + direction
    if (nextIdx < 0 || nextIdx >= STAGE_KEYS.length) return
    const nextStage = STAGE_KEYS[nextIdx]

    const closedAt = CLOSED_STAGES.has(nextStage) ? new Date().toISOString() : null
    const optimistic = {
      ...deal,
      stage: nextStage,
      stage_changed_at: new Date().toISOString(),
      days_in_stage: 0,
      closed_at: closedAt,
    }
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? optimistic : d)))

    if (!db) return
    try {
      await db.query(
        `UPDATE deals
         SET stage = $1,
             stage_changed_at = now(),
             days_in_stage = 0,
             closed_at = $2
         WHERE id = $3`,
        [nextStage, closedAt, deal.id],
      )
    } catch (err) {
      console.error(err)
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? deal : d)))
    }
  }

  function applyDealUpdate(updated) {
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)))
  }

  const selectedDeal = deals.find((d) => d.id === selectedId) || null

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={pageHeadingStyle}>Pipeline</h2>
        <p style={pageSubStyle}>Track every deal from first contact to close</p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Total Deals</span>
          <span style={statNumberStyle}>{stats.total}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Pipeline Value</span>
          <span style={statNumberStyle}>{formatPrice(stats.pipelineValue)}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Closing This Month</span>
          <span style={statNumberStyle}>{stats.thisMonth}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Win Rate</span>
          <span style={statNumberStyle}>{stats.winRate}%</span>
        </div>
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
          Loading pipeline...
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
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {STAGES.map((stage) => (
            <Column
              key={stage.value}
              stage={stage}
              deals={grouped[stage.value] || []}
              onOpen={(d) => setSelectedId(d.id)}
              onMove={moveDeal}
            />
          ))}
        </div>
      )}

      <DealDetailModal
        deal={selectedDeal}
        onClose={() => setSelectedId(null)}
        onUpdate={applyDealUpdate}
        onNavigateLead={(leadId) => {
          if (leadId) navigate(`/leads/${leadId}`)
        }}
      />
    </PageShell>
  )
}
