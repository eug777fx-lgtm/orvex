import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import db from '@/lib/db'
import AddTaskModal from '../components/AddTaskModal'
import PageShell from '../components/PageShell'
import {
  addDays,
  dateKey,
  formatDateGroup,
  formatDueLabel,
  startOfDay,
  toLocalDate,
  todayKey,
} from '../utils/dates'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

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
}

const statLabelStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const statNumberStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
}

const sectionLabelStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.01em',
  marginBottom: 12,
}

const glassCardStyle = {
  background: 'rgba(17,17,20,0.55)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
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

const typePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 11,
  fontWeight: 500,
}

function priorityPillStyle(priority) {
  if (priority === 'high') {
    return {
      background: '#ffffff',
      color: '#000000',
      fontWeight: 700,
    }
  }
  if (priority === 'medium') {
    return {
      background: 'rgba(255,255,255,0.12)',
      color: 'rgba(255,255,255,0.85)',
      fontWeight: 600,
    }
  }
  return {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500,
  }
}

function PriorityBadge({ priority }) {
  if (!priority) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 11,
        letterSpacing: '0.02em',
        ...priorityPillStyle(priority),
      }}
    >
      {priority}
    </span>
  )
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const da = a.due_date ? toLocalDate(a.due_date).getTime() : Infinity
    const db = b.due_date ? toLocalDate(b.due_date).getTime() : Infinity
    if (da !== db) return da - db
    const pa = PRIORITY_ORDER[a.priority] ?? 3
    const pb = PRIORITY_ORDER[b.priority] ?? 3
    return pa - pb
  })
}

function TaskRow({
  task,
  onComplete,
  onDelete,
  onOpenLead,
  overdue = false,
  completed = false,
}) {
  const [hovered, setHovered] = useState(false)
  const dueLabel = formatDueLabel(task.due_date)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        borderLeft: overdue ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
        transition: 'background 0.15s ease',
        background: hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={() => onComplete(task)}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `1px solid ${completed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'}`,
          background: completed ? '#ffffff' : 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
        }}
        aria-label={completed ? 'Completed' : 'Mark complete'}
      >
        {completed && <Check size={12} color="#000000" strokeWidth={3} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.9rem',
            color: completed ? 'rgba(255,255,255,0.35)' : '#ffffff',
            fontWeight: 500,
            textDecoration: completed ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 5,
            flexWrap: 'wrap',
          }}
        >
          {task.company_name && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenLead(task.lead_id)
              }}
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationColor: 'rgba(255,255,255,0.15)',
                textUnderlineOffset: 3,
              }}
            >
              {task.company_name}
            </button>
          )}
          {task.type && <span style={typePillStyle}>{task.type}</span>}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {task.priority && <PriorityBadge priority={task.priority} />}
        {dueLabel && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
            {dueLabel}
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(task)}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
          aria-label="Delete"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={sectionLabelStyle}>{title}</div>
      {children}
    </div>
  )
}

function EmptyLine({ children }) {
  return (
    <div
      style={{
        padding: '2.5rem 1rem',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.35)',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  )
}

export default function Tasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [completed, setCompleted] = useState([])
  const [completedToday, setCompletedToday] = useState(0)
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const [completedLoading, setCompletedLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchOpen() {
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
      const [openRows, countRows] = await Promise.all([
        db.query(`
          SELECT
            tasks.*,
            leads.company_name,
            leads.id AS lead_id
          FROM tasks
          LEFT JOIN leads ON tasks.lead_id = leads.id
          WHERE tasks.is_complete = false
          ORDER BY tasks.due_date ASC NULLS LAST, tasks.priority DESC
        `),
        db.query(`
          SELECT COUNT(*)::int AS count
          FROM tasks
          WHERE is_complete = true
            AND completed_at >= date_trunc('day', now())
            AND completed_at < date_trunc('day', now()) + interval '1 day'
        `),
      ])
      setTasks(openRows || [])
      setCompletedToday(countRows?.[0]?.count ?? 0)
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load tasks.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCompleted() {
    if (!db) return
    setCompletedLoading(true)
    try {
      const rows = await db.query(`
        SELECT
          tasks.*,
          leads.company_name,
          leads.id AS lead_id
        FROM tasks
        LEFT JOIN leads ON tasks.lead_id = leads.id
        WHERE tasks.is_complete = true
        ORDER BY tasks.completed_at DESC NULLS LAST
        LIMIT 100
      `)
      setCompleted(rows || [])
    } catch (err) {
      console.error(err)
    } finally {
      setCompletedLoading(false)
    }
  }

  useEffect(() => {
    fetchOpen()
  }, [])

  useEffect(() => {
    if (completedExpanded && completed.length === 0) {
      fetchCompleted()
    }
  }, [completedExpanded])

  const today = useMemo(() => startOfDay(), [])
  const tomorrowStart = useMemo(() => addDays(today, 1), [today])

  const { todayList, upcoming, overdue, stats } = useMemo(() => {
    const todayArr = []
    const upcomingArr = []
    const overdueArr = []
    for (const t of tasks) {
      const d = toLocalDate(t.due_date)
      if (!d) {
        upcomingArr.push(t)
        continue
      }
      const dStart = startOfDay(d)
      if (dStart.getTime() === today.getTime()) todayArr.push(t)
      else if (dStart.getTime() < today.getTime()) overdueArr.push(t)
      else upcomingArr.push(t)
    }
    const sortedToday = [...todayArr].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
    )
    const sortedUpcoming = sortTasks(upcomingArr)
    const sortedOverdue = sortTasks(overdueArr)
    return {
      todayList: sortedToday,
      upcoming: sortedUpcoming,
      overdue: sortedOverdue,
      stats: {
        dueToday: todayArr.length,
        overdue: overdueArr.length,
      },
    }
  }, [tasks, today])

  const upcomingGroups = useMemo(() => {
    const groups = new Map()
    for (const t of upcoming) {
      const d = toLocalDate(t.due_date)
      const key = d ? dateKey(startOfDay(d)) : 'later'
      if (!groups.has(key)) {
        groups.set(key, { key, date: d, label: d ? formatDateGroup(d) : 'No due date', tasks: [] })
      }
      groups.get(key).tasks.push(t)
    }
    return Array.from(groups.values())
  }, [upcoming])

  async function completeTask(task) {
    if (!db) return
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    setCompletedToday((prev) => prev + 1)
    try {
      await db.query(
        `UPDATE tasks
         SET is_complete = true, completed_at = now()
         WHERE id = $1`,
        [task.id],
      )
      if (completedExpanded) {
        fetchCompleted()
      }
    } catch (err) {
      console.error(err)
      setTasks((prev) => [...prev, task])
      setCompletedToday((prev) => Math.max(0, prev - 1))
    }
  }

  async function uncompleteTask(task) {
    if (!db) return
    setCompleted((prev) => prev.filter((t) => t.id !== task.id))
    setCompletedToday((prev) => Math.max(0, prev - 1))
    try {
      await db.query(
        `UPDATE tasks
         SET is_complete = false, completed_at = NULL
         WHERE id = $1`,
        [task.id],
      )
      fetchOpen()
    } catch (err) {
      console.error(err)
      setCompleted((prev) => [task, ...prev])
    }
  }

  async function deleteTask(task) {
    if (!db) return
    const wasCompleted = task.is_complete
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
    setCompleted((prev) => prev.filter((t) => t.id !== task.id))
    try {
      await db.query('DELETE FROM tasks WHERE id = $1', [task.id])
    } catch (err) {
      console.error(err)
      if (wasCompleted) setCompleted((prev) => [task, ...prev])
      else setTasks((prev) => [...prev, task])
    }
  }

  function openLead(leadId) {
    if (leadId) navigate(`/leads/${leadId}`)
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
          <h2 style={pageHeadingStyle}>Tasks</h2>
          <p style={pageSubStyle}>Your daily calls, follow-ups and reminders</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} style={addButtonStyle}>
          <Plus size={14} strokeWidth={2.5} />
          Add Task
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Due Today</span>
          <span style={statNumberStyle}>{stats.dueToday}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Overdue</span>
          <span style={statNumberStyle}>{stats.overdue}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Completed Today</span>
          <span style={statNumberStyle}>{completedToday}</span>
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
          Loading tasks...
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Section title="Today">
            <div style={glassCardStyle}>
              {todayList.length === 0 ? (
                <EmptyLine>Nothing due today — you're clear 👌</EmptyLine>
              ) : (
                todayList.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onComplete={completeTask}
                    onDelete={deleteTask}
                    onOpenLead={openLead}
                  />
                ))
              )}
            </div>
          </Section>

          <Section title="Upcoming">
            <div style={glassCardStyle}>
              {upcomingGroups.length === 0 ? (
                <EmptyLine>No upcoming tasks</EmptyLine>
              ) : (
                upcomingGroups.map((group) => (
                  <div key={group.key}>
                    <div
                      style={{
                        padding: '10px 16px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.45)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      {group.label}
                    </div>
                    {group.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onComplete={completeTask}
                        onDelete={deleteTask}
                        onOpenLead={openLead}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </Section>

          {overdue.length > 0 && (
            <Section title="Overdue">
              <div style={glassCardStyle}>
                {overdue.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onComplete={completeTask}
                    onDelete={deleteTask}
                    onOpenLead={openLead}
                    overdue
                  />
                ))}
              </div>
            </Section>
          )}

          <Section
            title={
              <button
                type="button"
                onClick={() => setCompletedExpanded((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                Completed ({completedToday}){' '}
                {completedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            }
          >
            {completedExpanded && (
              <div style={glassCardStyle}>
                {completedLoading ? (
                  <EmptyLine>Loading completed...</EmptyLine>
                ) : completed.length === 0 ? (
                  <EmptyLine>No completed tasks yet</EmptyLine>
                ) : (
                  completed.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onComplete={uncompleteTask}
                      onDelete={deleteTask}
                      onOpenLead={openLead}
                      completed
                    />
                  ))
                )}
              </div>
            )}
          </Section>
        </div>
      )}

      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false)
          fetchOpen()
        }}
      />
    </PageShell>
  )
}
