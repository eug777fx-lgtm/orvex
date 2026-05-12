import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import db from '@/lib/db'
import {
  Activity,
  Brain,
  PenLine,
  Video,
  Send,
  BarChart3,
  Plus,
  Check,
  X,
  Pencil,
  Sparkles,
  TrendingUp,
  CalendarClock,
  Star,
} from 'lucide-react'

// ===== Design tokens =====
const CARD_BG = 'rgba(17,17,20,0.8)'
const CARD_BORDER = '0.5px solid rgba(255,255,255,0.08)'
const SOFT_BORDER = '0.5px solid rgba(255,255,255,0.07)'
const TEXT_MUTED = 'rgba(255,255,255,0.5)'
const TEXT_FAINT = 'rgba(255,255,255,0.35)'
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, monospace"

// ===== Data =====
const BRANDS = [
  { name: 'LIMITLESS', color: '#ffffff' },
  { name: 'AWATEC', color: '#ffffff' },
]

const AGENTS = [
  {
    key: 'strategy',
    name: 'Strategy',
    color: '#ffffff',
    icon: Brain,
    pos: { left: '5%', top: '8%' },
    statuses: [
      ['Analyzing comps', '3 gaps found'],
      ['Trend scan running', 'ICT +38%'],
      ['Writing weekly brief...', ''],
    ],
  },
  {
    key: 'writer',
    name: 'Writer',
    color: '#ffffff',
    icon: PenLine,
    pos: { left: '36%', top: '8%' },
    statuses: [
      ['Polishing copy', 'Tone: confident'],
      ['Hook batch ready', '6 generated'],
      ['Caption writing', 'Brand voice on'],
    ],
  },
  {
    key: 'video',
    name: 'Video Director',
    color: '#ffffff',
    icon: Video,
    pos: { left: '67%', top: '8%' },
    statuses: [
      ['Sourcing B-roll', 'Stock library'],
      ['Building Runway brief', ''],
      ['ElevenLabs script ready', ''],
    ],
  },
  {
    key: 'distribution',
    name: 'Distribution',
    color: '#ffffff',
    icon: Send,
    pos: { left: '14%', top: '60%' },
    statuses: [
      ['Queue: 4 pending', 'Auto-post on'],
      ['Posted to Instagram', '9:00 AM'],
      ['TikTok scheduled', '3:00 PM'],
    ],
  },
  {
    key: 'analytics',
    name: 'Analytics',
    color: '#ffffff',
    icon: BarChart3,
    pos: { left: '58%', top: '60%' },
    statuses: [
      ['Top: Reel #14', 'Score 92'],
      ['Scoring 7 posts', 'avg 84'],
      ['Memory updated', 'Loop complete'],
    ],
  },
]

const AGENT_COLOR = Object.fromEntries(AGENTS.map((a) => [a.name, a.color]))

const SCHEDULE = [
  { time: '7:00', task: 'Trend scan', agent: 'Strategy', color: '#ffffff', status: 'done' },
  { time: '8:00', task: 'Write hooks', agent: 'Writer', color: '#ffffff', status: 'done' },
  { time: '9:00', task: 'Post Instagram', agent: 'Distribution', color: '#ffffff', status: 'active' },
  { time: '12:00', task: 'Video briefs', agent: 'Video', color: '#ffffff', status: 'pending' },
  { time: '3:00', task: 'Post TikTok', agent: 'Distribution', color: '#ffffff', status: 'pending' },
  { time: '8:00', task: 'Score posts', agent: 'Analytics', color: '#ffffff', status: 'pending' },
]

const INITIAL_REVIEW = [
  {
    id: 'r1',
    type: 'Hook',
    brand: 'LIMITLESS',
    text: 'The 30-second rule that filters 90% of bad leads before the call even starts.',
  },
  {
    id: 'r2',
    type: 'Caption',
    brand: 'LIMITLESS',
    text: "Most founders confuse motion with progress. Here's how to tell the difference in 60 seconds.",
  },
  {
    id: 'r3',
    type: 'Script',
    brand: 'LIMITLESS',
    text: 'Open on phone screen — 47 unread DMs. "If you\'re reading every message, you\'ve already lost."',
  },
]

const LIVE_LOG = [
  { time: '09:14', agent: 'Distribution', action: 'Posted reel to Instagram · 234 likes in 14 min' },
  { time: '09:08', agent: 'Analytics', action: 'Trend velocity dropping on "morning routine"' },
  { time: '08:52', agent: 'Writer', action: 'Generated 8 hook variations for Reel #15' },
  { time: '08:31', agent: 'Strategy', action: 'Brief approved — sent to Writer queue' },
  { time: '08:12', agent: 'Video Director', action: 'Storyboard ready for "first 90 seconds"' },
  { time: '07:04', agent: 'Strategy', action: 'Daily trend scan complete · 23 topics scored' },
]

const LOG_FEED = [
  { agent: 'Strategy', action: 'completed trend scan — ICT angle prioritized' },
  { agent: 'Writer', action: 'generated hook batch for LIMITLESS — 6 hooks ready' },
  { agent: 'Distribution', action: 'posted to Instagram — engagement tracking started' },
  { agent: 'Analytics', action: 'scored Reel #14 — 92/100 added to memory' },
  { agent: 'Writer', action: 'added 3 items to review queue' },
  { agent: 'Strategy', action: 'updated weekly brief — new campaign angle found' },
  { agent: 'Distribution', action: 'scheduled TikTok for 3:00 PM' },
  { agent: 'Analytics', action: 'updated brand memory with new top performer' },
]

const TOP_PERFORMERS = [
  { title: 'Reel · 30-second rule', score: 94 },
  { title: 'Carousel · Founder bias', score: 91 },
  { title: 'Hook · Motion vs progress', score: 87 },
]

function formatClock(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtTime(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function LoadingPulse() {
  return (
    <motion.span
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        fontSize: 10.5,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      Syncing
    </motion.span>
  )
}

function reviewItemText(item) {
  return item.hook || item.caption || item.script || '(empty)'
}

function reviewItemType(item) {
  return item.type || (item.hook ? 'hook' : item.caption ? 'caption' : item.script ? 'script' : 'item')
}

// ===== Page =====
export default function MarketingEngine() {
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [activeTab, setActiveTab] = useState('review')
  const [now, setNow] = useState(new Date())
  const [screenIndex, setScreenIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState([])
  const [schedule, setSchedule] = useState([])
  const [memory, setMemory] = useState([])
  const [stats, setStats] = useState({
    contentReady: 0,
    scheduled: 0,
    avgScore: 0,
    published: 0,
  })
  const [loading, setLoading] = useState(true)
  const [meetingAgents, setMeetingAgents] = useState([])
  const [liveLog, setLiveLog] = useState(LIVE_LOG)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, kind = 'info') => {
    setToast({ id: Date.now(), message, kind })
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setScreenIndex((i) => i + 1), 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let clearId
    const id = setInterval(() => {
      const shuffled = [...AGENTS].sort(() => Math.random() - 0.5)
      setMeetingAgents([shuffled[0].key, shuffled[1].key])
      clearId = setTimeout(() => setMeetingAgents([]), 3000)
    }, 20000)
    return () => {
      clearInterval(id)
      if (clearId) clearTimeout(clearId)
    }
  }, [])

  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      const item = LOG_FEED[i % LOG_FEED.length]
      setLiveLog((log) =>
        [{ time: nowHHMM(), agent: item.agent, action: item.action }, ...log].slice(0, 20),
      )
      i += 1
    }, 8000)
    return () => clearInterval(id)
  }, [])

  // Load brands once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await db.query(
          'SELECT id, name, color FROM brands ORDER BY created_at ASC',
        )
        if (cancelled) return
        setBrands(rows || [])
        if (rows && rows.length > 0) setSelectedBrand(rows[0])
        else setLoading(false)
      } catch (e) {
        console.error('load brands failed', e)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Refetch stats / review / schedule whenever selectedBrand changes
  const refreshBrandData = useCallback(async () => {
    if (!selectedBrand) return
    setLoading(true)
    try {
      const [
        cReadyRows,
        schedCountRows,
        publishedRows,
        avgScoreRows,
        reviewRows,
        scheduleRows,
        memoryRows,
      ] = await Promise.all([
        db.query(
          "SELECT COUNT(*)::int AS count FROM content WHERE brand_id=$1 AND status='pending'",
          [selectedBrand.id],
        ),
        db.query(
          'SELECT COUNT(*)::int AS count FROM schedules WHERE brand_id=$1 AND published=false',
          [selectedBrand.id],
        ),
        db.query(
          "SELECT COUNT(*)::int AS count FROM content WHERE brand_id=$1 AND status='published'",
          [selectedBrand.id],
        ),
        db.query(
          'SELECT AVG(score)::float AS avg FROM analytics WHERE brand_id=$1',
          [selectedBrand.id],
        ),
        db.query(
          `SELECT id, type, hook, caption, script, created_at
           FROM content
           WHERE brand_id=$1 AND status='pending'
           ORDER BY created_at DESC
           LIMIT 10`,
          [selectedBrand.id],
        ),
        db.query(
          `SELECT s.id, s.platform, s.scheduled_at, s.published, c.hook, c.caption, c.type
           FROM schedules s
           JOIN content c ON s.content_id = c.id
           WHERE s.brand_id = $1 AND s.scheduled_at > now() - interval '1 day'
           ORDER BY s.scheduled_at ASC
           LIMIT 8`,
          [selectedBrand.id],
        ),
        db.query(
          `SELECT id, memory_type, content, created_at
             FROM brand_memory
            WHERE brand_id = $1
            ORDER BY created_at DESC`,
          [selectedBrand.id],
        ),
      ])
      setStats({
        contentReady: cReadyRows?.[0]?.count ?? 0,
        scheduled: schedCountRows?.[0]?.count ?? 0,
        published: publishedRows?.[0]?.count ?? 0,
        avgScore: avgScoreRows?.[0]?.avg
          ? Math.round(avgScoreRows[0].avg)
          : 0,
      })
      setReviewItems(reviewRows || [])
      setSchedule(scheduleRows || [])
      setMemory(memoryRows || [])
    } catch (e) {
      console.error('fetch brand data failed', e)
    } finally {
      setLoading(false)
    }
  }, [selectedBrand])

  useEffect(() => {
    refreshBrandData()
  }, [refreshBrandData])

  async function approve(id) {
    try {
      await db.query("UPDATE content SET status='approved' WHERE id=$1", [id])
      setReviewItems((items) => items.filter((it) => it.id !== id))
      setStats((s) => ({
        ...s,
        contentReady: Math.max(0, s.contentReady - 1),
      }))
      showToast('Content approved — added to schedule')
    } catch (e) {
      console.error('approve failed', e)
      showToast('Approve failed', 'error')
    }
  }

  async function reject(id) {
    try {
      await db.query("UPDATE content SET status='rejected' WHERE id=$1", [id])
      setReviewItems((items) => items.filter((it) => it.id !== id))
      setStats((s) => ({
        ...s,
        contentReady: Math.max(0, s.contentReady - 1),
      }))
    } catch (e) {
      console.error('reject failed', e)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        margin: '-2rem',
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        height: 'calc(100vh - 56px)',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* ===== LEFT MAIN AREA ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <PageHeader now={now} loading={loading} />
        <BrandSelector
          brands={brands}
          selected={selectedBrand}
          onSelect={setSelectedBrand}
        />
        <StatsRow stats={stats} loading={loading} />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '12px 20px 20px',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <AgentOffice
            screenIndex={screenIndex}
            meetingAgents={meetingAgents}
            brand={selectedBrand}
            onRefresh={refreshBrandData}
            showToast={showToast}
          />
          <ScheduleStrip schedule={schedule} />
          <BrandMemory
            brand={selectedBrand}
            memory={memory}
            onRefresh={refreshBrandData}
          />
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <aside
        style={{
          borderLeft: SOFT_BORDER,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
          background: 'rgba(10,10,12,0.4)',
        }}
      >
        <Tabs active={activeTab} onChange={setActiveTab} />
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px 20px',
          }}
        >
          {activeTab === 'review' && (
            <ReviewPanel
              items={reviewItems}
              brand={selectedBrand}
              onApprove={approve}
              onReject={reject}
            />
          )}
          {activeTab === 'log' && <LogPanel entries={liveLog} />}
          {activeTab === 'stats' && <StatsPanel />}
        </div>
      </aside>

      <Toast toast={toast} />
    </motion.div>
  )
}

function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 32,
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '10px 18px',
            borderRadius: 999,
            background: 'rgba(20,20,24,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border:
              toast.kind === 'error'
                ? '0.5px solid rgba(255,255,255,0.45)'
                : '0.5px solid rgba(255,255,255,0.15)',
            color: toast.kind === 'error' ? '#ffffff' : 'rgba(255,255,255,0.92)',
            fontSize: 12.5,
            fontWeight: 500,
            letterSpacing: '0.01em',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            maxWidth: 480,
            textAlign: 'center',
          }}
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ===== Page Header =====
function PageHeader({ now, loading }) {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: SOFT_BORDER,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: '#fff',
            letterSpacing: '-0.01em',
          }}
        >
          AI Office
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
          5 agents working · always on
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {loading && <LoadingPulse />}
        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 10px rgba(255,255,255,0.7)',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '0.06em',
          }}
        >
          LIVE
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: TEXT_FAINT,
            fontFamily: MONO,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatClock(now)}
        </span>
      </div>
    </div>
  )
}

// ===== Brand Selector =====
function BrandSelector({ brands, selected, onSelect }) {
  return (
    <div
      style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
      }}
    >
      {brands.map((b) => {
        const active = selected?.id === b.id
        const color = b.color || '#ffffff'
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              borderRadius: 999,
              background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
              border: active
                ? '0.5px solid rgba(255,255,255,0.35)'
                : '0.5px solid rgba(255,255,255,0.08)',
              color: active ? '#fff' : 'rgba(255,255,255,0.65)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 6px ${color}80`,
              }}
            />
            {b.name}
          </button>
        )
      })}
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 11px',
          borderRadius: 999,
          background: 'transparent',
          border: '0.5px dashed rgba(255,255,255,0.18)',
          color: TEXT_MUTED,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Plus size={11} /> Add Brand
      </button>
    </div>
  )
}

// ===== Stats Row =====
function StatsRow({ stats, loading }) {
  const cells = [
    { label: 'Content Ready', value: stats.contentReady, sub: 'awaiting approval', accent: '#ffffff' },
    { label: 'Scheduled', value: stats.scheduled, sub: 'next 30 days', accent: '#ffffff' },
    { label: 'Avg Score', value: stats.avgScore, sub: 'AI performance', accent: '#ffffff' },
    { label: 'Published', value: stats.published, sub: 'all time', accent: '#ffffff' },
  ]
  return (
    <div
      style={{
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 10,
        opacity: loading ? 0.55 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {cells.map((s) => (
        <div
          key={s.label}
          style={{
            background: CARD_BG,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: CARD_BORDER,
            borderRadius: 12,
            padding: 14,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 22,
              height: 2,
              background: s.accent,
              borderRadius: 999,
            }}
          />
          <div
            style={{
              fontSize: 10,
              color: TEXT_MUTED,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#fff',
              marginTop: 6,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 11, color: TEXT_FAINT, marginTop: 2 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ===== Agent Office =====
const HUD_COLORS = {
  strategy: { glow: 'rgba(139,92,246,0.08)', accent: '#a78bfa', soft: 'rgba(139,92,246,0.5)' },
  writer: { glow: 'rgba(6,182,212,0.08)', accent: '#22d3ee', soft: 'rgba(6,182,212,0.5)' },
  video: { glow: 'rgba(251,191,36,0.08)', accent: '#fbbf24', soft: 'rgba(251,191,36,0.5)' },
  distribution: { glow: 'rgba(74,222,128,0.08)', accent: '#4ade80', soft: 'rgba(74,222,128,0.5)' },
  analytics: { glow: 'rgba(248,113,113,0.08)', accent: '#f87171', soft: 'rgba(248,113,113,0.5)' },
}

const sectionLabelStyle = {
  fontSize: 9,
  color: 'rgba(255,255,255,0.12)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 600,
  marginBottom: 6,
}

const LINES = [
  { x1: 17, y1: 28, x2: 50, y2: 28, dur: 3.0, delay: 0 },
  { x1: 50, y1: 28, x2: 83, y2: 28, dur: 3.2, delay: 0.7 },
  { x1: 17, y1: 28, x2: 28, y2: 82, dur: 3.6, delay: 1.3 },
  { x1: 72, y1: 82, x2: 17, y2: 28, dur: 4.0, delay: 1.9 },
]

async function callAgent(brandId, agentType) {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_id: brandId, agent_type: agentType }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'agent_failed' }))
    throw new Error(err.error || 'agent_failed')
  }
  return res.json()
}

function countItemsAdded(data) {
  const o = data?.output
  if (!o) return 0
  const hooks = Array.isArray(o.hooks) ? o.hooks.length : 0
  const captions = Array.isArray(o.captions) ? o.captions.length : 0
  return hooks + captions
}

function AuroraBackground() {
  const auroras = [
    {
      background: 'radial-gradient(ellipse 60% 40% at 20% 50%, rgba(139,92,246,0.06) 0%, transparent 60%)',
      dur: 10,
      dx: 30,
      dy: -20,
    },
    {
      background: 'radial-gradient(ellipse 40% 60% at 80% 30%, rgba(6,182,212,0.06) 0%, transparent 60%)',
      dur: 12,
      dx: -25,
      dy: 22,
    },
    {
      background: 'radial-gradient(ellipse 50% 50% at 50% 80%, rgba(255,255,255,0.03) 0%, transparent 50%)',
      dur: 8,
      dx: 18,
      dy: 14,
    },
  ]
  return (
    <>
      {auroras.map((a, i) => (
        <motion.div
          key={i}
          aria-hidden
          animate={{ x: [0, a.dx, 0], y: [0, a.dy, 0] }}
          transition={{ duration: a.dur, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            background: a.background,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ))}
    </>
  )
}

function ScanLines() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

function ActivityPulse() {
  return (
    <motion.span
      aria-hidden
      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#ffffff',
        boxShadow: '0 0 8px rgba(255,255,255,0.5)',
        flexShrink: 0,
      }}
    />
  )
}

function ConnectingLines({ allHands }) {
  const stroke = allHands ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'
  return (
    <svg
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {LINES.map((l, i) => (
        <g key={i}>
          <line
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={stroke}
            strokeWidth={0.4}
            strokeDasharray="2 2"
          />
          <motion.circle
            r={0.7}
            fill="white"
            opacity={allHands ? 0.7 : 0.4}
            animate={{ cx: [l.x1, l.x2], cy: [l.y1, l.y2] }}
            transition={{
              duration: l.dur,
              repeat: Infinity,
              ease: 'linear',
              delay: l.delay,
            }}
          />
        </g>
      ))}
    </svg>
  )
}

function MeetingTable({ allHands, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={{
        boxShadow: allHands
          ? '0 0 20px rgba(255,255,255,0.18)'
          : '0 0 0px rgba(255,255,255,0)',
        borderColor: allHands ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)',
        backgroundColor: allHands ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
      }}
      transition={{ duration: 0.3 }}
      style={{
        width: 80,
        height: 40,
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        flexShrink: 0,
        fontWeight: 600,
      }}
    >
      <AnimatePresence mode="wait">
        {allHands ? (
          <motion.span
            key="all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, color: '#fff' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            All Hands
          </motion.span>
        ) : (
          <motion.span
            key="meet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            Meeting
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function AgentOffice({ screenIndex, meetingAgents, brand, onRefresh, showToast }) {
  const [allHands, setAllHands] = useState(false)
  const [runAllStep, setRunAllStep] = useState(null)

  function triggerAllHands() {
    if (allHands) return
    setAllHands(true)
    setTimeout(() => setAllHands(false), 4000)
  }

  async function handleRunAll() {
    if (!brand || runAllStep) return
    try {
      setRunAllStep('strategy')
      await callAgent(brand.id, 'strategy')
      showToast?.('Strategy Agent finished')
      await new Promise((r) => setTimeout(r, 2000))
      setRunAllStep('writer')
      const writerData = await callAgent(brand.id, 'writer')
      const added = countItemsAdded(writerData)
      showToast?.(`Writer Agent finished — ${added} items added to queue`)
      setRunAllStep(null)
      onRefresh?.()
    } catch (e) {
      console.error('run all failed', e)
      showToast?.('Run All failed', 'error')
      setRunAllStep(null)
    }
  }

  const topAgents = AGENTS.slice(0, 3)
  const bottomAgents = AGENTS.slice(3)

  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: 0,
        overflow: 'hidden',
        minHeight: 480,
        flexShrink: 0,
      }}
    >
      <AuroraBackground />
      <ScanLines />

      {/* Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '16px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            Agent Network
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 2,
            }}
          >
            5 nodes active
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RunAllButton
            disabled={!brand || !!runAllStep}
            step={runAllStep}
            onClick={handleRunAll}
          />
          <ActivityPulse />
        </div>
      </div>

      {/* Cards area */}
      <div style={{ position: 'relative', zIndex: 1, padding: 20 }}>
        <ConnectingLines allHands={allHands} />

        <div style={sectionLabelStyle}>CREATIVE CLUSTER</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {topAgents.map((agent, i) => (
            <HUDAgentCard
              key={agent.key}
              agent={agent}
              index={i}
              screenIndex={screenIndex}
              inMeeting={allHands || meetingAgents.includes(agent.key)}
              brand={brand}
              onRefresh={onRefresh}
              showToast={showToast}
            />
          ))}
        </div>

        <div style={{ ...sectionLabelStyle, marginTop: 20 }}>OPS CLUSTER</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: 12,
            marginTop: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <HUDAgentCard
              agent={bottomAgents[0]}
              index={3}
              screenIndex={screenIndex}
              inMeeting={allHands || meetingAgents.includes(bottomAgents[0].key)}
              brand={brand}
              onRefresh={onRefresh}
              showToast={showToast}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MeetingTable allHands={allHands} onClick={triggerAllHands} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <HUDAgentCard
              agent={bottomAgents[1]}
              index={4}
              screenIndex={screenIndex}
              inMeeting={allHands || meetingAgents.includes(bottomAgents[1].key)}
              brand={brand}
              onRefresh={onRefresh}
              showToast={showToast}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function RunAllButton({ disabled, step, onClick }) {
  const [hover, setHover] = useState(false)
  const running = !!step
  const label = running
    ? step === 'strategy'
      ? 'Running 1/2 · Strategy'
      : 'Running 2/2 · Writer'
    : 'Run All'
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        padding: '3px 10px',
        borderRadius: 999,
        border: '0.5px solid rgba(255,255,255,0.18)',
        background: hover && !disabled ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: disabled ? 'rgba(255,255,255,0.3)' : hover ? '#fff' : 'rgba(255,255,255,0.65)',
        letterSpacing: '0.04em',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {running && (
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
          }}
        />
      )}
      {label}
    </button>
  )
}

function RunButton({ disabled, running, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 9,
        padding: '3px 8px',
        borderRadius: 999,
        border: '0.5px solid rgba(255,255,255,0.15)',
        background: hover && !disabled ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: disabled ? 'rgba(255,255,255,0.25)' : hover ? '#fff' : 'rgba(255,255,255,0.5)',
        letterSpacing: '0.04em',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginTop: 4,
        alignSelf: 'flex-start',
        transition: 'all 0.15s ease',
      }}
    >
      {running ? 'Running' : 'Run'}
    </button>
  )
}

function HUDAgentCard({
  agent,
  index,
  screenIndex,
  inMeeting,
  brand,
  onRefresh,
  showToast,
}) {
  const colors = HUD_COLORS[agent.key] || {
    glow: 'rgba(255,255,255,0.06)',
    accent: '#ffffff',
    soft: 'rgba(255,255,255,0.4)',
  }
  const Icon = agent.icon
  const status = agent.statuses[screenIndex % agent.statuses.length]
  const [hover, setHover] = useState(false)
  const [runStatus, setRunStatus] = useState('idle')
  const [progress, setProgress] = useState(40 + index * 8)

  useEffect(() => {
    const id = setInterval(() => {
      setProgress(40 + Math.random() * 50)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  async function handleRun(e) {
    e?.stopPropagation?.()
    if (!brand || runStatus === 'running') return
    setRunStatus('running')
    try {
      const data = await callAgent(brand.id, agent.key)
      setRunStatus('success')
      const added = countItemsAdded(data)
      showToast?.(
        added > 0
          ? `${agent.name} Agent finished — ${added} items added to queue`
          : `${agent.name} Agent finished`,
      )
      if (agent.key === 'writer' || agent.key === 'strategy') {
        onRefresh?.()
      }
      setTimeout(() => setRunStatus('idle'), 3000)
    } catch (err) {
      console.error(`${agent.key} run failed`, err)
      setRunStatus('error')
      showToast?.(`${agent.name} Agent failed — retry`, 'error')
      setTimeout(() => setRunStatus('idle'), 3000)
    }
  }

  const isRunning = runStatus === 'running'
  const isSuccess = runStatus === 'success'
  const isError = runStatus === 'error'

  const borderColor = inMeeting
    ? 'rgba(255,255,255,0.4)'
    : isSuccess
    ? 'rgba(255,255,255,0.5)'
    : isError
    ? 'rgba(255,255,255,0.35)'
    : hover
    ? 'rgba(255,255,255,0.18)'
    : 'rgba(255,255,255,0.08)'

  const cardShadow = inMeeting
    ? '0 0 20px rgba(255,255,255,0.15)'
    : isSuccess
    ? '0 0 14px rgba(255,255,255,0.18)'
    : 'none'

  function renderScreen() {
    if (isRunning) {
      return (
        <>
          <div>
            <span style={{ color: colors.accent, fontWeight: 600 }}>Running</span>{' '}
            agent task...
          </div>
          <div>
            <span style={{ color: colors.accent, opacity: 0.7 }}>{'> '}</span>
            awaiting response
          </div>
        </>
      )
    }
    if (isSuccess) {
      return (
        <>
          <div>
            <span style={{ color: colors.accent, fontWeight: 600 }}>Complete</span>{' '}
            — task done ✓
          </div>
          <div>
            <span style={{ color: colors.accent, opacity: 0.7 }}>{'> '}</span>
            data updated
          </div>
        </>
      )
    }
    if (isError) {
      return (
        <>
          <div>
            <span style={{ color: colors.accent, fontWeight: 600 }}>Error</span>{' '}
            — task failed
          </div>
          <div>
            <span style={{ color: colors.accent, opacity: 0.7 }}>{'> '}</span>
            tap retry
          </div>
        </>
      )
    }
    const parts0 = (status[0] || '').split(' ')
    const parts1 = (status[1] || '').split(' ')
    const first0 = parts0[0] || ''
    const rest0 = parts0.slice(1).join(' ')
    const first1 = parts1[0] || ''
    const rest1 = parts1.slice(1).join(' ')
    return (
      <>
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: colors.accent, fontWeight: 600 }}>{first0}</span>
          {rest0 && ' '}
          {rest0}
        </div>
        {status[1] && (
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: colors.accent, opacity: 0.7 }}>{first1}</span>
            {rest1 && ' '}
            {rest1}
          </div>
        )}
      </>
    )
  }

  return (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      animate={{
        y: hover ? -2 : 0,
        backgroundColor: hover
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.03)',
        borderColor,
        boxShadow: cardShadow,
      }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 16,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Top glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: `linear-gradient(to bottom, ${colors.glow}, transparent)`,
          borderRadius: '16px 16px 0 0',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Floating orb */}
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.4,
          }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: colors.accent,
            boxShadow: `0 0 8px ${colors.accent}, 0 0 16px ${colors.soft}`,
            margin: '0 auto 10px',
          }}
        />

        {/* Top row: icon + name + status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <Icon size={14} color={colors.accent} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.name}
            </span>
          </div>
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.2,
            }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: colors.accent,
              boxShadow: `0 0 6px ${colors.accent}`,
              flexShrink: 0,
            }}
          />
        </div>

        {/* Activity screen */}
        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '8px 10px',
            marginTop: 10,
            minHeight: 52,
            fontFamily: MONO,
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={
                isRunning
                  ? 'run'
                  : isSuccess
                  ? 'ok'
                  : isError
                  ? 'err'
                  : `s-${screenIndex % agent.statuses.length}`
              }
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom row: progress + Run button */}
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 2,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              style={{
                height: '100%',
                background: colors.accent,
                borderRadius: 999,
              }}
            />
          </div>
          <RunButton
            disabled={!brand || isRunning}
            running={isRunning}
            onClick={handleRun}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ===== Schedule Strip =====
function ScheduleStrip({ schedule }) {
  const usingFallback = !schedule || schedule.length === 0
  const rows = usingFallback
    ? SCHEDULE
    : schedule.map((s) => ({
        time: fmtTime(s.scheduled_at),
        task: s.hook || s.caption || s.platform || s.type || 'Scheduled post',
        agent: (s.platform || 'Post').toString(),
        color: '#ffffff',
        status: s.published ? 'done' : 'pending',
      }))
  return (
    <div
      style={{
        background: CARD_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: CARD_BORDER,
        borderRadius: 16,
        padding: 16,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <CalendarClock size={13} color={TEXT_MUTED} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          Today's Schedule
        </span>
        {usingFallback && (
          <span
            style={{
              fontSize: 9.5,
              color: TEXT_FAINT,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            sample
          </span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {rows.map((row, i) => {
          const done = row.status === 'done'
          const active = row.status === 'active'
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '10px 12px',
                minWidth: 140,
                borderRadius: 10,
                background: active
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: active
                  ? '0.5px solid rgba(255,255,255,0.3)'
                  : '0.5px solid rgba(255,255,255,0.06)',
                opacity: done ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  color: active ? '#ffffff' : TEXT_MUTED,
                  fontFamily: MONO,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                }}
              >
                {row.time}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: '#fff',
                  fontWeight: 500,
                  textDecoration: done ? 'line-through' : 'none',
                }}
              >
                {row.task}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: `${row.color}14`,
                  border: `0.5px solid ${row.color}33`,
                  color: row.color,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  alignSelf: 'flex-start',
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: row.color,
                  }}
                />
                {row.agent}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== Brand Memory =====
const MEMORY_TYPES = [
  { key: 'voice_rules', title: 'Voice Rules', color: '#ffffff', tint: 'rgba(255,255,255,0.12)' },
  { key: 'audience', title: 'Audience', color: '#ffffff', tint: 'rgba(255,255,255,0.12)' },
  { key: 'top_performers', title: 'Top Performers', color: '#ffffff', tint: 'rgba(255,255,255,0.12)' },
  { key: 'campaign_history', title: 'Campaign History', color: '#ffffff', tint: 'rgba(255,255,255,0.12)' },
]

function BrandMemory({ brand, memory, onRefresh }) {
  const [adding, setAdding] = useState(false)
  const [memoryType, setMemoryType] = useState('voice_rules')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const grouped = MEMORY_TYPES.reduce((acc, t) => {
    acc[t.key] = (memory || []).filter((m) => m.memory_type === t.key)
    return acc
  }, {})

  async function save() {
    const trimmed = content.trim()
    if (!brand || !trimmed) return
    setSaving(true)
    try {
      await db.query(
        'INSERT INTO brand_memory (brand_id, memory_type, content) VALUES ($1, $2, $3)',
        [brand.id, memoryType, trimmed],
      )
      setContent('')
      setAdding(false)
      onRefresh?.()
    } catch (e) {
      console.error('memory insert failed', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background: CARD_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: CARD_BORDER,
        borderRadius: 16,
        padding: 16,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Brain size={13} color="#ffffff" />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              Brand Memory
              <span
                style={{
                  fontSize: 10,
                  color: TEXT_FAINT,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                }}
              >
                · {(memory || []).length} {memory.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
              What the AI knows about this brand
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          style={{
            fontSize: 10.5,
            padding: '4px 10px',
            borderRadius: 999,
            border: '0.5px solid rgba(255,255,255,0.12)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            fontWeight: 500,
          }}
        >
          {adding ? 'Close' : 'Edit'}
        </button>
      </div>

      {(memory || []).length === 0 ? (
        <div
          style={{
            padding: 18,
            textAlign: 'center',
            color: TEXT_MUTED,
            fontSize: 12,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            border: '0.5px dashed rgba(255,255,255,0.08)',
          }}
        >
          No memory yet — run the Strategy Agent to start building.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {MEMORY_TYPES.map((t) => {
            const items = grouped[t.key] || []
            const preview = items[0]?.content || ''
            return (
              <div
                key={t.key}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: t.tint,
                  border: `0.5px solid ${t.color}33`,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 84,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10.5,
                      color: t.color,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.title}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.4)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'rgba(255,255,255,0.78)',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  {preview || (
                    <span style={{ color: TEXT_FAINT, fontStyle: 'italic' }}>
                      empty
                    </span>
                  )}
                </div>
                {items.length > 1 && (
                  <span
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: t.color,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                    }}
                  >
                    View all →
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={!brand}
            style={{
              alignSelf: 'flex-start',
              fontSize: 11,
              padding: '5px 12px',
              borderRadius: 999,
              border: '0.5px dashed rgba(255,255,255,0.18)',
              background: 'transparent',
              color: brand ? TEXT_MUTED : TEXT_FAINT,
              cursor: brand ? 'pointer' : 'not-allowed',
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            + Add Memory
          </button>
        )}

        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 12,
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: TEXT_MUTED, minWidth: 60 }}>
                  Type
                </span>
                <select
                  value={memoryType}
                  onChange={(e) => setMemoryType(e.target.value)}
                  style={{
                    flex: 1,
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    outline: 'none',
                  }}
                >
                  {MEMORY_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a fact, rule, or insight the agents should remember..."
                rows={3}
                style={{
                  width: '100%',
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 8,
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !content.trim() || !brand}
                  style={{
                    fontSize: 11,
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: saving || !content.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !content.trim() ? 0.55 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false)
                    setContent('')
                  }}
                  style={{
                    fontSize: 11,
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: TEXT_MUTED,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ===== Right: Tabs =====
function Tabs({ active, onChange }) {
  const tabs = [
    { key: 'review', label: 'Review' },
    { key: 'log', label: 'Live Log' },
    { key: 'stats', label: 'Stats' },
  ]
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        borderBottom: SOFT_BORDER,
      }}
    >
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              padding: '14px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? '1.5px solid #ffffff'
                : '1.5px solid transparent',
              marginBottom: '-0.5px',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ===== Right: Review =====
function ReviewPanel({ items, brand, onApprove, onReject }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
        }}
      >
        <Sparkles size={11} color="#ffffff" />
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
          Generated overnight · needs your approval
        </span>
      </div>
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
            transition={{ duration: 0.22 }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.12)',
                  border: '0.5px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                }}
              >
                {reviewItemType(it).toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: TEXT_FAINT,
                  letterSpacing: '0.05em',
                }}
              >
                {brand?.name || ''}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.5,
              }}
            >
              {reviewItemText(it)}
            </p>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => onApprove(it.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 9px',
                  borderRadius: 7,
                  background: 'rgba(255,255,255,0.1)',
                  border: '0.5px solid rgba(255,255,255,0.4)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Check size={10} /> Approve
              </button>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 9px',
                  borderRadius: 7,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={10} /> Edit
              </button>
              <button
                type="button"
                onClick={() => onReject(it.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 9px',
                  borderRadius: 7,
                  background: 'transparent',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: TEXT_MUTED,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                <X size={10} /> Reject
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            color: TEXT_MUTED,
            fontSize: 12,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            border: '0.5px dashed rgba(255,255,255,0.08)',
          }}
        >
          All caught up — agents are drafting more.
        </div>
      )}
    </div>
  )
}

// ===== Right: Log =====
function LogPanel({ entries }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <AnimatePresence initial={false}>
        {entries.map((entry, i) => {
          const color = AGENT_COLOR[entry.agent] || '#fff'
          return (
            <motion.div
              key={`${entry.time}-${i}-${entry.action.slice(0, 16)}`}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '38px 1fr',
                gap: 8,
                padding: '9px 2px',
                borderBottom:
                  i === entries.length - 1
                    ? 'none'
                    : '0.5px solid rgba(255,255,255,0.04)',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: TEXT_FAINT,
                  fontFamily: MONO,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {entry.time}
              </span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  {entry.agent}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: TEXT_MUTED,
                    lineHeight: 1.4,
                  }}
                >
                  {entry.action}
                </span>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ===== Right: Stats =====
function StatsPanel() {
  const cells = [
    { label: 'Engagement', value: '12.4%', sub: '+2.1% wk', accent: '#ffffff' },
    { label: 'Reach', value: '184K', sub: '7-day', accent: '#ffffff' },
    { label: 'Saves', value: '2.3K', sub: '/1K views', accent: '#ffffff' },
    { label: 'Followers', value: '+312', sub: 'this week', accent: '#ffffff' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 18,
                height: 2,
                background: c.accent,
                borderRadius: 999,
              }}
            />
            <div
              style={{
                fontSize: 9.5,
                color: TEXT_MUTED,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 500,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 18,
                color: '#fff',
                fontWeight: 500,
                marginTop: 4,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </div>
            <div style={{ fontSize: 10, color: TEXT_FAINT, marginTop: 2 }}>
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
          }}
        >
          <TrendingUp size={11} color="#ffffff" />
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>Top performers</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {TOP_PERFORMERS.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '8px 2px',
                borderBottom:
                  i === TOP_PERFORMERS.length - 1
                    ? 'none'
                    : '0.5px solid rgba(255,255,255,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <Star size={10} color="#ffffff" fill="#ffffff" />
                <span
                  style={{
                    fontSize: 11.5,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.title}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: '#ffffff',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
