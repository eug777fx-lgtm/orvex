// Home · Today: the few things that matter when you open the CRM.
// Everything else (charts, breakdowns) lives in Home · Reports.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Radar, Check, ArrowUpRight } from 'lucide-react'
import db from '@/lib/db'
import { useAuth } from '../lib/auth'
import PageShell from '../components/PageShell'
import AddLeadModal from '../components/AddLeadModal'
import AddTaskModal from '../components/AddTaskModal'
import { statusLabel } from '../lib/leadStatuses'

const STAGES = [
  ['lead', 'Lead'], ['contacted', 'Contacted'], ['interested', 'Interested'], ['proposal', 'Proposal'], ['closed_won', 'Won'],
]
const FOLLOW_UP = ['follow_up', 'interested', 'demo_sent', 'call_scheduled', 'proposal_sent', 'negotiation']
const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
function dueLabel(d) {
  if (!d) return ''
  const due = new Date(String(d).slice(0, 10) + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((due - today) / 86400000)
  return days === 0 ? 'Today' : days < 0 ? `${-days}d overdue` : `In ${days}d`
}

const S = {
  numbers: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, background: '#0b0b0b', margin: '26px 0 18px', overflow: 'hidden' },
  num: { padding: '18px 20px', borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: -1 },
  numK: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  numV: { font: "600 28px/1.2 'Inter Tight', Inter, sans-serif", letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums' },
  numS: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' },
  ttl: { fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  tag: { marginLeft: 'auto', flex: 'none', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '2px 9px' },
  check: { width: 20, height: 20, flex: 'none', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', background: 'none', display: 'grid', placeItems: 'center', color: '#000', cursor: 'pointer' },
  empty: { padding: '30px 18px', color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' },
}

export default function Home() {
  const { appAuth } = useAuth()
  const navigate = useNavigate()
  const isRep = appAuth?.role === 'sales'
  const canFind = appAuth?.role === 'admin' || appAuth?.role === 'manager'
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [addLead, setAddLead] = useState(false)
  const [addTask, setAddTask] = useState(false)

  const load = useCallback(async () => {
    const scope = isRep ? [appAuth.id] : []
    const lw = isRep ? ' AND (assigned_to = $1 OR rep_id = $1)' : ''
    const tw = isRep ? ' AND (tasks.assigned_to = $1 OR tasks.rep_id = $1)' : ''
    try {
      const [deals, stages, newLeads, tasks, follow] = await Promise.all([
        db.query(`SELECT
            COALESCE(SUM(proposed_price) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')), 0)::float AS open_value,
            COUNT(*) FILTER (WHERE stage NOT IN ('closed_won','closed_lost'))::int AS open_count,
            COALESCE(SUM(COALESCE(final_price, proposed_price)) FILTER (WHERE stage = 'closed_won' AND COALESCE(closed_at, created_at) >= date_trunc('month', now())), 0)::float AS won_month,
            COUNT(*) FILTER (WHERE stage = 'closed_won' AND COALESCE(closed_at, created_at) >= date_trunc('month', now()))::int AS won_month_count
          FROM deals WHERE true${lw}`, scope),
        db.query(`SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(COALESCE(final_price, proposed_price)),0)::float AS value FROM deals WHERE true${lw} GROUP BY stage`, scope),
        db.query(`SELECT COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week, COUNT(*)::int AS total FROM leads WHERE true${lw}`, scope),
        db.query(`SELECT tasks.id, tasks.title, tasks.due_date, tasks.priority, tasks.lead_id, leads.company_name
            FROM tasks LEFT JOIN leads ON tasks.lead_id = leads.id
            WHERE tasks.is_complete = false AND tasks.due_date <= CURRENT_DATE${tw}
            ORDER BY tasks.due_date ASC, CASE tasks.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END LIMIT 8`, scope),
        db.query(`SELECT id, company_name, industry, status, location FROM leads
            WHERE status = ANY($${scope.length + 1})${lw} ORDER BY created_at DESC LIMIT 7`, [...scope, FOLLOW_UP]),
      ])
      const byStage = Object.fromEntries((stages || []).map((r) => [r.stage, r]))
      setData({ deals: deals?.[0] || {}, byStage, leads: newLeads?.[0] || {}, tasks: tasks || [], follow: follow || [] })
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [isRep, appAuth?.id])

  useEffect(() => { load() }, [load])

  async function complete(task) {
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }))
    try { await db.query('UPDATE tasks SET is_complete = true, completed_at = now() WHERE id = $1', [task.id]) } catch { load() }
  }

  const first = (appAuth?.name || '').split(' ')[0] || 'there'
  const d = data?.deals || {}
  const stageMax = Math.max(1, ...STAGES.map(([k]) => data?.byStage[k]?.count || 0))

  return (
    <PageShell>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 className="lx-h1">{greeting()}, <span className="lx-serif" style={{ fontSize: 34 }}>{first}.</span></h1>
          <div className="lx-sub">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canFind && <button className="lx-btn" onClick={() => navigate('/discover')}><Radar size={14} />Find leads</button>}
          <button className="lx-btn" onClick={() => setAddTask(true)}><Plus size={14} />Task</button>
          <button className="lx-btn primary" onClick={() => setAddLead(true)}><Plus size={14} />Lead</button>
        </div>
      </div>

      {error && <div className="lx-panel" style={{ ...S.empty, marginTop: 20, color: '#ff8a8a' }}>{error}</div>}

      <div style={S.numbers}>
        <div style={S.num}><div style={S.numK}>Open pipeline</div><div style={S.numV}>{data ? money(d.open_value) : '·'}</div><div style={S.numS}>{d.open_count ?? 0} open deals</div></div>
        <div style={S.num}><div style={S.numK}>Won this month</div><div style={S.numV}>{data ? money(d.won_month) : '·'}</div><div style={S.numS}>{d.won_month_count ?? 0} deals closed</div></div>
        <div style={S.num}><div style={S.numK}>New leads</div><div style={S.numV}>{data ? data.leads.week ?? 0 : '·'}</div><div style={S.numS}>this week · {data?.leads.total ?? 0} total</div></div>
        <div style={S.num}><div style={S.numK}>Due today</div><div style={S.numV}>{data ? data.tasks.length : '·'}</div><div style={S.numS}>{data?.tasks.some((t) => dueLabel(t.due_date).includes('overdue')) ? 'some are overdue' : 'tasks to finish'}</div></div>
      </div>

      <div style={S.grid}>
        <section className="lx-panel">
          <div className="lx-panel-h"><h3>To do</h3><span className="sub">due today and overdue</span><button className="lx-btn sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/tasks')}>All tasks</button></div>
          {data && !data.tasks.length && <div style={S.empty}>Nothing due. You're clear.</div>}
          {data?.tasks.map((t) => (
            <div key={t.id} style={S.row} onClick={() => t.lead_id && navigate(`/leads/${t.lead_id}`)}>
              <button type="button" style={S.check} title="Mark done" onClick={(e) => { e.stopPropagation(); complete(t) }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}>
                <Check size={13} strokeWidth={3} />
              </button>
              <div style={{ minWidth: 0 }}><div style={S.ttl}>{t.title}</div><div style={S.meta}>{t.company_name || 'No lead'}{t.priority === 'high' ? ' · high priority' : ''}</div></div>
              <span style={{ ...S.tag, color: dueLabel(t.due_date).includes('overdue') ? '#fff' : S.tag.color, borderColor: dueLabel(t.due_date).includes('overdue') ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.1)' }}>{dueLabel(t.due_date)}</span>
            </div>
          ))}
        </section>

        <section className="lx-panel">
          <div className="lx-panel-h"><h3>Follow up</h3><span className="sub">leads in motion</span><button className="lx-btn sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/leads')}>All leads</button></div>
          {data && !data.follow.length && <div style={S.empty}>No warm leads right now. Time to find some.</div>}
          {data?.follow.map((l) => (
            <div key={l.id} style={S.row} onClick={() => navigate(`/leads/${l.id}`)}>
              <div style={{ minWidth: 0 }}><div style={S.ttl}>{l.company_name}</div><div style={S.meta}>{[l.industry, l.location].filter(Boolean).join(' · ') || ' '}</div></div>
              <span style={S.tag}>{statusLabel(l.status)}</span>
            </div>
          ))}
        </section>
      </div>

      <section className="lx-panel" style={{ marginTop: 18 }}>
        <div className="lx-panel-h"><h3>Pipeline</h3><span className="sub">deals by stage</span><button className="lx-btn sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/pipeline')}>Open pipeline <ArrowUpRight size={13} /></button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
          {STAGES.map(([k, label], i) => {
            const s = data?.byStage[k] || {}
            return (
              <div key={k} style={{ background: '#0b0b0b', padding: '16px 18px', cursor: 'pointer' }} onClick={() => navigate('/pipeline')}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{label}</div>
                <div style={{ font: "600 22px 'Inter Tight', Inter", marginTop: 4 }}>{s.count || 0}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{money(s.value)}</div>
                <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginTop: 10 }}>
                  <div style={{ height: '100%', width: `${((s.count || 0) / stageMax) * 100}%`, borderRadius: 3, background: `rgba(255,255,255,${0.35 + i * 0.16})`, transition: 'width .5s cubic-bezier(.2,.7,.1,1)' }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <AddLeadModal open={addLead} onClose={() => setAddLead(false)} onCreated={() => { setAddLead(false); load() }} />
      <AddTaskModal open={addTask} onClose={() => setAddTask(false)} onCreated={() => { setAddTask(false); load() }} />
    </PageShell>
  )
}
