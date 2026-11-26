// Sales · Outreach: the cold email queue. Claude adds checked companies with a
// drafted email; you open each one in Gmail, send it yourself, and move the card.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { X, Mail, ExternalLink } from 'lucide-react'
import PageShell from '../components/PageShell'
import '../shell/outreach.css'

const SENDER = 'eugene@lithoslabs.agency'
const COLS = [
  ['ready', 'Ready to send'],
  ['sent', 'Sent'],
  ['follow', 'Follow up due'],
  ['replied', 'Replied'],
  ['booked', 'Call booked'],
  ['no', 'Not interested'],
]
const FOLLOW_TEXT = [
  (r) => `Hi${greetName(r)}, just bumping this up in case it got buried. Happy to send a 2 minute video of what I'd change on ${r.company}'s site instead of a call, if that's easier.\n\nEugene`,
  (r) => `Hi${greetName(r)}, last note from me. If a new website or a simpler way to track leads ever makes it onto the list, I'm one reply away. Wishing ${r.company} a strong season.\n\nEugene`,
]
function greetName(r) {
  const m = /^Hi ([^,]+),/.exec(r.body || '')
  return m && !/ team$/i.test(m[1]) ? ` ${m[1]}` : ''
}
const fmt = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '')

async function api(body) {
  const r = await fetch('/api/workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.success === false) throw new Error(j.error || 'Something went wrong')
  return j
}

function gmailUrl(r) {
  const isFollow = r.column_key === 'follow'
  const subject = isFollow ? `Re: ${r.subject}` : r.subject
  const body = isFollow ? (FOLLOW_TEXT[r.followup_count] || FOLLOW_TEXT[1])(r) : r.body
  const q = new URLSearchParams({ authuser: SENDER, view: 'cm', fs: '1', to: r.contact_email, su: subject, body })
  return `https://mail.google.com/mail/?${q.toString()}`
}

export default function Outreach() {
  const navigate = useNavigate()
  const [items, setItems] = useState(null)
  const [err, setErr] = useState('')
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const j = await api({ action: 'outreach_list' })
      setItems(j.items || [])
      setErr('')
    } catch (e) {
      setErr(e.message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const by = useMemo(() => {
    const m = Object.fromEntries(COLS.map(([k]) => [k, []]))
    for (const r of items || []) (m[r.column_key] || m.ready).push(r)
    return m
  }, [items])
  const cur = open && (items || []).find((r) => r.id === open)

  async function move(r, status) {
    setBusy(true)
    try {
      await api({ action: 'outreach_update', id: r.id, status })
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }
  function nextReady() {
    const r = by.follow[0] || by.ready[0]
    if (r) setOpen(r.id)
  }

  return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 className="lx-h1">Outreach</h1>
          <div className="lx-sub">Cold email to US businesses. Claude finds and checks companies and drafts the emails. You send them from {SENDER}.</div>
        </div>
        <button className="lx-btn primary" onClick={nextReady} disabled={!items || (!by.ready.length && !by.follow.length)}><Mail size={14} />Open next email</button>
      </div>

      {err && <div className="lx-panel" style={{ padding: 16, marginTop: 18, color: '#ff9a9a' }}>{err}</div>}

      <div className="ox-stats">
        {[['ready', 'Ready to send'], ['follow', 'Follow ups due'], ['sent', 'Waiting on reply'], ['replied', 'Replied'], ['booked', 'Calls booked']].map(([k, l]) => (
          <div className="ox-stat" key={k}><b>{items ? by[k].length : '·'}</b><span>{l}</span></div>
        ))}
      </div>

      <div className="ox-board">
        {COLS.map(([k, label]) => (
          <div className="ox-col" key={k}>
            <h3><span>{label}</span><span>{by[k]?.length || 0}</span></h3>
            {!items && <div className="ox-empty">Loading…</div>}
            {items && !by[k].length && <div className="ox-empty">Nothing here</div>}
            {(by[k] || []).map((r) => (
              <button className="ox-card" key={r.id} onClick={() => setOpen(r.id)}>
                <b>{r.company}</b>
                <span className="m">{[r.city, r.niche, r.rating && `★ ${r.rating}`].filter(Boolean).join(' · ')}</span>
                {r.issue && <span className="i">{r.issue}</span>}
                {k === 'sent' && r.followup_at && <span className="ox-chip">Follow up {fmt(r.followup_at)}</span>}
                {k === 'follow' && <span className="ox-chip solid">Follow up {r.followup_count + 1} due</span>}
              </button>
            ))}
          </div>
        ))}
      </div>

      {cur && createPortal(
        <>
          <div className="ox-scrim" onClick={() => setOpen(null)} />
          <aside className="ox-drawer" role="dialog" aria-label={cur.company}>
            <button className="ox-x" onClick={() => setOpen(null)} aria-label="Close"><X size={16} /></button>
            <div>
              <span className={`ox-chip ${cur.column_key === 'ready' || cur.column_key === 'follow' ? 'solid' : ''}`}>{COLS.find((c) => c[0] === cur.column_key)?.[1]}</span>
              <h2>{cur.company}</h2>
              <div className="lx-sub">{[cur.city, cur.niche, cur.rating && `★ ${cur.rating} on Google`].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="ox-row">
              {(cur.column_key === 'ready' || cur.column_key === 'follow') && (
                <a className="lx-btn primary" href={gmailUrl(cur)} target="_blank" rel="noreferrer"><ExternalLink size={14} />{cur.column_key === 'follow' ? 'Open follow up in Gmail' : 'Open in Gmail'}</a>
              )}
              {(cur.column_key === 'ready' || cur.column_key === 'follow') && <button className="lx-btn" disabled={busy} onClick={() => move(cur, 'sent')}>Mark sent</button>}
              {cur.column_key !== 'replied' && <button className="lx-btn" disabled={busy} onClick={() => move(cur, 'replied')}>Replied</button>}
              {cur.column_key !== 'booked' && <button className="lx-btn" disabled={busy} onClick={() => move(cur, 'booked')}>Call booked</button>}
              {cur.column_key !== 'no' && <button className="lx-btn" disabled={busy} onClick={() => move(cur, 'no')}>Not interested</button>}
              {cur.lead_id && <button className="lx-btn" onClick={() => navigate(`/leads/${cur.lead_id}`)}>Open lead</button>}
            </div>
            {cur.issue && (
              <div className="ox-box"><h4>What we checked</h4>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.78)' }}>{cur.issue.charAt(0).toUpperCase() + cur.issue.slice(1)}</p>
                {cur.website && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>Site: <a href={/^https?:/.test(cur.website) ? cur.website : `https://${cur.website}`} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{cur.website}</a></p>}
              </div>
            )}
            <div className="ox-box"><h4>{cur.column_key === 'follow' ? `Follow up ${cur.followup_count + 1} · to ${cur.contact_email}` : `Email · to ${cur.contact_email}`}</h4>
              <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{cur.column_key === 'follow' ? `Re: ${cur.subject}` : cur.subject}</p>
              <pre>{cur.column_key === 'follow' ? (FOLLOW_TEXT[cur.followup_count] || FOLLOW_TEXT[1])(cur) : cur.body}</pre>
            </div>
            <div className="ox-box"><h4>Timeline</h4>
              <ul className="ox-tl">{(cur.log || []).slice().reverse().map((l, i) => (
                <li key={i}><span>{new Date(l.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><div>{l.text}</div></li>
              ))}</ul>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>Open in Gmail uses {SENDER}. Make sure that account is signed in, send the email, then tap Mark sent here.</p>
          </aside>
        </>,
        document.body,
      )}
    </PageShell>
  )
}
