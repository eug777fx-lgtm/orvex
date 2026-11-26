// "New from a call": save a lead, log the call and add the next step in one go.
// Opened from the + New button in the top bar (or the + in the phone bar).
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import '../shell/outreach.css'

const NEEDS = ['Website', 'CRM', 'Automation', 'Marketing']
const HEAT = ['Just looking', 'Interested', 'Ready to buy']
const STEPS = ['Call back', 'Send proposal', 'Book demo', 'Nothing yet']

function tomorrow() {
  const d = new Date(Date.now() + 86400000)
  return d.toISOString().slice(0, 10)
}

export default function QuickAdd({ onClose, onSaved }) {
  const [f, setF] = useState({ company: '', contact: '', phone: '', email: '', website: '', notes: '', next_step: 'Call back', when: tomorrow() })
  const [needs, setNeeds] = useState(['Website'])
  const [heat, setHeat] = useState('Interested')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const first = useRef(null)
  useEffect(() => {
    first.current?.focus()
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'quick_add', ...f, needs, heat }),
      }).then((x) => x.json())
      if (!r.success) throw new Error(r.error || 'Could not save')
      onSaved?.(r.lead_id)
      onClose()
    } catch (x) {
      setErr(x.message)
      setBusy(false)
    }
  }

  return (
    <>
      <div className="ox-scrim" onClick={onClose} />
      <form className="ox-modal" role="dialog" aria-label="New lead from a call" onSubmit={save}>
        <div className="ox-row" style={{ justifyContent: 'space-between' }}>
          <b style={{ font: "600 20px 'Inter Tight', Inter, sans-serif" }}>New from a call</b>
          <button type="button" className="ox-x" style={{ position: 'static' }} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="ox-grid2">
          <div className="ox-f"><label htmlFor="qa-co">Company</label><input id="qa-co" ref={first} value={f.company} onChange={set('company')} placeholder="Business name" /></div>
          <div className="ox-f"><label htmlFor="qa-ct">Contact name</label><input id="qa-ct" value={f.contact} onChange={set('contact')} placeholder="Who you spoke to" /></div>
        </div>
        <div className="ox-grid2">
          <div className="ox-f"><label htmlFor="qa-ph">Phone</label><input id="qa-ph" type="tel" value={f.phone} onChange={set('phone')} placeholder="(555) 555 0100" /></div>
          <div className="ox-f"><label htmlFor="qa-em">Email</label><input id="qa-em" type="email" value={f.email} onChange={set('email')} placeholder="optional" /></div>
        </div>
        <div className="ox-f"><label htmlFor="qa-ws">Website</label><input id="qa-ws" value={f.website} onChange={set('website')} placeholder="optional" /></div>
        <div className="ox-f"><label>They need</label>
          <div className="ox-toggle">{NEEDS.map((n) => (
            <button type="button" key={n} className={needs.includes(n) ? 'on' : ''} onClick={() => setNeeds((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]))}>{n}</button>
          ))}</div>
        </div>
        <div className="ox-f"><label>How hot</label>
          <div className="ox-toggle">{HEAT.map((h) => <button type="button" key={h} className={heat === h ? 'on' : ''} onClick={() => setHeat(h)}>{h}</button>)}</div>
        </div>
        <div className="ox-grid2">
          <div className="ox-f"><label htmlFor="qa-ns">Next step</label><select id="qa-ns" value={f.next_step} onChange={set('next_step')}>{STEPS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="ox-f"><label htmlFor="qa-wh">When</label><input id="qa-wh" type="date" value={f.when} onChange={set('when')} disabled={f.next_step === 'Nothing yet'} /></div>
        </div>
        <div className="ox-f"><label htmlFor="qa-nt">Notes from the call</label><textarea id="qa-nt" rows={3} value={f.notes} onChange={set('notes')} placeholder="What they said, budget, timing" /></div>
        {err && <div className="ox-err">{err}</div>}
        <button className="lx-btn primary" type="submit" disabled={busy} style={{ height: 42, justifyContent: 'center' }}>{busy ? 'Saving…' : 'Save lead, log the call and add the task'}</button>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>Creates the lead in Leads, logs the call on its timeline, and puts the next step in Tasks and on Today.</p>
      </form>
    </>
  )
}
