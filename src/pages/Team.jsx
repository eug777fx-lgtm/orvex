import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, KeyRound, RefreshCw } from 'lucide-react'
import PageShell from '../components/PageShell'
import { workflowApi } from '../lib/auth'

const card = {
  background: 'rgba(194,181,155,0.03)',
  border: '0.5px solid rgba(194,181,155,0.08)',
  borderRadius: 14,
}

const th = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  padding: '12px 16px',
  whiteSpace: 'nowrap',
}

const td = {
  fontSize: 13,
  color: 'rgba(255,255,255,0.8)',
  padding: '14px 16px',
  borderTop: '0.5px solid rgba(255,255,255,0.05)',
  whiteSpace: 'nowrap',
}


const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString()
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

function RoleBadge({ role }) {
  const map = {
    admin: { c: '#C2B59B', bg: 'rgba(194,181,155,0.12)', b: 'rgba(194,181,155,0.25)' },
    manager: { c: '#7DD3FC', bg: 'rgba(125,211,252,0.1)', b: 'rgba(125,211,252,0.25)' },
    rep: { c: 'rgba(255,255,255,0.65)', bg: 'rgba(255,255,255,0.05)', b: 'rgba(255,255,255,0.12)' },
  }
  const s = map[role] || map.rep
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: s.c,
        background: s.bg,
        border: `0.5px solid ${s.b}`,
        borderRadius: 999,
        padding: '3px 10px',
      }}
    >
      {role || 'rep'}
    </span>
  )
}

export default function Team() {
  const [reps, setReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')

  function showToast(m) {
    setToast(m)
    setTimeout(() => setToast(''), 2800)
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await workflowApi('get_all_reps')
      if (data?.success) setReps(data.reps || [])
      else setError(data?.error || 'Failed to load team')
    } catch (e) {
      setError('Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])


  async function toggleStatus(rep) {
    const next = !rep.is_active
    const prev = reps
    setReps((list) =>
      list.map((r) => (r.id === rep.id ? { ...r, is_active: next } : r)),
    )
    try {
      const data = await workflowApi('toggle_rep_status', {
        method: 'POST',
        body: { rep_id: rep.id, is_active: next },
      })
      if (!data?.success) throw new Error()
      showToast(next ? `${rep.name || 'Rep'} activated` : `${rep.name || 'Rep'} deactivated`)
    } catch (e) {
      setReps(prev)
      showToast('Could not update status')
    }
  }

  async function resetPassword(rep) {
    setBusyId(rep.id)
    try {
      const data = await workflowApi('reset_rep_password', {
        method: 'POST',
        body: { rep_id: rep.id },
      })
      if (data?.success) showToast('Password reset to reset123')
      else showToast('Could not reset password')
    } catch (e) {
      showToast('Could not reset password')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: '-0.4px' }}>
            Sales Team
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            Manage roles, access and credentials for every registered rep
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#C2B59B',
            background: 'rgba(194,181,155,0.08)',
            border: '0.5px solid rgba(194,181,155,0.22)',
            borderRadius: 10,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13.5,
              padding: 48,
            }}
          >
            <Loader2 size={18} className="spin" />
            Loading team…
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13.5 }}>
            {error}
          </div>
        ) : reps.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13.5 }}>
            No registered reps yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Leads</th>
                  <th style={th}>Deals</th>
                  <th style={th}>Commission</th>
                  <th style={th}>Joined</th>
                  <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.id} style={{ opacity: rep.is_active ? 1 : 0.5 }}>
                    <td style={{ ...td, color: '#fff', fontWeight: 600 }}>
                      {rep.name || '—'}
                    </td>
                    <td style={{ ...td, color: 'rgba(255,255,255,0.55)' }}>
                      {rep.email}
                    </td>
                    <td style={td}>
                      <RoleBadge role={rep.role} />
                    </td>
                    <td style={td}>{Number(rep.total_leads) || 0}</td>
                    <td style={td}>{Number(rep.deals_closed) || 0}</td>
                    <td style={{ ...td, color: '#C2B59B', fontWeight: 600 }}>
                      {money(rep.total_commission)}
                    </td>
                    <td style={{ ...td, color: 'rgba(255,255,255,0.5)' }}>
                      {fmtDate(rep.created_at)}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <select
                          value={rep.role}
                          onChange={async (e) => {
                            const newRole = e.target.value
                            await fetch('/api/workflow', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'update_rep_role', rep_id: rep.id, role: newRole })
                            })
                            setReps(prev => prev.map(r => r.id === rep.id ? { ...r, role: newRole } : r))
                          }}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, cursor: 'pointer' }}
                        >
                          <option value="sales">Sales</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => toggleStatus(rep)}
                          title={rep.is_active ? 'Deactivate' : 'Activate'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            borderRadius: 8,
                            padding: '6px 10px',
                            color: rep.is_active
                              ? 'rgba(248,113,113,0.9)'
                              : 'rgba(74,222,128,0.9)',
                            background: rep.is_active
                              ? 'rgba(248,113,113,0.08)'
                              : 'rgba(74,222,128,0.08)',
                            border: `0.5px solid ${
                              rep.is_active
                                ? 'rgba(248,113,113,0.25)'
                                : 'rgba(74,222,128,0.25)'
                            }`,
                          }}
                        >
                          {rep.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => resetPassword(rep)}
                          disabled={busyId === rep.id}
                          title="Reset password to reset123"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: busyId === rep.id ? 'wait' : 'pointer',
                            borderRadius: 8,
                            padding: '6px 10px',
                            color: 'rgba(255,255,255,0.7)',
                            background: 'rgba(255,255,255,0.04)',
                            border: '0.5px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          {busyId === rep.id ? (
                            <Loader2 size={12} className="spin" />
                          ) : (
                            <KeyRound size={12} />
                          )}
                          Reset password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
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
              background: '#16161A',
              border: '0.5px solid rgba(194,181,155,0.2)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              padding: '12px 22px',
              borderRadius: 12,
              zIndex: 300,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
