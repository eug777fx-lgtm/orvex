import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react'
import db from '@/lib/db'
import useIsMobile from '../utils/useIsMobile'

const STAGES = [
  {
    key: 'todo',
    label: 'To Do',
    accent: 'rgba(255,255,255,0.3)',
    pulse: false,
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    accent: 'rgba(255,255,255,0.65)',
    pulse: true,
  },
  {
    key: 'refining',
    label: 'Refining',
    accent: 'rgba(255,255,255,0.45)',
    pulse: false,
  },
  {
    key: 'done',
    label: 'Done ✓',
    accent: 'rgba(255,255,255,0.22)',
    pulse: false,
  },
]

const TYPE_OPTIONS = [
  { key: 'personal', label: 'Personal' },
  { key: 'client', label: 'Client' },
  { key: 'content', label: 'Content' },
]

const PRIORITY_OPTIONS = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

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

const ghostButtonStyle = {
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.75)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'border-color 0.15s ease, color 0.15s ease',
}

const typePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.55)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

function priorityPill(priority) {
  if (priority === 'high') {
    return { background: '#ffffff', color: '#000000', fontWeight: 700 }
  }
  if (priority === 'medium') {
    return {
      background: 'rgba(255,255,255,0.10)',
      color: 'rgba(255,255,255,0.85)',
      fontWeight: 600,
    }
  }
  return {
    background: 'transparent',
    color: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.12)',
    fontWeight: 500,
  }
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#ffffff',
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.55)',
  fontWeight: 500,
  marginBottom: 6,
  letterSpacing: '0.02em',
}

function safeChecklist(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function clampProgress(n) {
  const num = Number(n)
  if (Number.isNaN(num)) return 0
  return Math.max(0, Math.min(100, Math.round(num)))
}

export default function Workflow() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [collapsedStages, setCollapsedStages] = useState({})
  const isMobile = useIsMobile()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const rows = await db.query(
        `SELECT id, name, type, stage, progress, description, checklist,
                color, priority, created_at, updated_at
           FROM workflow_projects
           ORDER BY
             CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
             created_at DESC`,
      )
      setProjects(
        (rows || []).map((r) => ({
          ...r,
          checklist: safeChecklist(r.checklist),
        })),
      )
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load projects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    function close() {
      setOpenMenu(null)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const stats = useMemo(() => {
    const total = projects.length
    const inProgress = projects.filter((p) => p.stage === 'in_progress').length
    const done = projects.filter((p) => p.stage === 'done').length
    const todo = projects.filter((p) => p.stage === 'todo').length
    return { total, inProgress, done, todo }
  }, [projects])

  const grouped = useMemo(() => {
    const map = { todo: [], in_progress: [], refining: [], done: [] }
    for (const p of projects) {
      const key = STAGES.find((s) => s.key === p.stage)?.key || 'todo'
      map[key].push(p)
    }
    return map
  }, [projects])

  async function moveStage(project, direction) {
    const idx = STAGES.findIndex((s) => s.key === project.stage)
    const next = STAGES[idx + direction]
    if (!next) return
    const nextStage = next.key
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, stage: nextStage } : p)),
    )
    try {
      await db.query(
        `UPDATE workflow_projects SET stage = $1, updated_at = now() WHERE id = $2`,
        [nextStage, project.id],
      )
    } catch (err) {
      console.error(err)
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, stage: project.stage } : p,
        ),
      )
    }
  }

  async function toggleChecklistItem(project, idx) {
    const current = safeChecklist(project.checklist)
    const updated = current.map((it, i) =>
      i === idx ? { ...it, done: !it.done } : it,
    )
    const allDone = updated.length > 0 && updated.every((it) => it.done)
    const someDone = updated.filter((it) => it.done).length
    const computedProgress =
      updated.length > 0 ? Math.round((someDone / updated.length) * 100) : project.progress
    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              checklist: updated,
              progress: computedProgress,
              stage: allDone && p.stage !== 'done' ? p.stage : p.stage,
            }
          : p,
      ),
    )
    try {
      await db.query(
        `UPDATE workflow_projects
            SET checklist = $1::jsonb, progress = $2, updated_at = now()
            WHERE id = $3`,
        [JSON.stringify(updated), computedProgress, project.id],
      )
    } catch (err) {
      console.error(err)
      load()
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`))
      return
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
    try {
      await db.query('DELETE FROM workflow_projects WHERE id = $1', [project.id])
    } catch (err) {
      console.error(err)
      load()
    }
  }

  function toggleStage(stage) {
    setCollapsedStages((prev) => ({ ...prev, [stage]: !prev[stage] }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={pageHeadingStyle}>Workflow</h2>
          <p style={pageSubStyle}>
            All your projects and businesses at a glance
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          style={addButtonStyle}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Project
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Total</span>
          <span style={statNumberStyle}>{stats.total}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>In Progress</span>
          <span style={statNumberStyle}>{stats.inProgress}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>Done</span>
          <span style={statNumberStyle}>{stats.done}</span>
        </div>
        <div style={statPillStyle}>
          <span style={statLabelStyle}>To Do</span>
          <span style={statNumberStyle}>{stats.todo}</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.3)',
            color: '#ff8888',
            padding: '10px 14px',
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            padding: '4rem 1rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 13,
          }}
        >
          Loading projects...
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STAGES.map((stage) => {
            const items = grouped[stage.key] || []
            const collapsed = collapsedStages[stage.key]
            return (
              <div
                key={stage.key}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleStage(stage.key)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 4px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <ColumnHeader stage={stage} count={items.length} />
                  <ChevronDown
                    size={16}
                    style={{
                      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  />
                </button>
                {!collapsed && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 10,
                    }}
                  >
                    {items.length === 0 && <EmptyState />}
                    {items.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        stages={STAGES}
                        onMove={(dir) => moveStage(p, dir)}
                        onToggleChecklistItem={(idx) =>
                          toggleChecklistItem(p, idx)
                        }
                        onEdit={() => {
                          setEditing(p)
                          setModalOpen(true)
                        }}
                        onDelete={() => deleteProject(p)}
                        menuOpen={openMenu === p.id}
                        setMenuOpen={(v) =>
                          setOpenMenu(v ? p.id : null)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))',
            gap: 14,
            overflowX: 'auto',
          }}
        >
          {STAGES.map((stage) => {
            const items = grouped[stage.key] || []
            return (
              <div
                key={stage.key}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '1rem',
                  minHeight: 500,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 8,
                    borderBottom: `1px solid ${stage.accent}`,
                  }}
                >
                  <ColumnHeader stage={stage} count={items.length} />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: 2,
                  }}
                >
                  {items.length === 0 && <EmptyState />}
                  {items.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      stages={STAGES}
                      onMove={(dir) => moveStage(p, dir)}
                      onToggleChecklistItem={(idx) =>
                        toggleChecklistItem(p, idx)
                      }
                      onEdit={() => {
                        setEditing(p)
                        setModalOpen(true)
                      }}
                      onDelete={() => deleteProject(p)}
                      menuOpen={openMenu === p.id}
                      setMenuOpen={(v) => setOpenMenu(v ? p.id : null)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        editing={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSaved={() => {
          setModalOpen(false)
          setEditing(null)
          load()
        }}
      />

      <style>{`
        @keyframes wfPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '24px 12px',
        border: '1px dashed rgba(255,255,255,0.08)',
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 12,
        color: 'rgba(255,255,255,0.35)',
      }}
    >
      Nothing here yet
    </div>
  )
}

function ColumnHeader({ stage, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {stage.pulse && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 8px rgba(255,255,255,0.6)',
            animation: 'wfPulse 1.6s ease-in-out infinite',
          }}
        />
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#ffffff',
          letterSpacing: '0.02em',
        }}
      >
        {stage.label}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          background: 'rgba(255,255,255,0.06)',
          padding: '1px 8px',
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </div>
  )
}

function ProjectCard({
  project,
  stages,
  onMove,
  onToggleChecklistItem,
  onEdit,
  onDelete,
  menuOpen,
  setMenuOpen,
}) {
  const stageIdx = stages.findIndex((s) => s.key === project.stage)
  const checklist = safeChecklist(project.checklist)
  const visibleItems = checklist.slice(0, 3)
  const remaining = checklist.length - visibleItems.length
  const isDone = project.stage === 'done'

  return (
    <motion.div
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.16)' }}
      transition={{ duration: 0.15 }}
      style={{
        background: '#1a1a1e',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '0.875rem',
        opacity: isDone ? 0.72 : 1,
        position: 'relative',
        cursor: 'default',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 13.5,
            lineHeight: 1.3,
            letterSpacing: '-0.005em',
            flex: 1,
            minWidth: 0,
            wordBreak: 'break-word',
          }}
        >
          {project.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={typePillStyle}>{project.type}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="More"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 38,
            right: 8,
            zIndex: 10,
            minWidth: 140,
            background: '#0e0e10',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              onEdit()
            }}
            style={menuItemStyle}
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              onDelete()
            }}
            style={{ ...menuItemStyle, color: '#ff8888' }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${clampProgress(project.progress)}%`,
              height: '100%',
              background: 'rgba(255,255,255,0.7)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 10.5,
            color: 'rgba(255,255,255,0.45)',
            fontWeight: 600,
            minWidth: 30,
            textAlign: 'right',
            letterSpacing: '0.02em',
          }}
        >
          {clampProgress(project.progress)}%
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.45,
            marginBottom: 10,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {project.description}
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            marginBottom: 10,
          }}
        >
          {visibleItems.map((it, idx) => (
            <button
              key={`${it.text}-${idx}`}
              type="button"
              onClick={() => onToggleChecklistItem(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '3px 0',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: it.done
                    ? 'rgba(255,255,255,0.85)'
                    : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.15s ease',
                }}
              >
                {it.done && <Check size={10} color="#000" strokeWidth={3} />}
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  color: it.done
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(255,255,255,0.75)',
                  textDecoration: it.done ? 'line-through' : 'none',
                  lineHeight: 1.4,
                }}
              >
                {it.text}
              </span>
            </button>
          ))}
          {remaining > 0 && (
            <div
              style={{
                fontSize: 10.5,
                color: 'rgba(255,255,255,0.35)',
                paddingLeft: 22,
                fontWeight: 500,
              }}
            >
              + {remaining} more
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 4,
          paddingTop: 10,
          borderTop: '0.5px solid rgba(255,255,255,0.05)',
        }}
      >
        <span
          style={{
            ...typePillStyle,
            ...priorityPill(project.priority),
            fontSize: 10,
            padding: '2px 8px',
          }}
        >
          {project.priority}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={stageIdx <= 0}
            style={{
              ...iconButtonStyle,
              opacity: stageIdx <= 0 ? 0.25 : 1,
              cursor: stageIdx <= 0 ? 'not-allowed' : 'pointer',
            }}
            aria-label="Move back"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={stageIdx >= stages.length - 1}
            style={{
              ...iconButtonStyle,
              opacity: stageIdx >= stages.length - 1 ? 0.25 : 1,
              cursor:
                stageIdx >= stages.length - 1 ? 'not-allowed' : 'pointer',
            }}
            aria-label="Move forward"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

const iconButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 6,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.7)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
}

/* ---------- Modal ---------- */

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  padding: '1.5rem',
}

const modalStyle = {
  background: '#0d0d0f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: '1.75rem',
  width: '100%',
  maxWidth: 540,
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
}

function ProjectModal({ open, editing, onClose, onSaved }) {
  const isEdit = Boolean(editing)
  const blank = {
    name: '',
    type: 'personal',
    stage: 'todo',
    priority: 'medium',
    description: '',
    progress: 0,
  }
  const [form, setForm] = useState(blank)
  const [items, setItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSubmitting(false)
    if (editing) {
      setForm({
        name: editing.name || '',
        type: editing.type || 'personal',
        stage: editing.stage || 'todo',
        priority: editing.priority || 'medium',
        description: editing.description || '',
        progress: clampProgress(editing.progress),
      })
      setItems(safeChecklist(editing.checklist).map((x) => ({ ...x })))
    } else {
      setForm(blank)
      setItems([])
    }
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }))
  }
  function addItem() {
    setItems((p) => [...p, { text: '', done: false }])
  }
  function updateItem(idx, key, value) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [key]: value } : it)))
  }
  function removeItem(idx) {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    setSubmitting(true)
    const cleanItems = items
      .map((x) => ({ text: x.text.trim(), done: !!x.done }))
      .filter((x) => x.text.length)
    const payload = [
      form.name.trim(),
      form.type,
      form.stage,
      clampProgress(form.progress),
      form.priority,
      form.description.trim() || null,
      JSON.stringify(cleanItems),
    ]
    try {
      if (isEdit) {
        await db.query(
          `UPDATE workflow_projects
              SET name = $1, type = $2, stage = $3, progress = $4,
                  priority = $5, description = $6, checklist = $7::jsonb,
                  updated_at = now()
              WHERE id = $8`,
          [...payload, editing.id],
        )
      } else {
        await db.query(
          `INSERT INTO workflow_projects
            (name, type, stage, progress, priority, description, checklist)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          payload,
        )
      }
      onSaved?.()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to save project.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            style={modalStyle}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.01em',
                }}
              >
                {isEdit ? 'Edit Project' : 'Add Project'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 4,
                }}
              >
                {isEdit
                  ? 'Update details, stage, and checklist.'
                  : 'Track a business, side-project, or initiative.'}
              </div>
            </div>

            <form
              onSubmit={submit}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div>
                <div style={labelStyle}>Project Name *</div>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. AWATEC HQ"
                  required
                  autoFocus
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelStyle}>Type</div>
                  <SelectField
                    value={form.type}
                    onChange={(v) => update('type', v)}
                    options={TYPE_OPTIONS}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Priority</div>
                  <SelectField
                    value={form.priority}
                    onChange={(v) => update('priority', v)}
                    options={PRIORITY_OPTIONS}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div>
                  <div style={labelStyle}>Stage</div>
                  <SelectField
                    value={form.stage}
                    onChange={(v) => update('stage', v)}
                    options={STAGES.map((s) => ({ key: s.key, label: s.label }))}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Progress {form.progress}%</div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={form.progress}
                    onChange={(e) =>
                      update('progress', clampProgress(e.target.value))
                    }
                    style={{ width: '100%', accentColor: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <div style={labelStyle}>Description</div>
                <textarea
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Short summary of what this project is."
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ ...labelStyle, marginBottom: 0 }}>Checklist</div>
                  <button
                    type="button"
                    onClick={addItem}
                    style={ghostButtonStyle}
                  >
                    <Plus size={11} />
                    Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {items.length === 0 && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'rgba(255,255,255,0.35)',
                        fontStyle: 'italic',
                      }}
                    >
                      No items yet — break this project into steps.
                    </div>
                  )}
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateItem(idx, 'done', !it.done)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: it.done
                            ? 'rgba(255,255,255,0.85)'
                            : 'transparent',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {it.done && (
                          <Check size={11} color="#000" strokeWidth={3} />
                        )}
                      </button>
                      <input
                        style={{ ...inputStyle, padding: '8px 10px' }}
                        value={it.text}
                        onChange={(e) => updateItem(idx, 'text', e.target.value)}
                        placeholder="Step description"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        style={{
                          ...ghostButtonStyle,
                          padding: '7px 9px',
                          color: 'rgba(255,255,255,0.4)',
                        }}
                        aria-label="Remove"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: 'rgba(255, 80, 80, 0.08)',
                    border: '1px solid rgba(255, 80, 80, 0.3)',
                    color: '#ff8888',
                    padding: '8px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...addButtonStyle,
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px 20px',
                  fontSize: 13.5,
                  marginTop: 4,
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting
                  ? isEdit
                    ? 'Saving...'
                    : 'Creating...'
                  : isEdit
                    ? 'Save Changes'
                    : 'Create Project'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SelectField({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputStyle,
        appearance: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key} style={{ background: '#0d0d0f' }}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
