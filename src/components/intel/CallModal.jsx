import { useState } from 'react'
import { Phone } from 'lucide-react'
import { Modal, Button, Field, Spinner } from './ui'
import { S } from './shared'
import { CALL_OUTCOMES } from '../../lib/leadStatuses'

function plusDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const SUGGESTED_FOLLOWUP = {
  no_answer: 1,
  voicemail: 2,
  call_back: 1,
  interested: 2,
  demo_requested: 1,
  proposal_requested: 2,
}

export default function CallModal({ open, onClose, business, onSubmit }) {
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [busy, setBusy] = useState(false)

  if (!business) return null
  const phone = business.phone || business.phone_intl
  const tel = (business.phone_intl || business.phone || '').replace(/[^\d+]/g, '')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Call ${business.business_name}`}
      width={480}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="solid"
            disabled={!outcome || busy}
            onClick={async () => {
              setBusy(true)
              const ok = await onSubmit({ outcome, notes, next_follow_up: followUp || null })
              setBusy(false)
              if (ok) onClose()
            }}
          >
            {busy ? <Spinner /> : null} Save call
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, ...S.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</div>
          <div style={{ fontSize: 17, fontWeight: 650, color: '#fff', marginTop: 2 }}>{phone || 'Not available'}</div>
        </div>
        {tel && (
          <Button variant="solid" onClick={() => { window.location.href = `tel:${tel}` }}>
            <Phone size={14} /> Call
          </Button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Outcome">
          <select
            style={S.select}
            value={outcome}
            onChange={(e) => {
              const v = e.target.value
              setOutcome(v)
              if (!followUp && SUGGESTED_FOLLOWUP[v]) setFollowUp(plusDays(SUGGESTED_FOLLOWUP[v]))
            }}
          >
            <option value="">Choose outcome</option>
            {CALL_OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Call notes">
          <textarea rows={4} style={{ ...S.input, resize: 'vertical' }} value={notes} maxLength={4000} onChange={(e) => setNotes(e.target.value)} placeholder="Who you spoke with, what they said, next step" />
        </Field>
        <Field label="Next follow-up" hint="Creates a follow-up task (reminder) on the lead.">
          <input type="date" style={{ ...S.input, colorScheme: 'dark' }} value={followUp} min={plusDays(0)} onChange={(e) => setFollowUp(e.target.value)} />
        </Field>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 12, lineHeight: 1.5 }}>
        {business.lead ? 'Saved to the lead’s activity timeline.' : 'This business will be added to your Leads so the call is tracked.'} Outcomes move the pipeline forward
        automatically (never backwards); “Do not contact” is always respected.
      </div>
    </Modal>
  )
}
