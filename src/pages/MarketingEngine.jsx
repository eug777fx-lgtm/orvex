import { useCallback, useEffect, useRef, useState } from 'react'
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
  ChevronUp,
  ChevronDown,
  Recycle,
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
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  async function repurpose() {
    if (!selectedBrand) return
    showToast('Repurposing to 4 platforms...')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand.id,
          agent_type: 'repurpose',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'failed' }))
        throw new Error(err.error || 'repurpose failed')
      }
      const data = await res.json()
      const n = data.items_created || data.items_generated || 4
      showToast(`Repurposed — ${n} new items added to queue`)
      refreshBrandData()
    } catch (e) {
      console.error('repurpose failed', e)
      showToast(
        e.message === 'no approved content to repurpose'
          ? 'No approved content yet — approve a piece first'
          : 'Repurpose failed',
        'error',
      )
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
        gridTemplateColumns: '1fr',
        height: 'calc(100vh - 56px)',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* ===== MAIN AREA ===== */}
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
            paddingBottom: 60,
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
            now={now}
          />
          <ScheduleStrip brand={selectedBrand} />
          <BrandMemory
            brand={selectedBrand}
            memory={memory}
            onRefresh={refreshBrandData}
          />
        </div>
      </div>

      <BottomDrawer
        open={drawerOpen}
        onToggle={() => setDrawerOpen((o) => !o)}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t)
          setDrawerOpen(true)
        }}
        reviewCount={reviewItems.length}
      >
        {activeTab === 'review' && (
          <ReviewPanel
            items={reviewItems}
            brand={selectedBrand}
            onApprove={approve}
            onReject={reject}
            onRepurpose={repurpose}
            wide
          />
        )}
        {activeTab === 'log' && <LogPanel entries={liveLog} wide />}
        {activeTab === 'stats' && <StatsPanel wide />}
      </BottomDrawer>

      <Toast toast={toast} drawerOpen={drawerOpen} />
    </motion.div>
  )
}

function BottomDrawer({ open, onToggle, activeTab, onTabChange, reviewCount, children }) {
  const tabs = [
    { key: 'review', label: 'Review', badge: reviewCount },
    { key: 'log', label: 'Live Log' },
    { key: 'stats', label: 'Stats' },
  ]
  return (
    <>
      {/* Drawer panel — slides up */}
      <motion.div
        initial={false}
        animate={{ y: open ? 0 : 380 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 48,
          left: 0,
          right: 0,
          zIndex: 49,
          height: 380,
          background: 'rgba(10,10,12,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          padding: '16px 24px',
          overflowY: 'auto',
        }}
      >
        {children}
      </motion.div>

      {/* Trigger bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: 48,
          background: 'rgba(10,10,12,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '0.5px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {tabs.map((t) => {
            const isActive = t.key === activeTab
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onTabChange(t.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 0',
                  cursor: 'pointer',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: '0.01em',
                  transition: 'color 0.15s ease',
                }}
              >
                {t.label}
                {t.key === 'review' && typeof t.badge === 'number' && t.badge > 0 && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 16,
                      height: 16,
                      padding: '0 5px',
                      borderRadius: 999,
                      background: isActive
                        ? 'rgba(255,255,255,0.18)'
                        : 'rgba(255,255,255,0.08)',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontSize: 10,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '4px 0',
          }}
        >
          {open ? 'Hide' : 'Show'}
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
    </>
  )
}

function Toast({ toast, drawerOpen }) {
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
            bottom: drawerOpen ? 440 : 64,
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

const DESK_POSITIONS = {
  strategy: { left: '8%', top: '12%' },
  writer: { left: '38%', top: '12%' },
  video: { left: '68%', top: '12%' },
  distribution: { left: '18%', top: '62%' },
  analytics: { left: '62%', top: '62%' },
}

const HOME_POSITIONS = {
  strategy: { left: '6%', top: '18%' },
  writer: { left: '36%', top: '18%' },
  video: { left: '66%', top: '18%' },
  distribution: { left: '16%', top: '68%' },
  analytics: { left: '60%', top: '68%' },
}

const MEETING_POSITIONS = {
  strategy: { left: '40%', top: '40%' },
  writer: { left: '54%', top: '40%' },
  video: { left: '36%', top: '50%' },
  distribution: { left: '57%', top: '50%' },
  analytics: { left: '47%', top: '58%' },
}

const ROOM_RECTS = [
  { name: 'Content Room', left: '2%', top: '4%', width: '28%', height: '42%' },
  { name: 'Production', left: '36%', top: '4%', width: '26%', height: '42%' },
  { name: 'Strategy Room', left: '68%', top: '4%', width: '28%', height: '42%' },
  { name: 'Ops Row', left: '2%', top: '54%', width: '94%', height: '40%' },
]

const CHAIR_DOTS = [
  { left: '50%', top: '38%' },
  { left: '50%', top: '62%' },
  { left: '40%', top: '50%' },
  { left: '60%', top: '50%' },
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
        background: '#10b981',
        boxShadow: '0 0 10px rgba(16,185,129,0.7)',
        flexShrink: 0,
      }}
    />
  )
}

function MeetingPiece({ active, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={{
        boxShadow: active
          ? '0 0 20px rgba(255,255,255,0.15)'
          : '0 0 0px rgba(255,255,255,0)',
        borderColor: active
          ? 'rgba(255,255,255,0.35)'
          : 'rgba(255,255,255,0.1)',
        backgroundColor: active
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.03)',
      }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 70,
        height: 44,
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 8,
        color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        cursor: 'pointer',
        fontWeight: 600,
        zIndex: 4,
      }}
    >
      <AnimatePresence mode="wait">
        {active ? (
          <motion.span
            key="all"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            Meet
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

function Desk({ agent }) {
  const colors = HUD_COLORS[agent.key] || { accent: '#ffffff' }
  const pos = DESK_POSITIONS[agent.key]
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: pos.left,
        top: pos.top,
        width: 52,
        height: 36,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 36,
          height: 20,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: colors.accent,
            boxShadow: `0 0 3px ${colors.accent}`,
          }}
        />
      </div>
    </div>
  )
}

function ChairDots() {
  return (
    <>
      {CHAIR_DOTS.map((c, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            left: c.left,
            top: c.top,
            transform: 'translate(-50%, -50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

function AgentCharacter({ agent, position, mode, screenIndex }) {
  const colors = HUD_COLORS[agent.key] || { accent: '#ffffff' }
  const status = agent.statuses[screenIndex % agent.statuses.length]
  const [hover, setHover] = useState(false)
  const isAtDesk = mode === 'desk'
  const isMeetingWalk = mode === 'meeting-walk'
  const bubble = isMeetingWalk ? 'Checking in...' : status[0] || ''

  return (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      animate={{
        left: position.left,
        top: position.top,
      }}
      transition={{ duration: 1.8, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        pointerEvents: 'auto',
      }}
    >
      {/* Thought bubble */}
      <motion.div
        animate={{ opacity: hover || isMeetingWalk ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          top: -22,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20,20,28,0.95)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '3px 7px',
          fontSize: 8,
          color: 'rgba(255,255,255,0.6)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {bubble}
      </motion.div>

      {/* Body (bob when at desk, lean when walking) */}
      <motion.div
        animate={
          isAtDesk
            ? { y: [0, -2, 0], rotate: 0 }
            : { y: 0, rotate: [-3, 3, -3] }
        }
        transition={{
          duration: isAtDesk ? 0.8 : 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: colors.accent,
            boxShadow: `0 0 6px ${colors.accent}`,
          }}
        />
        <div
          style={{
            width: 14,
            height: 9,
            borderRadius: 3,
            background: colors.accent,
            opacity: 0.5,
            marginTop: 1,
          }}
        />
      </motion.div>

      {/* Name tag */}
      <div
        style={{
          fontSize: 8,
          color: 'rgba(255,255,255,0.5)',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 999,
          padding: '1px 5px',
          marginTop: 2,
          whiteSpace: 'nowrap',
        }}
      >
        {agent.name}
      </div>
    </motion.div>
  )
}

function AgentInfoPill({ agent, screenIndex, brand, onRefresh, showToast }) {
  const colors = HUD_COLORS[agent.key] || { accent: '#ffffff' }
  const status = agent.statuses[screenIndex % agent.statuses.length]
  const [runStatus, setRunStatus] = useState('idle')
  const [hover, setHover] = useState(false)

  async function handleRun() {
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
      if (agent.key === 'writer' || agent.key === 'strategy') onRefresh?.()
      setTimeout(() => setRunStatus('idle'), 3000)
    } catch (e) {
      console.error(`${agent.key} run failed`, e)
      setRunStatus('error')
      showToast?.(`${agent.name} Agent failed — retry`, 'error')
      setTimeout(() => setRunStatus('idle'), 3000)
    }
  }

  const isRunning = runStatus === 'running'
  const statusLabel = isRunning
    ? 'Running...'
    : runStatus === 'success'
    ? 'Complete ✓'
    : runStatus === 'error'
    ? 'Error — retry'
    : status[0] || ''

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
        minWidth: 220,
      }}
    >
      <motion.span
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors.accent,
          boxShadow: `0 0 6px ${colors.accent}`,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          minWidth: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#fff',
            whiteSpace: 'nowrap',
          }}
        >
          {agent.name}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {statusLabel}
        </span>
      </div>
      <button
        type="button"
        onClick={handleRun}
        disabled={!brand || isRunning}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          fontSize: 9,
          padding: '3px 8px',
          borderRadius: 999,
          border: '0.5px solid rgba(255,255,255,0.15)',
          background:
            hover && !isRunning && brand
              ? 'rgba(255,255,255,0.06)'
              : 'transparent',
          color:
            !brand || isRunning
              ? 'rgba(255,255,255,0.25)'
              : hover
              ? '#fff'
              : 'rgba(255,255,255,0.5)',
          fontWeight: 500,
          letterSpacing: '0.04em',
          cursor: !brand || isRunning ? 'not-allowed' : 'pointer',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {isRunning ? '...' : 'Run'}
      </button>
    </div>
  )
}

function AgentOffice({ screenIndex, meetingAgents, brand, onRefresh, showToast, now }) {
  const [agentPositions, setAgentPositions] = useState(() => ({ ...HOME_POSITIONS }))
  const [agentModes, setAgentModes] = useState(() =>
    Object.fromEntries(AGENTS.map((a) => [a.key, 'wandering'])),
  )
  const [meetingActive, setMeetingActive] = useState(false)
  const [runAllStep, setRunAllStep] = useState(null)
  const meetingActiveRef = useRef(false)
  meetingActiveRef.current = meetingActive

  function triggerMeeting() {
    if (meetingActiveRef.current) return
    setMeetingActive(true)
    setAgentPositions({ ...MEETING_POSITIONS })
    setAgentModes(Object.fromEntries(AGENTS.map((a) => [a.key, 'meeting'])))
    setTimeout(() => {
      setMeetingActive(false)
      setAgentPositions({ ...HOME_POSITIONS })
      setAgentModes(Object.fromEntries(AGENTS.map((a) => [a.key, 'wandering'])))
    }, 5000)
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

  // Wandering: per-agent setTimeout chain every 4-7s
  useEffect(() => {
    const wanderTimers = {}

    function scheduleWander(agentKey) {
      const delay = 4000 + Math.random() * 3000
      wanderTimers[agentKey] = setTimeout(() => {
        if (meetingActiveRef.current) {
          scheduleWander(agentKey)
          return
        }
        const base = HOME_POSITIONS[agentKey]
        const bL = parseFloat(base.left)
        const bT = parseFloat(base.top)
        setAgentPositions((prev) => ({
          ...prev,
          [agentKey]: {
            left: `${(bL + (Math.random() - 0.5) * 10).toFixed(1)}%`,
            top: `${(bT + (Math.random() - 0.5) * 10).toFixed(1)}%`,
          },
        }))
        setAgentModes((prev) => ({ ...prev, [agentKey]: 'wandering' }))
        scheduleWander(agentKey)
      }, delay)
    }

    AGENTS.forEach((a) => scheduleWander(a.key))
    return () => Object.values(wanderTimers).forEach(clearTimeout)
  }, [])

  // Desk visit every 12s per agent (returns to desk for 3s)
  useEffect(() => {
    const cleanup = []
    AGENTS.forEach((agent) => {
      const intervalId = setInterval(() => {
        if (meetingActiveRef.current) return
        setAgentPositions((prev) => ({ ...prev, [agent.key]: DESK_POSITIONS[agent.key] }))
        setAgentModes((prev) => ({ ...prev, [agent.key]: 'desk' }))
        const returnId = setTimeout(() => {
          if (meetingActiveRef.current) return
          setAgentPositions((prev) => ({ ...prev, [agent.key]: HOME_POSITIONS[agent.key] }))
          setAgentModes((prev) => ({ ...prev, [agent.key]: 'wandering' }))
        }, 3000)
        cleanup.push(() => clearTimeout(returnId))
      }, 12000)
      cleanup.push(() => clearInterval(intervalId))
    })
    return () => cleanup.forEach((fn) => fn())
  }, [])

  // Cross-room walk every 25s — one random agent visits the meeting table
  useEffect(() => {
    const cleanup = []
    const intervalId = setInterval(() => {
      if (meetingActiveRef.current) return
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      setAgentPositions((prev) => ({
        ...prev,
        [agent.key]: { left: '47%', top: '47%' },
      }))
      setAgentModes((prev) => ({ ...prev, [agent.key]: 'meeting-walk' }))
      const returnId = setTimeout(() => {
        if (meetingActiveRef.current) return
        setAgentPositions((prev) => ({ ...prev, [agent.key]: HOME_POSITIONS[agent.key] }))
        setAgentModes((prev) => ({ ...prev, [agent.key]: 'wandering' }))
      }, 4000)
      cleanup.push(() => clearTimeout(returnId))
    }, 25000)
    cleanup.push(() => clearInterval(intervalId))
    return () => cleanup.forEach((fn) => fn())
  }, [])

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            AI Office
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.1)',
              border: '0.5px solid rgba(16,185,129,0.3)',
              color: '#10b981',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            5 AGENTS ACTIVE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: MONO,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatClock(now || new Date())}
          </span>
          <RunAllButton
            disabled={!brand || !!runAllStep}
            step={runAllStep}
            onClick={handleRunAll}
          />
          <ActivityPulse />
        </div>
      </div>

      {/* Floor */}
      <div
        style={{
          background: '#0a0a0c',
          position: 'relative',
          height: 420,
          width: '100%',
          overflow: 'hidden',
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* Room rectangles + labels */}
        {ROOM_RECTS.map((r) => (
          <div key={r.name} aria-hidden>
            <div
              style={{
                position: 'absolute',
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                background: 'rgba(255,255,255,0.015)',
                borderRadius: 12,
                pointerEvents: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: `calc(${r.left} + 10px)`,
                top: `calc(${r.top} + 10px)`,
                fontSize: 9,
                color: 'rgba(255,255,255,0.1)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                pointerEvents: 'none',
                fontWeight: 600,
              }}
            >
              {r.name}
            </span>
          </div>
        ))}

        {/* Desks */}
        {AGENTS.map((agent) => (
          <Desk key={agent.key} agent={agent} />
        ))}

        {/* Chair dots */}
        <ChairDots />

        {/* Meeting table */}
        <MeetingPiece active={meetingActive} onClick={triggerMeeting} />

        {/* Ripple on meeting trigger */}
        <AnimatePresence>
          {meetingActive && (
            <motion.div
              key="ripple"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 70,
                height: 44,
                borderRadius: 10,
                border: '0.5px solid rgba(255,255,255,0.4)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}
        </AnimatePresence>

        {/* Agent characters */}
        {AGENTS.map((agent) => (
          <AgentCharacter
            key={agent.key}
            agent={agent}
            position={agentPositions[agent.key] || HOME_POSITIONS[agent.key]}
            mode={
              meetingActive
                ? 'meeting'
                : meetingAgents?.includes(agent.key)
                ? 'meeting'
                : agentModes[agent.key] || 'wandering'
            }
            screenIndex={screenIndex}
          />
        ))}
      </div>

      {/* Agent info strip */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        {AGENTS.map((agent) => (
          <AgentInfoPill
            key={agent.key}
            agent={agent}
            screenIndex={screenIndex}
            brand={brand}
            onRefresh={onRefresh}
            showToast={showToast}
          />
        ))}
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

// ===== Schedule Strip =====
function agentDisplayName(type) {
  if (!type) return 'Agent'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function ScheduleStrip({ brand }) {
  const [apiSchedule, setApiSchedule] = useState(null)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!brand?.id) {
      setApiSchedule(null)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/schedule?brand_id=${encodeURIComponent(brand.id)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setApiSchedule(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('schedule fetch failed', e)
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [brand?.id])

  const usingFallback = !apiSchedule || apiSchedule.length === 0
  const rows = usingFallback
    ? SCHEDULE
    : apiSchedule.map((s) => ({
        time: s.time,
        task: s.task,
        agent: agentDisplayName(s.agent_type),
        color: HUD_COLORS[s.agent_type]?.accent || '#ffffff',
        status: s.status,
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
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
        <span
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            fontFamily: MONO,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {formatClock(clock)}
        </span>
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
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '10px 12px',
                minWidth: 140,
                borderRadius: 10,
                background: active
                  ? 'rgba(74,222,128,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: active
                  ? '0.5px solid rgba(74,222,128,0.4)'
                  : '0.5px solid rgba(255,255,255,0.06)',
                boxShadow: active
                  ? '0 0 12px rgba(74,222,128,0.12)'
                  : 'none',
                opacity: done ? 0.4 : 1,
                flexShrink: 0,
                transition: 'all 0.3s ease',
              }}
            >
              {active && (
                <motion.span
                  aria-hidden
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 10,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#4ade80',
                    boxShadow: '0 0 8px rgba(74,222,128,0.7)',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 10.5,
                  color: active ? '#4ade80' : TEXT_MUTED,
                  fontFamily: MONO,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.04em',
                  fontWeight: active ? 600 : 500,
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
function ReviewPanel({ items, brand, onApprove, onReject, onRepurpose, wide }) {
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
      <div
        style={
          wide
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 10,
              }
            : undefined
        }
      >
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
              marginBottom: wide ? 0 : 8,
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
              {onRepurpose && (
                <button
                  type="button"
                  onClick={() => onRepurpose()}
                  title="Repurpose latest approved content to 4 platforms"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 9px',
                    borderRadius: 7,
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Recycle size={10} /> Repurpose
                </button>
              )}
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
      </div>
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
function LogPanel({ entries, wide }) {
  return (
    <div
      style={
        wide
          ? {
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              columnGap: 32,
              rowGap: 1,
            }
          : { display: 'flex', flexDirection: 'column', gap: 1 }
      }
    >
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
                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
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
function StatsPanel({ wide }) {
  const cells = [
    { label: 'Engagement', value: '12.4%', sub: '+2.1% wk', accent: '#ffffff' },
    { label: 'Reach', value: '184K', sub: '7-day', accent: '#ffffff' },
    { label: 'Saves', value: '2.3K', sub: '/1K views', accent: '#ffffff' },
    { label: 'Followers', value: '+312', sub: 'this week', accent: '#ffffff' },
  ]
  return (
    <div
      style={
        wide
          ? {
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 24,
              alignItems: 'flex-start',
            }
          : { display: 'flex', flexDirection: 'column', gap: 12 }
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: wide
            ? 'repeat(4, minmax(0, 1fr))'
            : 'repeat(2, minmax(0, 1fr))',
          gap: wide ? 10 : 8,
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
