// Lead pipeline statuses (stored in leads.status).
// Extends the original vocabulary (new, contacted, follow_up, interested,
// closed, lost) instead of creating a second pipeline. "closed" = Won.

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'discovered', label: 'Discovered' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'interested', label: 'Interested' },
  { value: 'demo_sent', label: 'Demo Sent' },
  { value: 'call_scheduled', label: 'Call Scheduled' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'do_not_contact', label: 'Do Not Contact' },
]

export const LEAD_STATUS_KEYS = LEAD_STATUSES.map((s) => s.value)

export function statusLabel(value) {
  if (value === 'closed_won') return 'Won'
  return LEAD_STATUSES.find((s) => s.value === value)?.label || value || 'New'
}

// Monochrome emphasis ramp: later stages read brighter.
export const STATUS_STYLES = {
  new: { bg: 'rgba(255,255,255,0.08)' },
  discovered: { bg: 'rgba(255,255,255,0.06)' },
  qualified: { bg: 'rgba(255,255,255,0.1)' },
  contacted: { bg: 'rgba(255,255,255,0.12)' },
  follow_up: { bg: 'rgba(255,255,255,0.15)' },
  interested: { bg: 'rgba(255,255,255,0.2)' },
  demo_sent: { bg: 'rgba(255,255,255,0.22)' },
  call_scheduled: { bg: 'rgba(255,255,255,0.22)' },
  proposal_sent: { bg: 'rgba(255,255,255,0.24)' },
  negotiation: { bg: 'rgba(255,255,255,0.24)' },
  closed: { bg: 'rgba(255,255,255,0.25)' },
  lost: { bg: 'rgba(255,255,255,0.05)', strike: true },
  do_not_contact: { bg: 'rgba(255,68,68,0.12)', strike: true },
}

export const CALL_OUTCOMES = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'call_back', label: 'Call back' },
  { value: 'demo_requested', label: 'Demo requested' },
  { value: 'proposal_requested', label: 'Proposal requested' },
  { value: 'wrong_number', label: 'Wrong number' },
  { value: 'do_not_contact', label: 'Do not contact' },
]
