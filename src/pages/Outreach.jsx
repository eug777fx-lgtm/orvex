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
// Follow ups ask about operations (missed calls, open quotes, lead response),
// never about the prospect's website. Unverified problems are phrased as
// questions. Every follow up repeats the CAN-SPAM footer from the first email.
const SIGNATURE = 'Eugene Muyden\nFounder, Lithos Labs\nlithoslabs.agency'
const FALLBACK_FOOTER =
  'Lithos Labs is a brand of Avenqor Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, United States.\nNot interested? Just reply "unsubscribe" and we won\'t email you again.'

function footer(r) {
  const m = /Lithos Labs is a brand[\s\S]*$/.exec(r.body || '')
  return m ? m[0].trim() : FALLBACK_FOOTER
}
// Reuse the exact greeting of the first email ("Hi Steadfast team,").
function greeting(r) {
  const m = /^Hi ([^,\n]+),/.exec(r.body || '')
  return m ? m[1].trim() : `${shortName(r)} team`
}
function shortName(r) {
  return String(r.company || '')
    .replace(/,?\s+(LLC|Inc\.?|Co\.?|Corp\.?|Company)$/i, '')
    .replace(/\s+Remodeling & Construction$/i, '')
    .trim()
}
function reviewCount(r) {
  const m = /\((\d[\d,]*)\)/.exec(r.rating || '')
  return m ? Number(m[1].replace(/,/g, '')) : null
}
function nicheKey(r) {
  const n = String(r.niche || '').toLowerCase()
  if (/hvac|roof|heat|air/.test(n)) return 'hvac'
  if (/plumb|drain/.test(n)) return 'plumbing'
  if (/remodel|construct|contract|renovat|repair/.test(n)) return 'remodeling'
  if (/real estate|realty|realtor/.test(n)) return 'realestate'
  return 'general'
}

const FIRST_FOLLOW = {
  hvac: (r, busy) =>
    `A quick follow up, with a different question than my last note. ${busy}I'm curious how your office keeps up with two things most shops tell me are hardest in peak season: calls that come in after hours or while everyone is on a job, and estimates that went out but never got a yes.\n\nIf either one slips through sometimes, I'd be glad to show you how we automate the follow up around the software you already use, whether that's Jobber, Housecall Pro or a spreadsheet. If it's all handled, no worries at all.\n\nWorth 15 minutes next week?`,
  plumbing: (r, busy) =>
    `Following up with a better question than my last email. Plumbing calls tend to be urgent, so the shop that answers first usually gets the job. ${busy}I'm curious what happens to a call that comes in at 9pm, or while your dispatcher is already on the phone.\n\nWe build systems that catch those calls and texts, book the job or alert the on call tech, and follow up on estimates automatically, all connected to the tools you already use. If that's already covered, just tell me and I'll leave you be.\n\nOpen to a 15 minute call next week?`,
  remodeling: () =>
    `A quick follow up with a different question. For remodelers, the jobs are big but the leads are few, so each one matters. When you're on a job site all day, how fast does a new inquiry usually get a reply, and how do you keep track of quotes that are still waiting on the homeowner?\n\nWe help contractors answer new inquiries right away, book site visits, and follow up on open quotes automatically, without changing the software they already use. If you've got that handled, no problem at all.\n\nWould 15 minutes next week be useful?`,
  realestate: () =>
    `A short follow up with a better question than my first email. How quickly does a new online lead usually hear back from your team on evenings and weekends, and what happens to the leads who aren't ready to buy yet?\n\nWe connect lead capture, instant replies and long term follow up to the CRM you already use, so no inquiry sits waiting. If that's already running smoothly, just let me know.\n\nWorth a quick call?`,
  general: () =>
    `A quick follow up with a better question than my first email. Where does your team lose the most time each week: answering calls and messages, chasing quotes, or keeping customers updated?\n\nWe automate that kind of follow up around the software you already use. If it's all handled, no worries at all.\n\nWorth 15 minutes next week?`,
}

const FOLLOW_TEXT = [
  (r) => {
    const n = reviewCount(r)
    const busy = n ? `With ${n} reviews on Google you're clearly busy, so ` : ''
    const text = FIRST_FOLLOW[nicheKey(r)](r, busy)
    return `Hi ${greeting(r)},\n\n${text}\n\n${SIGNATURE}\n\n${footer(r)}`
  },
  (r) =>
    `Hi ${greeting(r)},\n\nI haven't heard back, so I'll assume the timing isn't right and close this out on my side. If missed calls or quote follow ups ever become a headache, my door is open.\n\nAll the best for the season,\nEugene\n\n${footer(r)}`,
]
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
