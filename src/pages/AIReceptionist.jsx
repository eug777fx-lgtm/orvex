import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone,
  BarChart3,
  Bot,
  ScrollText,
  Settings,
  Plus,
  Edit3,
  Trash2,
  X,
  Loader2,
  Clock,
  TrendingUp,
  Mic,
  Copy as CopyIcon,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { useAuth, workflowApi } from '../lib/auth'

// ---- tokens (monochrome) ----
const BG_CARD = '#111111'
const BG_ELEVATED = '#1A1A1A'
const BG_INPUT = '#141414'
const BORDER = '#2A2A2A'
const BORDER_SUBTLE = '#1A1A1A'
const TEXT = '#FFFFFF'
const TEXT_MUTED = '#A0A0A0'
const TEXT_DIM = '#666666'

const card = {
  background: BG_CARD,
  border: '1px solid ' + BORDER,
  borderRadius: 12,
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: TEXT_MUTED,
  marginBottom: 6,
  display: 'block',
}

const inputStyle = {
  width: '100%',
  background: BG_INPUT,
  border: '1px solid ' + BORDER,
  borderRadius: 8,
  color: TEXT,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
}

const primaryBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: '#FFFFFF',
  color: '#000000',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: 'transparent',
  color: TEXT,
  border: '1px solid ' + BORDER,
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

const dangerBtn = {
  ...ghostBtn,
  color: '#FF4444',
  border: '1px solid rgba(255, 68, 68, 0.4)',
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'logs', label: 'Call Logs', icon: ScrollText },
  { key: 'settings', label: 'Settings', icon: Settings },
]

const money = (n) => Number(n || 0).toLocaleString()
const minutesLabel = (m) => `${Number(m || 0).toFixed(1)} min`
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export default function AIReceptionist() {
  const { appAuth } = useAuth()
  const [tab, setTab] = useState('overview')
  const [agents, setAgents] = useState([])
  const [logs, setLogs] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [deletingAgent, setDeletingAgent] = useState(null)
  const [viewingLogsFor, setViewingLogsFor] = useState(null)

  if (appAuth?.role !== 'admin') {
    return (
      <PageShell>
        <div
          style={{
            ...card,
            padding: 48,
            textAlign: 'center',
            color: TEXT_MUTED,
            maxWidth: 480,
            margin: '60px auto',
          }}
        >
          <Phone size={36} style={{ color: TEXT_DIM, marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
            Access Denied
          </h2>
          <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>
            The AI Receptionist manager is restricted to admins.
          </p>
        </div>
      </PageShell>
    )
  }

  function showToast(m) {
    setToast(m)
    setTimeout(() => setToast(''), 2800)
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [a, an, l] = await Promise.all([
        workflowApi('get_ai_agents'),
        workflowApi('get_ai_analytics'),
        workflowApi('get_call_logs'),
      ])
      setAgents(a?.agents || [])
      setAnalytics(an?.analytics || null)
      setRecent(an?.recent_calls || [])
      setLogs(l?.logs || [])
    } catch (e) {
      showToast('Could not load AI data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function saveAgent(payload, mode = 'create') {
    try {
      const action = mode === 'create' ? 'create_ai_agent' : 'update_ai_agent'
      const d = await workflowApi(action, { method: 'POST', body: payload })
      if (d?.success) {
        if (mode === 'create' && d.retell_error) {
          showToast(`Agent saved — Retell warning: ${d.retell_error}`)
        } else {
          showToast(mode === 'create' ? 'Agent created' : 'Agent updated')
        }
        loadAll()
        return d.agent || true
      }
      showToast(d?.error || 'Save failed')
      return null
    } catch (e) {
      showToast('Save failed')
      return null
    }
  }

  async function deleteAgent(id) {
    try {
      const d = await workflowApi('delete_ai_agent', {
        method: 'POST',
        body: { agent_id: id },
      })
      if (d?.success) {
        showToast('Agent deleted')
        loadAll()
      } else {
        showToast(d?.error || 'Delete failed')
      }
    } catch (e) {
      showToast('Delete failed')
    }
  }

  return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: TEXT,
                letterSpacing: '-0.3px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Phone size={22} /> AI Receptionist
            </h2>
            <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 6 }}>
              Spin up Retell-powered voice agents for client receptionist lines.
            </p>
          </div>
          {tab === 'agents' && (
            <button type="button" onClick={() => setCreateOpen(true)} style={primaryBtn}>
              <Plus size={13} />
              Create New Agent
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  color: active ? '#000000' : TEXT_MUTED,
                  background: active ? '#FFFFFF' : 'transparent',
                  border: active ? '1px solid #FFFFFF' : '1px solid ' + BORDER,
                  borderRadius: 10,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
        </div>

        {tab === 'overview' && (
          <OverviewTab loading={loading} analytics={analytics} agents={agents} recent={recent} />
        )}

        {tab === 'agents' && (
          <AgentsTab
            loading={loading}
            agents={agents}
            onEdit={setEditingAgent}
            onDelete={setDeletingAgent}
            onViewLogs={setViewingLogsFor}
          />
        )}

        {tab === 'logs' && <LogsTab loading={loading} logs={logs} agents={agents} />}

        {tab === 'settings' && <SettingsTab showToast={showToast} />}
      </div>

      <AnimatePresence>
        {createOpen && (
          <AgentModal
            mode="create"
            onClose={() => setCreateOpen(false)}
            onSubmit={async (payload) => {
              const ok = await saveAgent(payload, 'create')
              if (ok) setCreateOpen(false)
            }}
          />
        )}
        {editingAgent && (
          <AgentModal
            mode="edit"
            agent={editingAgent}
            onClose={() => setEditingAgent(null)}
            onSubmit={async (payload) => {
              const ok = await saveAgent({ ...payload, agent_id: editingAgent.id }, 'edit')
              if (ok) setEditingAgent(null)
            }}
          />
        )}
        {deletingAgent && (
          <ConfirmDeleteModal
            agent={deletingAgent}
            onClose={() => setDeletingAgent(null)}
            onConfirm={async () => {
              await deleteAgent(deletingAgent.id)
              setDeletingAgent(null)
            }}
          />
        )}
        {viewingLogsFor && (
          <CallLogsModal
            agent={viewingLogsFor}
            onClose={() => setViewingLogsFor(null)}
          />
        )}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 28,
              left: '50%',
              transform: 'translateX(-50%)',
              background: BG_ELEVATED,
              border: '1px solid ' + BORDER,
              color: TEXT,
              fontSize: 13,
              fontWeight: 500,
              padding: '12px 22px',
              borderRadius: 12,
              zIndex: 300,
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}

// ---------- Overview ----------
function OverviewTab({ loading, analytics, agents, recent }) {
  if (loading) return <LoadingBlock />
  const activeAgents = agents.filter((a) => a.status === 'active')

  const stats = [
    { label: 'Total Agents', value: analytics?.total_agents, icon: Bot },
    { label: 'Total Calls', value: analytics?.total_calls, icon: Phone },
    {
      label: 'Total Minutes',
      value: Number(analytics?.total_minutes || 0).toFixed(1),
      icon: Clock,
    },
    { label: 'Leads Captured', value: analytics?.total_leads, icon: TrendingUp },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ ...card, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 14 }}>
          Active agents{' '}
          <span style={{ color: TEXT_DIM, fontWeight: 500 }}>· {activeAgents.length}</span>
        </h3>
        {activeAgents.length === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_DIM, padding: '20px 0' }}>
            No active agents yet. Create one in the Agents tab.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeAgents.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: '#0A0A0A',
                  border: '1px solid ' + BORDER_SUBTLE,
                  borderRadius: 8,
                }}
              >
                <Bot size={16} style={{ color: TEXT_MUTED }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: TEXT }}>
                    {a.agent_name}{' '}
                    <span style={{ color: TEXT_DIM, fontWeight: 400 }}>· {a.client_name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: TEXT_DIM, marginTop: 2 }}>
                    {a.phone_number || 'No phone configured'}
                  </div>
                </div>
                <StatusBadge status={a.status} />
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {money(a.total_calls)} calls · {minutesLabel(a.total_minutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...card, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 14 }}>
          Recent calls
        </h3>
        {recent.length === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_DIM, padding: '20px 0' }}>
            No calls logged yet — they'll appear here once Retell starts hitting the webhook.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent.map((c) => (
              <CallRow key={c.id} log={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: TEXT_DIM,
          }}
        >
          {label}
        </span>
        <Icon size={13} style={{ color: TEXT_DIM }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: '-0.5px' }}>
        {value ?? 0}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const isActive = status === 'active'
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: isActive ? '#000000' : TEXT_MUTED,
        background: isActive ? '#FFFFFF' : BG_ELEVATED,
        border: '1px solid ' + BORDER,
        borderRadius: 999,
        padding: '3px 10px',
      }}
    >
      {status || 'inactive'}
    </span>
  )
}

// ---------- Agents ----------
function AgentsTab({ loading, agents, onEdit, onDelete, onViewLogs }) {
  if (loading) return <LoadingBlock />
  if (agents.length === 0) {
    return (
      <div
        style={{
          ...card,
          padding: 48,
          textAlign: 'center',
          color: TEXT_MUTED,
          fontSize: 13.5,
        }}
      >
        No agents yet. Click "Create New Agent" to spin up your first one.
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 14,
      }}
    >
      {agents.map((a) => (
        <AgentCard
          key={a.id}
          agent={a}
          onEdit={() => onEdit(a)}
          onDelete={() => onDelete(a)}
          onViewLogs={() => onViewLogs(a)}
        />
      ))}
    </div>
  )
}

function AgentCard({ agent, onEdit, onDelete, onViewLogs }) {
  return (
    <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{agent.agent_name}</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 3 }}>
            for <strong style={{ color: TEXT }}>{agent.client_name}</strong>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {agent.phone_number && (
        <div
          style={{
            fontSize: 12.5,
            color: TEXT_MUTED,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Phone size={12} style={{ color: TEXT_DIM }} />
          {agent.phone_number}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          padding: '12px 0',
          borderTop: '1px solid ' + BORDER_SUBTLE,
          borderBottom: '1px solid ' + BORDER_SUBTLE,
        }}
      >
        <MetricBlock label="Calls" value={money(agent.total_calls)} />
        <MetricBlock label="Minutes" value={Number(agent.total_minutes || 0).toFixed(1)} />
        <MetricBlock label="Leads" value={money(agent.leads_captured)} />
      </div>

      {agent.retell_agent_id && (
        <div style={{ fontSize: 10.5, color: TEXT_DIM, fontFamily: 'monospace' }}>
          Retell ID: {agent.retell_agent_id}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onViewLogs}
          style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}
        >
          <ScrollText size={12} /> View Calls
        </button>
        <button
          type="button"
          onClick={onEdit}
          style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}
        >
          <Edit3 size={12} /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{ ...dangerBtn, padding: '6px 12px', fontSize: 12 }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  )
}

function MetricBlock({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: TEXT_DIM,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT, marginTop: 2 }}>{value}</div>
    </div>
  )
}

// ---------- Call Logs ----------
function LogsTab({ loading, logs, agents }) {
  const [agentFilter, setAgentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (agentFilter !== 'all' && l.agent_id !== agentFilter) return false
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      return true
    })
  }, [logs, agentFilter, statusFilter])

  if (loading) return <LoadingBlock />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Agent</label>
          <select
            style={{ ...inputStyle, minWidth: 200 }}
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="all">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.agent_name} · {a.client_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={{ ...inputStyle, minWidth: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="ended">Ended</option>
            <option value="ongoing">Ongoing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div style={{ flex: 1, textAlign: 'right', fontSize: 12.5, color: TEXT_DIM }}>
          {filtered.length} {filtered.length === 1 ? 'call' : 'calls'}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: TEXT_DIM, fontSize: 13.5 }}>
            No calls match these filters.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0A0A0A' }}>
                <Th>Agent</Th>
                <Th>Caller</Th>
                <Th align="right">Duration</Th>
                <Th>Status</Th>
                <Th>Summary</Th>
                <Th align="right">When</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <LogRow
                  key={l.id}
                  log={l}
                  expanded={expanded === l.id}
                  onToggle={() => setExpanded(expanded === l.id ? null : l.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th
      style={{
        textAlign: align,
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: TEXT_DIM,
        padding: '11px 14px',
        borderBottom: '1px solid ' + BORDER_SUBTLE,
      }}
    >
      {children}
    </th>
  )
}

function LogRow({ log, expanded, onToggle }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          borderTop: '1px solid ' + BORDER_SUBTLE,
        }}
      >
        <Td>
          <strong style={{ color: TEXT }}>{log.agent_name || '—'}</strong>
          <div style={{ fontSize: 11, color: TEXT_DIM }}>{log.client_name}</div>
        </Td>
        <Td>{log.caller_number || '—'}</Td>
        <Td align="right">
          {log.duration_seconds ? `${Math.round(log.duration_seconds)}s` : '—'}
        </Td>
        <Td>
          <span style={{ fontSize: 11.5, color: TEXT_MUTED }}>{log.status || '—'}</span>
        </Td>
        <Td>
          <span
            style={{
              display: 'block',
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: TEXT_MUTED,
            }}
          >
            {log.summary || '—'}
          </span>
        </Td>
        <Td align="right">
          <span style={{ fontSize: 12, color: TEXT_DIM }}>{fmtDateTime(log.created_at)}</span>
        </Td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={{ padding: 16, background: '#0A0A0A', borderTop: '1px solid ' + BORDER_SUBTLE }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {log.summary && (
                <div>
                  <Label>Summary</Label>
                  <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6 }}>{log.summary}</p>
                </div>
              )}
              {log.transcript ? (
                <div>
                  <Label>Transcript</Label>
                  <pre
                    style={{
                      fontSize: 12,
                      color: TEXT_MUTED,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 320,
                      overflowY: 'auto',
                      background: BG_CARD,
                      border: '1px solid ' + BORDER_SUBTLE,
                      borderRadius: 8,
                      padding: 12,
                      margin: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    {log.transcript}
                  </pre>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: TEXT_DIM }}>No transcript available.</div>
              )}
              {log.recording_url && (
                <a
                  href={log.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...ghostBtn,
                    padding: '6px 12px',
                    fontSize: 12,
                    width: 'fit-content',
                    textDecoration: 'none',
                  }}
                >
                  <Mic size={12} /> Listen to recording
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Td({ children, align = 'left' }) {
  return (
    <td style={{ padding: '13px 14px', color: TEXT, textAlign: align, verticalAlign: 'top' }}>
      {children}
    </td>
  )
}

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: TEXT_DIM,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  )
}

function CallRow({ log }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 0',
        borderTop: '1px solid ' + BORDER_SUBTLE,
      }}
    >
      <Phone size={14} style={{ color: TEXT_DIM, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: TEXT }}>
          <strong>{log.agent_name || 'Agent'}</strong>
          <span style={{ color: TEXT_DIM }}> · {log.caller_number || 'Unknown'}</span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: TEXT_MUTED,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {log.summary || 'No summary'}
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_DIM, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {log.duration_seconds ? `${Math.round(log.duration_seconds)}s` : '—'}
        <div>{fmtDateTime(log.created_at)}</div>
      </div>
    </div>
  )
}

// ---------- Settings ----------
const WEBHOOK_URL = 'https://app.lithoslabs.agency/api/workflow?action=retell_webhook'

function SettingsTab({ showToast }) {
  function copy(text) {
    navigator.clipboard?.writeText(text)
    showToast('Webhook URL copied')
  }

  return (
    <div style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
          Webhook URL to paste in Retell dashboard
        </h3>
        <p style={{ fontSize: 12.5, color: TEXT_MUTED, marginTop: 6, lineHeight: 1.6 }}>
          Paste this URL in your Retell agent settings under{' '}
          <strong style={{ color: TEXT }}>Webhook &rarr; Post Call Webhook</strong>.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 12,
          background: BG_INPUT,
          border: '1px solid ' + BORDER,
          borderRadius: 8,
        }}
      >
        <code
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            color: TEXT,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {WEBHOOK_URL}
        </code>
        <button
          type="button"
          onClick={() => copy(WEBHOOK_URL)}
          style={{ ...primaryBtn, padding: '8px 14px', fontSize: 12.5 }}
        >
          <CopyIcon size={12} /> Copy
        </button>
      </div>

      <div
        style={{
          padding: 14,
          background: '#0A0A0A',
          border: '1px solid ' + BORDER_SUBTLE,
          borderRadius: 8,
          fontSize: 12.5,
          color: TEXT_MUTED,
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: TEXT }}>How it wires up</strong>
        <ol style={{ paddingLeft: 18, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>Build the agent in the Retell dashboard (prompt, voice, language, etc.).</li>
          <li>
            Copy its <code style={mono}>agent_id</code> and paste it into{' '}
            <strong style={{ color: TEXT }}>Agents &rarr; Add Agent</strong> here.
          </li>
          <li>Paste the URL above into Retell&rsquo;s Post Call Webhook field.</li>
          <li>
            When a call ends, Retell sends <code style={mono}>{`{event, call}`}</code> to this
            endpoint, which logs to <code style={mono}>ai_call_logs</code> and bumps the agent&rsquo;s
            totals.
          </li>
        </ol>
      </div>
    </div>
  )
}

const mono = {
  fontFamily: 'monospace',
  fontSize: '0.9em',
  color: TEXT,
  background: BG_INPUT,
  padding: '1px 5px',
  borderRadius: 4,
}

// ---------- Modals ----------
function AgentModal({ mode, agent, onClose, onSubmit }) {
  const [form, setForm] = useState({
    client_name: agent?.client_name || '',
    agent_name: agent?.agent_name || '',
    retell_agent_id: agent?.retell_agent_id || '',
    phone_number: agent?.phone_number || '',
    business_name: agent?.business_name || '',
    status: agent?.status || 'active',
  })
  const [submitting, setSubmitting] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const canSubmit =
    form.client_name.trim() &&
    form.agent_name.trim() &&
    form.retell_agent_id.trim()

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onSubmit(form)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title={mode === 'create' ? 'Add AI Agent' : 'Edit AI Agent'}>
      <p
        style={{
          fontSize: 12.5,
          color: TEXT_MUTED,
          lineHeight: 1.6,
          marginBottom: 18,
          padding: 12,
          background: '#0A0A0A',
          border: '1px solid ' + BORDER_SUBTLE,
          borderRadius: 8,
        }}
      >
        Create the agent in the <a href="https://app.retellai.com" target="_blank" rel="noopener noreferrer" style={{ color: TEXT, textDecoration: 'underline' }}>Retell dashboard</a> first,
        then paste its <code style={mono}>agent_id</code> below. The webhook will use it to attach
        incoming calls to this client.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <Field label="Client name *" full>
          <input style={inputStyle} value={form.client_name} onChange={set('client_name')} />
        </Field>
        <Field label="Agent name *">
          <input style={inputStyle} value={form.agent_name} onChange={set('agent_name')} />
        </Field>
        <Field label="Status">
          <select style={inputStyle} value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Retell Agent ID *" full>
          <input
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13 }}
            value={form.retell_agent_id}
            onChange={set('retell_agent_id')}
            placeholder="agent_xxxxxxxxxxxx"
          />
        </Field>
        <Field label="Phone number">
          <input
            style={inputStyle}
            value={form.phone_number}
            onChange={set('phone_number')}
            placeholder="+1297…"
          />
        </Field>
        <Field label="Business name">
          <input style={inputStyle} value={form.business_name} onChange={set('business_name')} />
        </Field>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid ' + BORDER_SUBTLE,
        }}
      >
        <button type="button" onClick={onClose} style={ghostBtn} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.5 }}
          disabled={submitting || !canSubmit}
        >
          {submitting && <Loader2 size={13} className="spin" />}
          {mode === 'create' ? 'Add Agent' : 'Save Changes'}
        </button>
      </div>
    </ModalShell>
  )
}

function ConfirmDeleteModal({ agent, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false)
  return (
    <ModalShell onClose={onClose} title="Delete agent?" maxWidth={420}>
      <p style={{ fontSize: 13.5, color: TEXT_MUTED, lineHeight: 1.6 }}>
        Permanently delete{' '}
        <strong style={{ color: TEXT }}>{agent.agent_name}</strong> for{' '}
        <strong style={{ color: TEXT }}>{agent.client_name}</strong>? All call logs for this agent
        will also be removed. This cannot be undone.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 22,
        }}
      >
        <button type="button" onClick={onClose} style={ghostBtn} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            setBusy(true)
            await onConfirm()
            setBusy(false)
          }}
          style={dangerBtn}
        >
          {busy && <Loader2 size={13} className="spin" />}
          Delete
        </button>
      </div>
    </ModalShell>
  )
}

function CallLogsModal({ agent, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await workflowApi('get_call_logs', { params: { agent_id: agent.id } })
        if (!cancelled) setLogs(d?.logs || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [agent.id])

  return (
    <ModalShell
      onClose={onClose}
      title={`Calls — ${agent.agent_name}`}
      maxWidth={720}
    >
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: TEXT_MUTED }}>
          <Loader2 size={16} className="spin" /> Loading…
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: TEXT_DIM, fontSize: 13.5 }}>
          No calls logged for this agent yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setExpanded(expanded === l.id ? null : l.id)}
              style={{
                textAlign: 'left',
                background: BG_ELEVATED,
                border: '1px solid ' + BORDER_SUBTLE,
                borderRadius: 8,
                padding: 12,
                color: TEXT,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  gap: 12,
                }}
              >
                <span>
                  {l.caller_number || 'Unknown caller'}
                  <span style={{ color: TEXT_DIM }}>
                    {' '}
                    · {l.duration_seconds ? `${Math.round(l.duration_seconds)}s` : '—'} ·{' '}
                    {l.status || '—'}
                  </span>
                </span>
                <span style={{ color: TEXT_DIM }}>{fmtDateTime(l.created_at)}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: TEXT_MUTED,
                  marginTop: 4,
                  overflow: expanded === l.id ? 'visible' : 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: expanded === l.id ? 'normal' : 'nowrap',
                }}
              >
                {l.summary || 'No summary'}
              </div>
              {expanded === l.id && l.transcript && (
                <pre
                  style={{
                    fontSize: 12,
                    color: TEXT_MUTED,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: 240,
                    overflowY: 'auto',
                    background: BG_CARD,
                    border: '1px solid ' + BORDER_SUBTLE,
                    borderRadius: 6,
                    padding: 10,
                    margin: '8px 0 0',
                    fontFamily: 'inherit',
                  }}
                >
                  {l.transcript}
                </pre>
              )}
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({ onClose, title, children, maxWidth = 640 }) {
  // Single flex-centered overlay. The inner motion.div can scale/translate
  // freely without colliding with positioning — the previous version used
  // `transform: translate(-50%, -50%)` for centering, which framer-motion's
  // `animate` prop overwrote with its scale+y transform, leaving the modal
  // pinned to the top-left corner of the viewport.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderRadius: 16,
          padding: 24,
          width: '90%',
          maxWidth,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.9)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid ' + BORDER_SUBTLE,
              borderRadius: 8,
              color: TEXT_MUTED,
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function Field({ label, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function LoadingBlock() {
  return (
    <div
      style={{
        ...card,
        padding: 48,
        textAlign: 'center',
        color: TEXT_MUTED,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Loader2 size={16} className="spin" /> Loading…
    </div>
  )
}
