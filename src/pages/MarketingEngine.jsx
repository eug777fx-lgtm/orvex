import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import db from '@/lib/db'
import useIsMobile from '../utils/useIsMobile'
import { Player } from '@remotion/player'
import { HookOpener } from '../remotion/compositions/HookOpener'
import { TradeInsight } from '../remotion/compositions/TradeInsight'
import { QuoteCard } from '../remotion/compositions/QuoteCard'
import { BrandPromo } from '../remotion/compositions/BrandPromo'
import { ServiceAd } from '../remotion/compositions/ServiceAd'
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
  Mic,
  Play,
  Camera,
  Image as ImageIcon,
  LayoutGrid,
  Layers,
  Search,
  Film,
  Eye,
  CalendarDays,
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
  const [scheduleVersion, setScheduleVersion] = useState(0)
  const [activeSection, setActiveSection] = useState('office')
  const isMobile = useIsMobile()
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
    generatedToday: 0,
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

  const loadBrands = useCallback(async (selectIdAfter) => {
    try {
      const rows = await db.query(
        `SELECT * FROM (
           SELECT DISTINCT ON (LOWER(name)) id, name, color, COALESCE(brand_type, 'own') AS brand_type,
                  logo_url, primary_color, secondary_color, visual_style, aesthetic_description, created_at
             FROM brands
            ORDER BY LOWER(name),
                     CASE WHEN brand_type='own' THEN 0 ELSE 1 END,
                     created_at ASC
         ) sub
         ORDER BY brand_type ASC, created_at ASC`,
      )
      setBrands(rows || [])
      if (selectIdAfter) {
        const match = (rows || []).find((b) => b.id === selectIdAfter)
        if (match) setSelectedBrand(match)
      } else if ((rows || []).length > 0) {
        setSelectedBrand((current) => current || rows[0])
      } else {
        setLoading(false)
      }
    } catch (e) {
      console.error('load brands failed', e)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  // Refetch stats / review / schedule whenever selectedBrand changes
  const refreshBrandData = useCallback(async () => {
    if (!selectedBrand) return
    setLoading(true)
    try {
      const [
        cReadyRows,
        schedCountRows,
        avgScoreRows,
        publishedRows,
        generatedTodayRows,
        reviewRows,
        scheduleRows,
        memoryRows,
      ] = await Promise.all([
        db.query(
          "SELECT COUNT(*) AS count FROM content WHERE brand_id=$1 AND status='pending'",
          [selectedBrand.id],
        ),
        db.query(
          `SELECT COUNT(*) AS count
             FROM schedules s
             JOIN content c ON s.content_id = c.id
            WHERE s.brand_id=$1 AND s.published=false AND c.status='approved'`,
          [selectedBrand.id],
        ),
        db.query(
          'SELECT COALESCE(ROUND(AVG(score)::numeric, 0), 0) AS avg_score FROM analytics WHERE brand_id=$1',
          [selectedBrand.id],
        ),
        db.query(
          "SELECT COUNT(*) AS count FROM content WHERE brand_id=$1 AND status='published'",
          [selectedBrand.id],
        ),
        db.query(
          "SELECT COUNT(*) AS count FROM content WHERE brand_id=$1 AND created_at::date = CURRENT_DATE",
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
            ORDER BY memory_type, created_at DESC`,
          [selectedBrand.id],
        ),
      ])
      setStats({
        contentReady: Number(cReadyRows?.[0]?.count ?? 0),
        scheduled: Number(schedCountRows?.[0]?.count ?? 0),
        published: Number(publishedRows?.[0]?.count ?? 0),
        avgScore: Number(avgScoreRows?.[0]?.avg_score ?? 0),
        generatedToday: Number(generatedTodayRows?.[0]?.count ?? 0),
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

  // Clear all per-brand state immediately when the selected brand changes,
  // so old data never flashes through during a switch.
  useEffect(() => {
    setReviewItems([])
    setSchedule([])
    setMemory([])
    setStats({
      contentReady: 0,
      scheduled: 0,
      avgScore: 0,
      published: 0,
      generatedToday: 0,
    })
    setLiveLog(LIVE_LOG)
  }, [selectedBrand?.id])

  useEffect(() => {
    refreshBrandData()
    if (!selectedBrand) return
    const id = setInterval(() => refreshBrandData(), 60000)
    return () => clearInterval(id)
  }, [refreshBrandData, selectedBrand])

  // Keyboard shortcuts: A approves, R rejects the first review item when drawer is open
  useEffect(() => {
    function onKey(e) {
      if (!drawerOpen || activeTab !== 'review') return
      const target = e.target
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
        return
      if (reviewItems.length === 0) return
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        approve(reviewItems[0].id)
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        reject(reviewItems[0].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen, activeTab, reviewItems])

  async function approve(id) {
    if (!selectedBrand) return
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: id, brand_id: selectedBrand.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'failed' }))
        throw new Error(err.error || 'approve failed')
      }
      const data = await res.json()
      setReviewItems((items) => items.filter((it) => it.id !== id))
      setStats((s) => ({
        ...s,
        contentReady: Math.max(0, s.contentReady - 1),
        scheduled: s.scheduled + 1,
      }))
      const d = new Date(data.scheduled_at)
      const dateStr = d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
      const timeStr = d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
      showToast(
        `Approved — scheduled for ${dateStr} at ${timeStr} on ${data.platform}`,
      )
      setScheduleVersion((v) => v + 1)
      refreshBrandData()
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
        margin: isMobile ? '-1rem' : '-2rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 56px)',
        color: '#fff',
      }}
    >
        <PageHeader
          now={now}
          loading={loading}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <BrandSelector
          brands={brands}
          selected={selectedBrand}
          onSelect={setSelectedBrand}
          showToast={showToast}
          onBrandAdded={async (created) => {
            await loadBrands(created?.id)
          }}
        />
        <StatsRow stats={stats} loading={loading} />

        <AnimatePresence mode="wait">
          {activeSection === 'office' ? (
            <motion.div
              key="office"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '12px 20px',
                paddingBottom: 40,
              }}
            >
              <AgentOffice
                screenIndex={screenIndex}
                meetingAgents={meetingAgents}
                brand={selectedBrand}
                onRefresh={refreshBrandData}
                showToast={showToast}
                now={now}
                hasMemory={memory.length > 0}
                onSetUpMemory={() => {
                  const el = document.getElementById('brand-memory-section')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              />
              <ScheduleStrip brand={selectedBrand} version={scheduleVersion} />
              <BrandMemory
                brand={selectedBrand}
                memory={memory}
                onRefresh={refreshBrandData}
                showToast={showToast}
              />
              <VideoTemplates brand={selectedBrand} showToast={showToast} />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ padding: '12px 20px', paddingBottom: 40 }}
            >
              <ContentHub
                brand={selectedBrand}
                reviewItems={reviewItems}
                liveLog={liveLog}
                scheduleVersion={scheduleVersion}
                onApprove={approve}
                onReject={reject}
                onRepurpose={repurpose}
                onRefresh={refreshBrandData}
                showToast={showToast}
              />
            </motion.div>
          )}
        </AnimatePresence>

      <Toast toast={toast} drawerOpen={false} />
    </motion.div>
  )
}

function BottomDrawer({ open, onToggle, activeTab, onTabChange, reviewCount, isMobile, children }) {
  const drawerHeight = isMobile ? Math.round(window.innerHeight * 0.6) : 380
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
        animate={{ y: open ? 0 : drawerHeight }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: 48,
          left: 0,
          right: 0,
          zIndex: 49,
          height: drawerHeight,
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
function SectionTabs({ active, onChange }) {
  const tabs = [
    { key: 'office', label: 'Office', icon: LayoutGrid },
    { key: 'content', label: 'Content Hub', icon: Layers },
  ]
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 3,
        display: 'inline-flex',
        gap: 2,
      }}
    >
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 10,
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Icon size={13} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function PageHeader({ now, loading, activeSection, onSectionChange }) {
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
      <div style={{ minWidth: 0 }}>
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
      <SectionTabs active={activeSection} onChange={onSectionChange} />
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
const BRAND_PRESET_COLORS = [
  '#ffffff',
  '#a78bfa',
  '#22d3ee',
  '#4ade80',
  '#fbbf24',
  '#f87171',
]
const BRAND_PLATFORMS = ['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube']

function BrandChip({ brand, active, isClient, onSelect, onUploadLogo, uploading }) {
  const color = brand.primary_color || brand.color || '#ffffff'
  const fileRef = useRef(null)
  function triggerFile(e) {
    e.stopPropagation()
    fileRef.current?.click()
  }
  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onUploadLogo?.(brand, reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px 5px 5px',
        borderRadius: 999,
        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
        border: active
          ? '0.5px solid rgba(255,255,255,0.35)'
          : isClient
          ? '0.5px dashed rgba(255,255,255,0.18)'
          : '0.5px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        opacity: uploading ? 0.6 : 1,
      }}
      onClick={() => onSelect(brand)}
    >
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt=""
          style={{
            width: 20,
            height: 20,
            objectFit: 'cover',
            borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}80`,
            margin: '0 7px',
          }}
        />
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: active ? '#fff' : 'rgba(255,255,255,0.65)',
        }}
      >
        {brand.name}
      </span>
      {!brand.logo_url && (
        <button
          type="button"
          onClick={triggerFile}
          title="Upload logo"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            marginLeft: 2,
          }}
        >
          <Camera size={11} />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}

function BrandSelector({ brands, selected, onSelect, onBrandAdded, showToast }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '',
    brand_type: 'own',
    color: '#ffffff',
    platforms: ['instagram'],
  })
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState(null)

  const ownBrands = brands.filter((b) => (b.brand_type || 'own') === 'own')
  const clientBrands = brands.filter((b) => b.brand_type === 'client')

  async function uploadLogo(brand, dataUrl) {
    if (!brand?.id || !dataUrl) return
    setUploadingId(brand.id)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brand.id, image_base64: dataUrl }),
      })
      if (!res.ok) throw new Error('upload failed')
      await onBrandAdded?.(brand)
      showToast?.('Logo uploaded — brand style extracted')
    } catch (e) {
      console.error('logo upload failed', e)
      showToast?.('Logo upload failed', 'error')
    } finally {
      setUploadingId(null)
    }
  }

  function toggle(platform) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }))
  }

  async function save() {
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    try {
      const rows = await db.query(
        `INSERT INTO brands (name, color, platforms, brand_type)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (name) DO NOTHING
         RETURNING id, name, color, COALESCE(brand_type, 'own') AS brand_type`,
        [name, form.color, JSON.stringify(form.platforms), form.brand_type],
      )
      const created = rows?.[0]
      setAdding(false)
      setForm({ name: '', brand_type: 'own', color: '#ffffff', platforms: ['instagram'] })
      await onBrandAdded?.(created || null)
      showToast?.(
        created
          ? 'Brand created — add memory to get started'
          : 'A brand with that name already exists',
        created ? 'info' : 'error',
      )
    } catch (e) {
      console.error('brand insert failed', e)
      showToast?.('Failed to create brand', 'error')
    } finally {
      setSaving(false)
    }
  }

  function renderGroup(label, list, isClient) {
    if (list.length === 0) return null
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            color: TEXT_FAINT,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            paddingRight: 4,
          }}
        >
          {label}
        </span>
        {list.map((b) => (
          <BrandChip
            key={b.id}
            brand={b}
            active={selected?.id === b.id}
            isClient={isClient}
            onSelect={onSelect}
            onUploadLogo={uploadLogo}
            uploading={uploadingId === b.id}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflowX: 'auto',
        }}
      >
        {renderGroup('Your Brands', ownBrands, false)}
        {renderGroup('Clients', clientBrands, true)}
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 11px',
            borderRadius: 999,
            background: adding ? 'rgba(255,255,255,0.07)' : 'transparent',
            border: '0.5px dashed rgba(255,255,255,0.18)',
            color: TEXT_MUTED,
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={11} /> {adding ? 'Cancel' : 'Add Brand'}
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Brand name"
                  style={{
                    flex: 1,
                    minWidth: 160,
                    fontSize: 13,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    padding: 2,
                  }}
                >
                  {['own', 'client'].map((t) => {
                    const active = form.brand_type === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, brand_type: t }))}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 999,
                          background: active ? '#fff' : 'transparent',
                          color: active ? '#000' : 'rgba(255,255,255,0.55)',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                        }}
                      >
                        {t === 'own' ? 'Own brand' : 'Client'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: TEXT_MUTED, minWidth: 60 }}>
                  Color
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {BRAND_PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: c,
                        border:
                          form.color === c
                            ? '1.5px solid #fff'
                            : '0.5px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        boxShadow: form.color === c ? `0 0 8px ${c}` : 'none',
                      }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: TEXT_MUTED, minWidth: 60 }}>
                  Platforms
                </span>
                {BRAND_PLATFORMS.map((p) => {
                  const checked = form.platforms.includes(p)
                  return (
                    <label
                      key={p}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: checked
                          ? 'rgba(255,255,255,0.08)'
                          : 'transparent',
                        border: checked
                          ? '0.5px solid rgba(255,255,255,0.25)'
                          : '0.5px solid rgba(255,255,255,0.08)',
                        color: checked ? '#fff' : 'rgba(255,255,255,0.55)',
                        fontSize: 11,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p)}
                        style={{ display: 'none' }}
                      />
                      {p}
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !form.name.trim()}
                  style={{
                    fontSize: 12,
                    padding: '7px 16px',
                    borderRadius: 8,
                    background: '#fff',
                    color: '#000',
                    border: 'none',
                    fontWeight: 600,
                    cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !form.name.trim() ? 0.55 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  style={{
                    fontSize: 12,
                    padding: '7px 14px',
                    borderRadius: 8,
                    background: 'transparent',
                    color: TEXT_MUTED,
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== Stats Row =====
function StatsRow({ stats, loading }) {
  const cells = [
    { key: 'ready', label: 'Content Ready', value: stats.contentReady, sub: 'awaiting approval' },
    { key: 'scheduled', label: 'Scheduled', value: stats.scheduled, sub: 'approved & queued' },
    { key: 'avg', label: 'Avg Score', value: stats.avgScore, sub: 'AI performance' },
    {
      key: 'published',
      label: 'Published',
      value: stats.published,
      sub: 'all time',
      trend: stats.generatedToday > 0 ? `+${stats.generatedToday} today` : null,
    },
  ]
  return (
    <div
      style={{
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: loading ? 0.55 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {cells.map((s) => (
          <div
            key={s.key}
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
                background: '#ffffff',
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
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                marginTop: 6,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.value}
              </span>
              {s.trend && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    color: '#4ade80',
                    fontWeight: 600,
                  }}
                >
                  <TrendingUp size={10} />
                  {s.trend}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: TEXT_FAINT, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: TEXT_MUTED,
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            color: TEXT_FAINT,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          Generated today
        </span>
        <span style={{ color: '#fff', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {stats.generatedToday}
        </span>
        <span style={{ color: TEXT_FAINT }}>items added in the last 24h</span>
      </div>
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

function AgentInfoPill({ agent, screenIndex, brand, onRefresh, showToast, hasMemory }) {
  const colors = HUD_COLORS[agent.key] || { accent: '#ffffff' }
  const status = agent.statuses[screenIndex % agent.statuses.length]
  const [runStatus, setRunStatus] = useState('idle')
  const [hover, setHover] = useState(false)

  async function handleRun() {
    if (!brand || runStatus === 'running') return
    setRunStatus('running')
    try {
      const apiAgentType = agent.key === 'video' ? 'video_director' : agent.key
      const data = await callAgent(brand.id, apiAgentType)
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
        title={
          hasMemory === false
            ? 'Add brand memory first for best results'
            : isRunning
            ? 'Running…'
            : 'Run'
        }
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

function NoMemoryOverlay({ onSetUpMemory }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(10,10,12,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        zIndex: 20,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          letterSpacing: '-0.01em',
        }}
      >
        No memory yet
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          maxWidth: 360,
          lineHeight: 1.5,
        }}
      >
        Add brand memory so the agents know your voice, audience, and goals
        before they start running.
      </div>
      <button
        type="button"
        onClick={onSetUpMemory}
        style={{
          marginTop: 6,
          background: '#fff',
          color: '#000',
          fontSize: 12,
          fontWeight: 600,
          padding: '8px 18px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Set up brand memory
      </button>
    </motion.div>
  )
}

function AgentOffice({
  screenIndex,
  meetingAgents,
  brand,
  onRefresh,
  showToast,
  now,
  hasMemory,
  onSetUpMemory,
}) {
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
          minHeight: 420,
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
            hasMemory={hasMemory}
          />
        ))}
      </div>

      {brand && hasMemory === false && (
        <NoMemoryOverlay onSetUpMemory={onSetUpMemory} />
      )}
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

const PLATFORM_COLORS = {
  instagram: '#a78bfa',
  tiktok: '#22d3ee',
  linkedin: '#60a5fa',
  facebook: '#4ade80',
  youtube: '#f87171',
}

function platformColor(p) {
  return PLATFORM_COLORS[p] || '#ffffff'
}

function fmtSchedTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ScheduleStrip({ brand, version }) {
  const [schedules, setSchedules] = useState([])
  const [isEmpty, setIsEmpty] = useState(false)
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!brand?.id) {
      setSchedules([])
      setIsEmpty(true)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/schedule?brand_id=${encodeURIComponent(brand.id)}`,
        )
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data)) {
          setSchedules(data)
          setIsEmpty(data.length === 0)
        } else {
          setSchedules(data.schedules || [])
          setIsEmpty(!!data.is_empty)
        }
      } catch (e) {
        console.error('schedule fetch failed', e)
      }
    }
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [brand?.id, version])

  const now = clock.getTime()
  const total = schedules.length
  const published = schedules.filter((s) => s.published).length
  // Active = next unpublished closest to now (smallest |scheduled - now| where scheduled >= now - 30min)
  let activeId = null
  let minDelta = Infinity
  for (const s of schedules) {
    if (s.published) continue
    const t = new Date(s.scheduled_at).getTime()
    const delta = Math.abs(t - now)
    if (delta < minDelta) {
      minDelta = delta
      activeId = s.id
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 10.5,
                  color: TEXT_MUTED,
                  letterSpacing: '0.04em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {published}/{total} · {published} published
              </span>
              <div
                style={{
                  width: 60,
                  height: 3,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${total === 0 ? 0 : (published / total) * 100}%`,
                    height: '100%',
                    background: 'rgba(74,222,128,0.7)',
                  }}
                />
              </div>
            </div>
          )}
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
      </div>

      {isEmpty ? (
        <div
          style={{
            padding: 18,
            textAlign: 'center',
            color: TEXT_MUTED,
            fontSize: 12,
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 10,
            border: '0.5px dashed rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={16} color="rgba(255,255,255,0.4)" />
          <div>No content scheduled today — approve content to schedule it</div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {schedules.map((s) => {
            const t = new Date(s.scheduled_at).getTime()
            const isActive = s.id === activeId
            const isPublished = !!s.published
            const isPending = !isPublished && t < now - 30 * 60 * 1000
            const preview =
              (s.hook || s.caption || s.script || '').slice(0, 35) +
              ((s.hook || s.caption || s.script || '').length > 35 ? '…' : '')
            const platform = s.platform || 'post'
            const pColor = platformColor(platform)
            return (
              <div
                key={s.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '10px 12px',
                  minWidth: 180,
                  borderRadius: 10,
                  background:
                    isActive && !isPublished
                      ? 'rgba(74,222,128,0.04)'
                      : 'rgba(255,255,255,0.02)',
                  border:
                    isActive && !isPublished
                      ? '0.5px solid rgba(74,222,128,0.4)'
                      : '0.5px solid rgba(255,255,255,0.06)',
                  boxShadow:
                    isActive && !isPublished
                      ? '0 0 12px rgba(74,222,128,0.12)'
                      : 'none',
                  opacity: isPublished ? 0.5 : 1,
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                }}
              >
                {isActive && !isPublished && (
                  <motion.span
                    aria-hidden
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      color:
                        isPublished
                          ? 'rgba(74,222,128,0.9)'
                          : isPending
                          ? '#fbbf24'
                          : isActive
                          ? '#4ade80'
                          : TEXT_MUTED,
                      fontFamily: MONO,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.04em',
                      fontWeight: 600,
                    }}
                  >
                    {fmtSchedTime(s.scheduled_at)}
                  </span>
                  {isPublished && (
                    <span
                      style={{
                        fontSize: 9.5,
                        color: 'rgba(74,222,128,0.9)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Check size={10} /> Posted
                    </span>
                  )}
                  {!isPublished && isPending && (
                    <span
                      style={{
                        fontSize: 9.5,
                        color: '#fbbf24',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Pending
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 500,
                    textDecoration: isPublished ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                  }}
                >
                  {preview || '(empty)'}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: `${pColor}14`,
                    border: `0.5px solid ${pColor}33`,
                    color: pColor,
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
                      background: pColor,
                    }}
                  />
                  {platform}
                </span>
              </div>
            )
          })}
        </div>
      )}
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

function VisualIdentityCard({ brand, showToast, onRefresh }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  if (!brand) return null

  function pickFile() {
    fileRef.current?.click()
  }
  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      setUploading(true)
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_id: brand.id,
            image_base64: reader.result,
          }),
        })
        if (!res.ok) throw new Error('failed')
        await onRefresh?.()
        showToast?.('Logo uploaded — brand style extracted')
      } catch (err) {
        console.error('logo upload failed', err)
        showToast?.('Logo upload failed', 'error')
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (!brand.logo_url) {
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px dashed rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TEXT_MUTED,
            flexShrink: 0,
          }}
        >
          <ImageIcon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
            Visual identity
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
            Upload your logo to extract brand colors
          </div>
        </div>
        <button
          type="button"
          onClick={pickFile}
          disabled={uploading}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 11,
            fontWeight: 600,
            cursor: uploading ? 'wait' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading…' : 'Upload logo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFile}
          style={{ display: 'none' }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <img
        src={brand.logo_url}
        alt=""
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          objectFit: 'cover',
          border: '0.5px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            marginBottom: 4,
          }}
        >
          {brand.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {brand.primary_color && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: brand.primary_color,
                  border: '0.5px solid rgba(255,255,255,0.15)',
                }}
              />
              <span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO }}>
                {brand.primary_color}
              </span>
            </span>
          )}
          {brand.secondary_color && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: brand.secondary_color,
                  border: '0.5px solid rgba(255,255,255,0.15)',
                }}
              />
              <span style={{ fontSize: 10, color: TEXT_MUTED, fontFamily: MONO }}>
                {brand.secondary_color}
              </span>
            </span>
          )}
          {brand.visual_style && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.04em',
                textTransform: 'capitalize',
              }}
            >
              {brand.visual_style}
            </span>
          )}
        </div>
        {brand.aesthetic_description && (
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            {brand.aesthetic_description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={pickFile}
        disabled={uploading}
        title="Replace logo"
        style={{
          background: 'transparent',
          color: TEXT_MUTED,
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          padding: '5px 9px',
          fontSize: 10,
          fontWeight: 500,
          cursor: uploading ? 'wait' : 'pointer',
          opacity: uploading ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        <Camera size={11} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: 'none' }}
      />
    </div>
  )
}

function relativeTime(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function BrandMemory({ brand, memory, onRefresh, showToast }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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
      showToast?.('Memory updated — agents will use this in next run')
    } catch (e) {
      console.error('memory insert failed', e)
      showToast?.('Failed to save memory', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(id) {
    const trimmed = editValue.trim()
    if (!id || !trimmed) return
    setEditSaving(true)
    try {
      await db.query('UPDATE brand_memory SET content=$1 WHERE id=$2', [
        trimmed,
        id,
      ])
      setEditingId(null)
      setEditValue('')
      onRefresh?.()
      showToast?.('Memory updated — agents will use this in next run')
    } catch (e) {
      console.error('memory update failed', e)
      showToast?.('Failed to update memory', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function refreshFromAgent() {
    if (!brand?.id || refreshing) return
    setRefreshing(true)
    showToast?.('Running Analytics Agent to refresh memory…')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          agent_type: 'analytics',
          input: 'Update brand memory based on recent performance',
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const update = data?.output?.memory_update
      if (update && brand?.id) {
        await db.query(
          `INSERT INTO brand_memory (brand_id, memory_type, content)
           VALUES ($1, 'top_performers', $2)`,
          [brand.id, String(update)],
        )
      }
      onRefresh?.()
      showToast?.('Brand memory refreshed')
    } catch (e) {
      console.error('refresh memory failed', e)
      showToast?.('Failed to refresh memory', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  const wordCount = (memory || []).reduce(
    (s, m) => s + String(m.content || '').split(/\s+/).filter(Boolean).length,
    0,
  )

  return (
    <div
      id="brand-memory-section"
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
                · {(memory || []).length} {memory.length === 1 ? 'entry' : 'entries'} · ~{wordCount} words of context
              </span>
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
              What the AI knows about this brand
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={refreshFromAgent}
            disabled={!brand || refreshing}
            style={{
              fontSize: 10.5,
              padding: '4px 10px',
              borderRadius: 999,
              border: '0.5px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: !brand || refreshing ? TEXT_FAINT : 'rgba(255,255,255,0.7)',
              cursor: !brand || refreshing ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
              fontWeight: 500,
            }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh Memory'}
          </button>
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
            {adding ? 'Close' : 'Add'}
          </button>
        </div>
      </div>

      <VisualIdentityCard brand={brand} showToast={showToast} onRefresh={onRefresh} />

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
            const latest = items[0]
            const preview = latest?.content || ''
            const isEditing = editingId === latest?.id
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
                {isEditing ? (
                  <>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        fontSize: 11.5,
                        padding: 8,
                        borderRadius: 6,
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => saveEdit(latest.id)}
                        disabled={editSaving || !editValue.trim()}
                        style={{
                          fontSize: 10.5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: '#fff',
                          color: '#000',
                          border: 'none',
                          fontWeight: 600,
                          cursor: editSaving ? 'not-allowed' : 'pointer',
                          opacity: editSaving || !editValue.trim() ? 0.55 : 1,
                        }}
                      >
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setEditValue('')
                        }}
                        style={{
                          fontSize: 10.5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: 'transparent',
                          color: TEXT_MUTED,
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'rgba(255,255,255,0.78)',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9.5,
                          color: TEXT_FAINT,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {latest ? `Updated ${relativeTime(latest.created_at)}` : '—'}
                      </span>
                      {latest && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(latest.id)
                            setEditValue(latest.content || '')
                          }}
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            borderRadius: 999,
                            border: '0.5px solid rgba(255,255,255,0.12)',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.65)',
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </>
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

// ===== Video Templates =====
const VIDEO_TEMPLATES = [
  {
    id: 'HookOpener',
    name: 'Hook Opener',
    description: 'Short kinetic hook, watermark only',
    durationSec: 5,
    frames: 150,
    fps: 30,
    component: HookOpener,
    branding: 'watermark',
    defaultProps: {
      headline: 'Discipline is built quietly.',
      subtext: 'Most people quit too early.',
      brandColor: '#ffffff',
      brandName: 'LIMITLESS',
      primaryColor: '#ffffff',
      logoUrl: null,
    },
  },
  {
    id: 'TradeInsight',
    name: 'Trade Insight',
    description: 'Educational reel with full brand intro/outro',
    durationSec: 12,
    frames: 360,
    fps: 30,
    component: TradeInsight,
    branding: 'intro-outro',
    defaultProps: {
      title: 'The ICT Concept Nobody Talks About',
      points: ['Liquidity grabs', 'Order blocks', 'Fair value gaps'],
      brandColor: '#ffffff',
      brandName: 'LIMITLESS',
      primaryColor: '#ffffff',
      logoUrl: null,
      ctaText: 'Start journaling your trades',
    },
  },
  {
    id: 'QuoteCard',
    name: 'Quote Card',
    description: 'Cinematic quote, watermark only',
    durationSec: 6,
    frames: 180,
    fps: 30,
    component: QuoteCard,
    branding: 'watermark',
    defaultProps: {
      quote: 'Silence reveals character.',
      author: 'LIMITLESS',
      brandColor: '#ffffff',
      brandName: 'LIMITLESS',
      primaryColor: '#ffffff',
      logoUrl: null,
    },
  },
  {
    id: 'BrandPromo',
    name: 'Brand Promo',
    description: 'Full branded promo with logo reveal',
    durationSec: 15,
    frames: 450,
    fps: 30,
    component: BrandPromo,
    branding: 'intro-outro',
    defaultProps: {
      logoUrl: null,
      brandName: 'LIMITLESS',
      primaryColor: '#ffffff',
      secondaryColor: '#a78bfa',
      headline: 'The smarter way to trade',
      features: ['Track every trade', 'Spot your patterns', 'Improve your edge'],
      ctaText: 'Start free today',
    },
  },
  {
    id: 'ServiceAd',
    name: 'Service Ad',
    description: 'Service advertisement with CTA',
    durationSec: 10,
    frames: 300,
    fps: 30,
    component: ServiceAd,
    branding: 'intro-outro',
    defaultProps: {
      logoUrl: null,
      brandName: 'AWATEC',
      primaryColor: '#4ade80',
      secondaryColor: '#ffffff',
      problem: 'Hidden leaks are costing you money',
      solution: 'Professional leak detection in Aruba',
      serviceName: 'Leak Inspection',
      price: 'Afl. 150',
      ctaText: 'Call us today',
    },
  },
]

function templatesForBrand(brand) {
  if (!brand) return VIDEO_TEMPLATES
  const name = String(brand.name || '').toUpperCase()
  if (name === 'LIMITLESS') {
    return VIDEO_TEMPLATES.filter((t) =>
      ['HookOpener', 'TradeInsight', 'QuoteCard', 'BrandPromo'].includes(t.id),
    )
  }
  if (name === 'AWATEC') {
    return VIDEO_TEMPLATES.filter((t) =>
      ['ServiceAd', 'BrandPromo', 'QuoteCard'].includes(t.id),
    )
  }
  if ((brand.brand_type || 'own') === 'client') {
    return VIDEO_TEMPLATES.filter((t) =>
      ['BrandPromo', 'ServiceAd'].includes(t.id),
    )
  }
  return VIDEO_TEMPLATES
}

function VideoTemplates({ brand, showToast }) {
  const [preview, setPreview] = useState(null)
  const [generating, setGenerating] = useState(null)
  const templates = templatesForBrand(brand)
  const brandColor = brand?.primary_color || brand?.color || '#ffffff'

  async function generate(template) {
    setGenerating(template.id)
    showToast(`Queueing ${template.name}...`)
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          composition_id: template.id,
          props: template.defaultProps,
          brand_id: brand?.id || null,
        }),
      })
      if (!res.ok) throw new Error('failed')
      showToast('Video queued — will appear in review queue when ready')
    } catch (e) {
      console.error('render failed', e)
      showToast('Video generation failed', 'error')
    } finally {
      setGenerating(null)
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
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Video size={13} color={TEXT_MUTED} />
        <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          Video Templates
        </span>
        <span style={{ fontSize: 10.5, color: TEXT_FAINT, letterSpacing: '0.04em' }}>
          Remotion · 9:16
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
        }}
      >
        {templates.map((t) => (
          <div
            key={t.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: brandColor,
                  boxShadow: `0 0 6px ${brandColor}80`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                  letterSpacing: '-0.01em',
                }}
              >
                {t.name}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.4,
                minHeight: 28,
              }}
            >
              {t.description}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 9.5,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: TEXT_MUTED,
                  fontFamily: MONO,
                  letterSpacing: '0.04em',
                }}
              >
                {t.durationSec}s
              </span>
              <span
                style={{
                  fontSize: 9.5,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: TEXT_MUTED,
                  letterSpacing: '0.04em',
                }}
              >
                {t.branding === 'intro-outro' ? 'Intro / outro' : 'Watermark only'}
              </span>
              {brand?.logo_url && (
                <span
                  style={{
                    fontSize: 9.5,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'rgba(74,222,128,0.1)',
                    border: '0.5px solid rgba(74,222,128,0.3)',
                    color: '#4ade80',
                    letterSpacing: '0.04em',
                  }}
                >
                  Brand logo
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setPreview(t)}
                style={{
                  flex: 1,
                  fontSize: 11,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.75)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => generate(t)}
                disabled={generating === t.id}
                style={{
                  flex: 1,
                  fontSize: 11,
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: '#ffffff',
                  border: '0.5px solid #fff',
                  color: '#000',
                  fontWeight: 600,
                  cursor: generating === t.id ? 'wait' : 'pointer',
                  opacity: generating === t.id ? 0.6 : 1,
                }}
              >
                {generating === t.id ? '...' : 'Generate'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {preview && (
          <VideoPreviewModal
            template={preview}
            brand={brand}
            onClose={() => setPreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function VideoPreviewModal({ template, brand, onClose }) {
  const mergedProps = {
    ...template.defaultProps,
    ...(brand?.logo_url
      ? {
          logoUrl: brand.logo_url,
          brandName: brand.name,
          primaryColor: brand.primary_color || template.defaultProps.primaryColor,
          secondaryColor:
            brand.secondary_color || template.defaultProps.secondaryColor,
        }
      : {}),
  }
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a0a0c',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            {template.name}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: TEXT_MUTED,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
        <Player
          component={template.component}
          durationInFrames={template.frames}
          fps={template.fps}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: 270, height: 480, borderRadius: 8 }}
          controls
          autoPlay
          loop
          inputProps={mergedProps}
        />
      </motion.div>
    </motion.div>
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
const CONTENT_TYPE_GROUP = {
  hook: 'scripts',
  caption: 'scripts',
  script: 'scripts',
  cta: 'scripts',
  repurpose: 'scripts',
  instagram: 'scripts',
  tiktok: 'scripts',
  linkedin: 'scripts',
  twitter: 'scripts',
  voiceover: 'scripts',
  video: 'videos',
  video_render: 'videos',
  image: 'static',
  static_ad: 'static',
}

const TYPE_PLATFORM = {
  hook: 'instagram',
  caption: 'instagram',
  script: 'tiktok',
  cta: 'instagram',
  instagram: 'instagram',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  facebook: 'facebook',
  video: 'instagram',
  image: 'instagram',
}

function ContentHub({
  brand,
  reviewItems,
  liveLog,
  scheduleVersion,
  onApprove,
  onReject,
  onRepurpose,
  onRefresh,
  showToast,
}) {
  const [scheduled, setScheduled] = useState([])
  const [generating, setGenerating] = useState(false)
  const [activeQueue, setActiveQueue] = useState('scripts')
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [showWorkflow, setShowWorkflow] = useState(false)
  const [videoPreview, setVideoPreview] = useState(null)

  useEffect(() => {
    if (!brand?.id) {
      setScheduled([])
      return
    }
    let cancelled = false
    async function load() {
      try {
        const rows = await db.query(
          `SELECT s.id, s.platform, s.scheduled_at, s.published, c.id AS content_id, c.type, c.hook, c.caption, c.script
             FROM schedules s
             JOIN content c ON s.content_id = c.id
            WHERE s.brand_id=$1 AND s.published=false AND c.status='approved'
            ORDER BY s.scheduled_at ASC
            LIMIT 30`,
          [brand.id],
        )
        if (!cancelled) setScheduled(rows || [])
      } catch (e) {
        console.error('scheduled fetch failed', e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [brand?.id, scheduleVersion])

  async function cancelSchedule(id) {
    try {
      await db.query('DELETE FROM schedules WHERE id=$1', [id])
      setScheduled((rows) => rows.filter((r) => r.id !== id))
      showToast?.('Schedule cancelled')
    } catch (e) {
      console.error('cancel schedule failed', e)
      showToast?.('Failed to cancel', 'error')
    }
  }

  async function generateMore() {
    if (!brand?.id || generating) return
    setGenerating(true)
    showToast?.('Writer Agent is generating new content…')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brand.id, agent_type: 'writer' }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const n = data.items_generated || 0
      showToast?.(`Writer Agent finished — ${n} new items added`)
      onRefresh?.()
    } catch (e) {
      console.error('generate more failed', e)
      showToast?.('Generate failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  // Split + filter reviewItems for queue tabs.
  const allItems = Array.isArray(reviewItems) ? reviewItems : []
  const searchLc = search.trim().toLowerCase()
  const passesSearch = (it) => {
    if (!searchLc) return true
    const text = `${it.hook || ''} ${it.caption || ''} ${it.script || ''}`.toLowerCase()
    return text.includes(searchLc)
  }
  const passesPlatform = (it) => {
    if (platformFilter === 'all') return true
    return TYPE_PLATFORM[it.type] === platformFilter
  }
  const groups = { scripts: [], videos: [], static: [] }
  for (const it of allItems) {
    const g = CONTENT_TYPE_GROUP[it.type] || 'scripts'
    if (passesSearch(it) && passesPlatform(it)) groups[g].push(it)
  }
  const filtered = groups
  const queueCounts = {
    scripts: groups.scripts.length,
    videos: groups.videos.length,
    static: groups.static.length,
  }

  const brandColor = brand?.primary_color || brand?.color || '#ffffff'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <div
          style={{
            background: CARD_BG,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: CARD_BORDER,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
                Review Queue
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                }}
              >
                {allItems.length}
              </span>
              {brand && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: brandColor,
                      boxShadow: `0 0 6px ${brandColor}80`,
                    }}
                  />
                  {brand.name}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '5px 10px',
                width: 220,
                maxWidth: '100%',
              }}
            >
              <Search size={12} color={TEXT_MUTED} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
          <QueueTabs
            counts={queueCounts}
            active={activeQueue}
            onChange={setActiveQueue}
          />
          <PlatformFilterBar
            value={platformFilter}
            onChange={setPlatformFilter}
          />
          <div style={{ marginTop: 12 }}>
            {activeQueue === 'scripts' && (
              <ScriptsAndCopyQueue
                items={filtered.scripts}
                brand={brand}
                onApprove={onApprove}
                onReject={onReject}
                onRepurpose={onRepurpose}
              />
            )}
            {activeQueue === 'videos' && (
              <VideosQueue
                items={filtered.videos}
                brand={brand}
                onApprove={onApprove}
                onReject={onReject}
                onPreview={(it) => setVideoPreview(it)}
              />
            )}
            {activeQueue === 'static' && (
              <StaticAdsQueue
                items={filtered.static}
                brand={brand}
                onApprove={onApprove}
                onReject={onReject}
              />
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={generateMore}
              disabled={!brand || generating}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '7px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: !brand || generating ? 'not-allowed' : 'pointer',
                opacity: !brand || generating ? 0.55 : 1,
              }}
            >
              {generating ? 'Generating…' : 'Generate More'}
            </button>
          </div>
        </div>

        <div
          style={{
            background: CARD_BG,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: CARD_BORDER,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
              Scheduled
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
              }}
            >
              {scheduled.length}
            </span>
          </div>
          {scheduled.length === 0 ? (
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
              No approved content scheduled yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scheduled.map((s) => {
                const preview = (s.hook || s.caption || s.script || '').slice(0, 60)
                const d = new Date(s.scheduled_at)
                const when = `${d.toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} · ${d.toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}`
                const color = platformColor(s.platform)
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.025)',
                      border: '0.5px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: `${color}14`,
                        border: `0.5px solid ${color}33`,
                        color,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}
                    >
                      {s.platform || 'post'}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: TEXT_MUTED,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {when}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.85)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {preview || '(empty)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelSchedule(s.id)}
                      title="Cancel schedule"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: TEXT_MUTED,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ContentCalendar brand={brand} version={scheduleVersion} />
        <div
          style={{
            background: CARD_BG,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: CARD_BORDER,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Activity size={13} color="#ffffff" />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
              Agent Activity
            </span>
          </div>
          <LogPanel entries={liveLog} brand={brand} />
        </div>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <WorkflowVisualization
          open={showWorkflow}
          onToggle={() => setShowWorkflow((s) => !s)}
        />
      </div>
      <AnimatePresence>
        {videoPreview && (
          <VideoContentPreviewModal
            item={videoPreview}
            onClose={() => setVideoPreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function QueueTabs({ counts, active, onChange }) {
  const tabs = [
    { key: 'scripts', label: 'Scripts & Copy' },
    { key: 'videos', label: 'Videos' },
    { key: 'static', label: 'Static Ads' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map((t) => {
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '5px 14px',
              borderRadius: 999,
              background: isActive
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {t.label}
            <span
              style={{
                fontSize: 9.5,
                padding: '1px 6px',
                borderRadius: 999,
                background: isActive
                  ? 'rgba(0,0,0,0.3)'
                  : 'rgba(255,255,255,0.06)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {counts[t.key] || 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function PlatformFilterBar({ value, onChange }) {
  const platforms = [
    { key: 'all', label: 'All' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'facebook', label: 'Facebook' },
  ]
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        marginTop: 8,
        flexWrap: 'wrap',
      }}
    >
      {platforms.map((p) => {
        const isActive = value === p.key
        const color =
          p.key === 'all' ? '#ffffff' : platformColor(p.key)
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10.5,
              padding: '3px 9px',
              borderRadius: 999,
              background: isActive
                ? `${color}1f`
                : 'transparent',
              border: isActive
                ? `0.5px solid ${color}55`
                : '0.5px solid rgba(255,255,255,0.07)',
              color: isActive ? color : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {p.key !== 'all' && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: color,
                }}
              />
            )}
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

const SCRIPT_TYPE_COLORS = {
  hook: '#a78bfa',
  caption: '#22d3ee',
  script: '#4ade80',
  cta: '#fbbf24',
  voiceover: '#f87171',
  instagram: '#a78bfa',
  tiktok: '#22d3ee',
  linkedin: '#60a5fa',
  twitter: '#f87171',
  repurpose: '#ffffff',
}

function ScriptsAndCopyQueue({ items, brand, onApprove, onReject, onRepurpose }) {
  if (items.length === 0) {
    return (
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
        No scripts or copy in queue
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence>
        {items.map((it) => (
          <ScriptItem
            key={it.id}
            it={it}
            brand={brand}
            onApprove={onApprove}
            onReject={onReject}
            onRepurpose={onRepurpose}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ScriptItem({ it, brand, onApprove, onReject, onRepurpose }) {
  const [expanded, setExpanded] = useState(false)
  const type = reviewItemType(it)
  const typeColor = SCRIPT_TYPE_COLORS[type] || '#ffffff'
  const text = reviewItemText(it)
  const platform = TYPE_PLATFORM[type] || ''
  const isScript = type === 'script'
  return (
    <motion.div
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
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            padding: '2px 8px',
            borderRadius: 999,
            background: `${typeColor}1a`,
            border: `0.5px solid ${typeColor}40`,
            color: typeColor,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {type}
        </span>
        {platform && (
          <span
            style={{
              fontSize: 9.5,
              padding: '2px 8px',
              borderRadius: 999,
              background: `${platformColor(platform)}14`,
              border: `0.5px solid ${platformColor(platform)}33`,
              color: platformColor(platform),
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {platform}
          </span>
        )}
        <span style={{ fontSize: 10, color: TEXT_FAINT, letterSpacing: '0.04em' }}>
          {brand?.name || ''}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: TEXT_FAINT,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {text.length} chars
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'rgba(255,255,255,0.88)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: isScript && !expanded ? 3 : 999,
          WebkitBoxOrient: 'vertical',
          overflow: isScript && !expanded ? 'hidden' : 'visible',
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </p>
      {isScript && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 10.5,
            cursor: 'pointer',
            padding: 0,
            marginTop: 4,
          }}
        >
          {expanded ? '↑ Collapse' : '↓ Expand'}
        </button>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onApprove(it.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 9px',
            borderRadius: 7,
            background: 'rgba(74,222,128,0.12)',
            border: '0.5px solid rgba(74,222,128,0.4)',
            color: '#4ade80',
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
  )
}

function VideosQueue({ items, brand, onApprove, onReject, onPreview }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: 28,
          textAlign: 'center',
          color: TEXT_MUTED,
          fontSize: 12,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 10,
          border: '0.5px dashed rgba(255,255,255,0.08)',
        }}
      >
        <Film size={20} color="rgba(255,255,255,0.4)" style={{ marginBottom: 8 }} />
        <div>
          No videos in queue — use Video Templates in the Office tab to generate
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 10,
      }}
    >
      <AnimatePresence>
        {items.map((it) => (
          <VideoCard
            key={it.id}
            it={it}
            brand={brand}
            onApprove={onApprove}
            onReject={onReject}
            onPreview={onPreview}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function VideoCard({ it, brand, onApprove, onReject, onPreview }) {
  const url = it.script && /^https?:\/\//.test(it.script) ? it.script : null
  const isRendering = it.type === 'video_render' || (!url && it.type === 'video')
  const brandColor = brand?.primary_color || brand?.color || '#ffffff'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.22 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '9 / 16',
          maxHeight: 280,
          background: 'rgba(0,0,0,0.5)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {url ? (
          <video
            src={url}
            controls
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: TEXT_MUTED,
            }}
          >
            <Film size={28} />
            <span style={{ fontSize: 11 }}>
              {isRendering ? 'Rendering…' : 'No preview'}
            </span>
          </div>
        )}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontSize: 9.5,
            padding: '2px 8px',
            borderRadius: 999,
            background: isRendering
              ? 'rgba(251,191,36,0.15)'
              : url
              ? 'rgba(74,222,128,0.15)'
              : 'rgba(248,113,113,0.15)',
            border: `0.5px solid ${
              isRendering
                ? 'rgba(251,191,36,0.4)'
                : url
                ? 'rgba(74,222,128,0.4)'
                : 'rgba(248,113,113,0.4)'
            }`,
            color: isRendering ? '#fbbf24' : url ? '#4ade80' : '#f87171',
            fontWeight: 600,
            letterSpacing: '0.04em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {isRendering ? (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#fbbf24',
              }}
            />
          ) : null}
          {isRendering ? 'Rendering' : url ? 'Ready' : 'Failed'}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: brandColor,
              boxShadow: `0 0 5px ${brandColor}80`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11.5,
              color: '#fff',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {it.type === 'video_render' ? 'Render' : 'Video'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => onPreview(it)}
          disabled={!url}
          style={{
            flex: 1,
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 7,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: url ? 'rgba(255,255,255,0.75)' : TEXT_FAINT,
            fontWeight: 500,
            cursor: url ? 'pointer' : 'not-allowed',
          }}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => onApprove(it.id)}
          style={{
            flex: 1,
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 7,
            background: 'rgba(74,222,128,0.12)',
            border: '0.5px solid rgba(74,222,128,0.4)',
            color: '#4ade80',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(it.id)}
          style={{
            fontSize: 11,
            padding: '5px 10px',
            borderRadius: 7,
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: TEXT_MUTED,
            cursor: 'pointer',
          }}
        >
          <X size={11} />
        </button>
      </div>
    </motion.div>
  )
}

function StaticAdsQueue({ items, brand, onApprove, onReject }) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: 28,
          textAlign: 'center',
          color: TEXT_MUTED,
          fontSize: 12,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 10,
          border: '0.5px dashed rgba(255,255,255,0.08)',
        }}
      >
        <ImageIcon
          size={20}
          color="rgba(255,255,255,0.4)"
          style={{ marginBottom: 8 }}
        />
        <div>No static ads in queue — run Higgsfield to generate brand visuals</div>
      </div>
    )
  }
  const brandColor = brand?.primary_color || brand?.color || '#ffffff'
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10,
      }}
    >
      <AnimatePresence>
        {items.map((it) => {
          const url =
            it.script && /^https?:\/\//.test(it.script) ? it.script : null
          return (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                overflow: 'hidden',
                aspectRatio: '9 / 16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {url ? (
                <img
                  src={url}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    color: TEXT_MUTED,
                  }}
                >
                  <ImageIcon size={24} />
                  <span style={{ fontSize: 10 }}>No preview</span>
                </div>
              )}
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                9:16
              </span>
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: brandColor,
                  boxShadow: `0 0 6px ${brandColor}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: 8,
                  display: 'flex',
                  gap: 6,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
              >
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onApprove(it.id)
                  }}
                  style={{
                    flex: 1,
                    fontSize: 10.5,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(74,222,128,0.85)',
                    color: '#000',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    onReject(it.id)
                  }}
                  style={{
                    fontSize: 10.5,
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function VideoContentPreviewModal({ item, onClose }) {
  const url = item.script && /^https?:\/\//.test(item.script) ? item.script : null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
      >
        {url ? (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12 }}
          />
        ) : (
          <div style={{ color: '#fff' }}>No preview available</div>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -36,
            right: 0,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <X size={16} /> Close
        </button>
      </div>
    </motion.div>
  )
}

const WORKFLOW_STAGES = [
  {
    key: 'generate',
    title: 'Generate',
    icon: Sparkles,
    tint: 'rgba(96,165,250,0.12)',
    accent: '#60a5fa',
    items: [
      'Strategy Agent runs at 7AM',
      'Writer Agent creates copy',
      'Video Director creates briefs',
      'Higgsfield renders visuals',
      'Remotion renders motion',
    ],
  },
  {
    key: 'review',
    title: 'Review',
    icon: Eye,
    tint: 'rgba(251,191,36,0.12)',
    accent: '#fbbf24',
    items: [
      'Scripts & Copy queue',
      'Videos queue',
      'Static Ads queue',
      'You approve or reject',
      'Edit before approving',
    ],
  },
  {
    key: 'schedule',
    title: 'Schedule',
    icon: CalendarDays,
    tint: 'rgba(167,139,250,0.12)',
    accent: '#a78bfa',
    items: [
      'Auto-scheduled on approval',
      'Platform assigned by type',
      'Time slot auto-selected',
      'Calendar populated',
      '3 posts per day max',
    ],
  },
  {
    key: 'publish',
    title: 'Publish',
    icon: Send,
    tint: 'rgba(74,222,128,0.12)',
    accent: '#4ade80',
    items: [
      'Make.com triggers at scheduled time',
      'Posts to Instagram/TikTok/LinkedIn',
      'Webhook confirms published',
      'Status updates to published',
    ],
  },
  {
    key: 'learn',
    title: 'Learn',
    icon: TrendingUp,
    tint: 'rgba(248,113,113,0.12)',
    accent: '#f87171',
    items: [
      'Analytics Agent scores posts',
      'Engagement data pulled',
      'Brand memory updated',
      'Next generation improves',
      'Loop repeats daily',
    ],
  },
]

function WorkflowVisualization({ open, onToggle }) {
  return (
    <div
      style={{
        background: CARD_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: CARD_BORDER,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            How Your Content System Works
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
            end to end automation
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            fontSize: 11,
            padding: '5px 12px',
            borderRadius: 999,
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {open ? 'Hide workflow' : 'Show workflow'}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 8,
                paddingTop: 14,
                alignItems: 'stretch',
              }}
            >
              {WORKFLOW_STAGES.map((s, i) => {
                const Icon = s.icon
                return (
                  <Fragment key={s.key}>
                    <div
                      style={{
                        position: 'relative',
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid rgba(255,255,255,0.07)',
                        borderRadius: 12,
                        padding: 14,
                        minWidth: 180,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 10,
                          fontSize: 9,
                          color: 'rgba(255,255,255,0.15)',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        0{i + 1}
                      </span>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: s.tint,
                          border: `0.5px solid ${s.accent}33`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: s.accent,
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#fff',
                          marginTop: 4,
                        }}
                      >
                        {s.title}
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          padding: 0,
                          listStyle: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        {s.items.map((it, j) => (
                          <li
                            key={j}
                            style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.45)',
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 6,
                              lineHeight: 1.4,
                            }}
                          >
                            <span
                              style={{
                                width: 3,
                                height: 3,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.3)',
                                flexShrink: 0,
                              }}
                            />
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {i < WORKFLOW_STAGES.length - 1 && (
                      <div
                        style={{
                          alignSelf: 'center',
                          color: 'rgba(255,255,255,0.2)',
                          fontSize: 18,
                          flexShrink: 0,
                        }}
                      >
                        ›
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ContentCalendar({ brand, version }) {
  const [items, setItems] = useState([])
  const [monthOffset, setMonthOffset] = useState(0)

  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!brand?.id) {
      setItems([])
      return
    }
    let cancelled = false
    async function load() {
      try {
        const start = new Date(viewDate)
        const end = new Date(viewDate)
        end.setMonth(end.getMonth() + 2)
        const rows = await db.query(
          `SELECT s.id, s.scheduled_at, s.platform, s.published, c.hook, c.caption
             FROM schedules s
             JOIN content c ON s.content_id = c.id
            WHERE s.brand_id = $1 AND s.scheduled_at >= $2 AND s.scheduled_at < $3
            ORDER BY s.scheduled_at ASC`,
          [brand.id, start.toISOString(), end.toISOString()],
        )
        if (!cancelled) setItems(rows || [])
      } catch (e) {
        console.error('calendar fetch failed', e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id, monthOffset, version])

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const lastDay = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0)
  const startWeekday = (firstDay.getDay() + 6) % 7 // Monday-first
  const totalDays = lastDay.getDate()

  const byDate = {}
  for (const it of items) {
    const d = new Date(it.scheduled_at)
    if (d.getMonth() !== viewDate.getMonth()) continue
    const key = d.getDate()
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(it)
  }

  const [openDay, setOpenDay] = useState(null)

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div
      style={{
        background: CARD_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: CARD_BORDER,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
          {monthLabel}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            style={iconBtnStyle()}
          >
            <ChevronUp size={12} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            style={iconBtnStyle()}
          >
            <ChevronUp size={12} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 4,
        }}
      >
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              fontSize: 9,
              color: TEXT_FAINT,
              textAlign: 'center',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {cells.map((day, i) => {
          if (!day)
            return <div key={`empty-${i}`} style={{ height: 36 }} />
          const dayItems = byDate[day] || []
          const isOpen = openDay === day
          const isToday =
            day === now.getDate() &&
            viewDate.getMonth() === now.getMonth() &&
            viewDate.getFullYear() === now.getFullYear()
          return (
            <button
              key={day}
              type="button"
              onClick={() => setOpenDay(isOpen ? null : day)}
              style={{
                position: 'relative',
                height: 36,
                background: isOpen
                  ? 'rgba(255,255,255,0.08)'
                  : isToday
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
                border: isToday
                  ? '0.5px solid rgba(255,255,255,0.25)'
                  : '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: 2,
              }}
            >
              <span
                style={{
                  opacity: dayItems.length === 0 ? 0.3 : 1,
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {day}
              </span>
              {dayItems.length > 0 && (
                <span style={{ display: 'flex', gap: 2 }}>
                  {dayItems.slice(0, 4).map((it, idx) => (
                    <span
                      key={idx}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: platformColor(it.platform),
                        opacity: it.published ? 0.4 : 1,
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {openDay && byDate[openDay] && byDate[openDay].length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: TEXT_FAINT,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {monthLabel.split(' ')[0]} {openDay}
          </div>
          {byDate[openDay].map((it) => {
            const preview = (it.hook || it.caption || '').slice(0, 36)
            const color = platformColor(it.platform)
            return (
              <div
                key={it.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                  }}
                />
                <span style={{ fontSize: 10.5, color: TEXT_MUTED }}>
                  {new Date(it.scheduled_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  {preview || '(empty)'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function iconBtnStyle() {
  return {
    width: 22,
    height: 22,
    background: 'transparent',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

function VoiceoverControl({ item, state, onGenerate, onPlay }) {
  const status = state?.status
  if (status === 'ready') {
    return (
      <button
        type="button"
        onClick={onPlay}
        title="Play voiceover"
        style={voiceoverBtnStyle('#ffffff', '#000')}
      >
        <Play size={10} /> Voice ready
      </button>
    )
  }
  if (status === 'loading') {
    return (
      <button type="button" disabled style={voiceoverBtnStyle('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.5)')}>
        <Mic size={10} /> Generating…
      </button>
    )
  }
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onGenerate}
        title="Retry voiceover"
        style={voiceoverBtnStyle('transparent', 'rgba(255,255,255,0.5)')}
      >
        <Mic size={10} /> Retry voice
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onGenerate}
      title="Generate voiceover"
      style={voiceoverBtnStyle('rgba(255,255,255,0.04)', 'rgba(255,255,255,0.7)')}
    >
      <Mic size={10} /> Voice
    </button>
  )
}

function voiceoverBtnStyle(background, color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 9px',
    borderRadius: 7,
    background,
    border: '0.5px solid rgba(255,255,255,0.12)',
    color,
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
  }
}

function ReviewPanel({ items, brand, onApprove, onReject, onRepurpose, wide }) {
  const [voiceovers, setVoiceovers] = useState({}) // { [contentId]: { status, audioUrl } }

  async function generateVoiceover(it) {
    const id = it.id
    const text = it.script || it.caption || it.hook || ''
    if (!text.trim()) return
    setVoiceovers((prev) => ({ ...prev, [id]: { status: 'loading' } }))
    try {
      const res = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, brand_id: brand?.id || null }),
      })
      if (!res.ok) throw new Error('voiceover failed')
      const data = await res.json()
      setVoiceovers((prev) => ({
        ...prev,
        [id]: { status: 'ready', audioUrl: data.audio_url },
      }))
    } catch (e) {
      console.error('voiceover failed', e)
      setVoiceovers((prev) => ({ ...prev, [id]: { status: 'error' } }))
    }
  }

  function playVoiceover(id) {
    const v = voiceovers[id]
    if (!v?.audioUrl) return
    const audio = new Audio(v.audioUrl)
    audio.play().catch((e) => console.error('audio play failed', e))
  }

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
            {it.type === 'image' && it.script ? (
              <img
                src={it.script}
                alt="generated"
                style={{
                  width: '100%',
                  maxHeight: 360,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  display: 'block',
                }}
              />
            ) : it.type === 'video' && it.script ? (
              <video
                src={it.script}
                controls
                style={{
                  width: '100%',
                  maxHeight: 360,
                  borderRadius: 8,
                  border: '0.5px solid rgba(255,255,255,0.06)',
                  background: '#000',
                  display: 'block',
                }}
              />
            ) : (
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
            )}
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
              {reviewItemType(it) === 'script' && (
                <VoiceoverControl
                  item={it}
                  state={voiceovers[it.id]}
                  onGenerate={() => generateVoiceover(it)}
                  onPlay={() => playVoiceover(it.id)}
                />
              )}
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
          <Sparkles size={20} style={{ marginBottom: 8 }} />
          <div>No content yet — click Run on any agent to generate your first batch</div>
        </div>
      )}
    </div>
  )
}

// ===== Right: Log =====
function LogPanel({ entries, wide, brand }) {
  const [realLogs, setRealLogs] = useState([])

  useEffect(() => {
    if (!brand?.id) {
      setRealLogs([])
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `/api/logs?brand_id=${encodeURIComponent(brand.id)}&limit=20`,
        )
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setRealLogs(data)
      } catch (e) {
        console.error('logs fetch failed', e)
      }
    }
    load()
    const id = setInterval(load, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [brand?.id])

  const hasReal = realLogs.length > 0

  if (!hasReal && (!entries || entries.length === 0)) {
    return (
      <div
        style={{
          padding: 28,
          textAlign: 'center',
          color: TEXT_MUTED,
          fontSize: 12,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 10,
          border: '0.5px dashed rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontFamily: MONO, letterSpacing: '0.3em' }}
        >
          …
        </motion.span>
        <div>Agents are warming up…</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {hasReal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <AnimatePresence initial={false}>
            {realLogs.map((entry) => {
              const agentName = (entry.agent_type || 'agent')
                .split('_')
                .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                .join(' ')
              const colorKey = entry.agent_type === 'video_director' ? 'video' : entry.agent_type
              const color = HUD_COLORS[colorKey]?.accent || '#fff'
              const t = new Date(entry.created_at)
              const time = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
              return (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '46px 1fr',
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
                    {time}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        color,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {agentName}
                      {entry.status && entry.status !== 'complete' && (
                        <span style={{ marginLeft: 6, color: TEXT_FAINT, fontWeight: 500 }}>
                          · {entry.status}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: TEXT_MUTED,
                        lineHeight: 1.4,
                      }}
                    >
                      {entry.message}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {(!hasReal || entries.length > 0) && (
        <>
          {!hasReal && entries.length > 0 && (
            <div
              style={{
                fontSize: 9.5,
                color: TEXT_FAINT,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                paddingBottom: 4,
                borderBottom: '0.5px dashed rgba(255,255,255,0.06)',
              }}
            >
              Sample data
            </div>
          )}
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
        </>
      )}
    </div>
  )
}

// ===== Right: Stats =====
function StatsPanel({ wide, brand, showToast }) {
  const [data, setData] = useState({
    totalPublished: 0,
    avgScore: 0,
    contentThisWeek: 0,
    topPlatform: '—',
    dailyScores: [],
    topPerformers: [],
    typeCounts: {},
    totalContent: 0,
  })
  const [digest, setDigest] = useState(null)
  const [digestLoading, setDigestLoading] = useState(false)

  useEffect(() => {
    if (!brand?.id) return
    let cancelled = false
    async function load() {
      try {
        const [pubRows, avgRows, weekRows, platformRows, dailyRows, topRows, typeRows] =
          await Promise.all([
            db.query(
              "SELECT COUNT(*)::int AS c FROM content WHERE brand_id=$1 AND status='published'",
              [brand.id],
            ),
            db.query(
              'SELECT AVG(score)::float AS v FROM analytics WHERE brand_id=$1',
              [brand.id],
            ),
            db.query(
              "SELECT COUNT(*)::int AS c FROM content WHERE brand_id=$1 AND created_at > now() - interval '7 days'",
              [brand.id],
            ),
            db.query(
              `SELECT s.platform, COUNT(*)::int AS c
                 FROM schedules s
                WHERE s.brand_id=$1 AND s.platform IS NOT NULL
             GROUP BY s.platform
             ORDER BY c DESC
                LIMIT 1`,
              [brand.id],
            ),
            db.query(
              `SELECT date_trunc('day', recorded_at)::date AS d,
                      AVG(score)::float AS s
                 FROM analytics
                WHERE brand_id=$1 AND recorded_at > now() - interval '7 days'
             GROUP BY 1
             ORDER BY 1 ASC`,
              [brand.id],
            ),
            db.query(
              `SELECT c.id, c.hook, c.caption, a.score, a.engagement_rate
                 FROM content c
                 JOIN analytics a ON c.id = a.content_id
                WHERE c.brand_id=$1
             ORDER BY a.score DESC
                LIMIT 5`,
              [brand.id],
            ),
            db.query(
              `SELECT type, COUNT(*)::int AS c
                 FROM content
                WHERE brand_id=$1
             GROUP BY type`,
              [brand.id],
            ),
          ])
        if (cancelled) return
        const typeCounts = {}
        for (const r of typeRows || []) typeCounts[r.type] = r.c
        const total = (typeRows || []).reduce((s, r) => s + r.c, 0)
        setData({
          totalPublished: pubRows?.[0]?.c ?? 0,
          avgScore: avgRows?.[0]?.v ? Math.round(avgRows[0].v) : 0,
          contentThisWeek: weekRows?.[0]?.c ?? 0,
          topPlatform: platformRows?.[0]?.platform || '—',
          dailyScores: dailyRows || [],
          topPerformers: topRows || [],
          typeCounts,
          totalContent: total,
        })
      } catch (e) {
        console.error('stats fetch failed', e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [brand?.id])

  async function generateDigest() {
    if (!brand?.id || digestLoading) return
    setDigestLoading(true)
    setDigest(null)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          agent_type: 'analytics',
          input: 'Generate the weekly performance digest.',
        }),
      })
      if (!res.ok) throw new Error('failed')
      const out = await res.json()
      setDigest(out.output)
      showToast?.('Weekly digest ready')
    } catch (e) {
      console.error('digest failed', e)
      showToast?.('Digest generation failed', 'error')
    } finally {
      setDigestLoading(false)
    }
  }

  const cells = [
    { label: 'Total Published', value: data.totalPublished, sub: 'all time' },
    { label: 'Avg Score', value: data.avgScore || 0, sub: 'engagement' },
    { label: 'Content This Week', value: data.contentThisWeek, sub: 'last 7 days' },
    { label: 'Top Platform', value: data.topPlatform, sub: 'most scheduled' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overview row */}
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
                background: '#ffffff',
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
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
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

      <PerformanceChart dailyScores={data.dailyScores} />

      <div
        style={
          wide
            ? {
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: 16,
                alignItems: 'flex-start',
              }
            : { display: 'flex', flexDirection: 'column', gap: 16 }
        }
      >
        <TopPerformersList items={data.topPerformers} />
        <ContentBreakdown typeCounts={data.typeCounts} total={data.totalContent} />
      </div>

      <div>
        <button
          type="button"
          onClick={generateDigest}
          disabled={!brand || digestLoading}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: !brand || digestLoading ? 'not-allowed' : 'pointer',
            opacity: !brand || digestLoading ? 0.55 : 1,
            letterSpacing: '0.02em',
          }}
        >
          {digestLoading ? 'Generating…' : 'Generate Weekly Report'}
        </button>
        <AnimatePresence>
          {digest && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                marginTop: 12,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Weekly Insight
              </div>
              <DigestContent digest={digest} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PerformanceChart({ dailyScores }) {
  const W = 600
  const H = 140
  const padLeft = 26
  const padRight = 8
  const padTop = 10
  const padBottom = 18
  const chartW = W - padLeft - padRight
  const chartH = H - padTop - padBottom

  // Build last 7 days keyed by weekday label
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    days.push({ iso, label: dayLabels[(d.getDay() + 6) % 7] })
  }
  const scoreMap = {}
  for (const r of dailyScores || []) {
    const iso = new Date(r.d).toISOString().slice(0, 10)
    scoreMap[iso] = Math.max(0, Math.min(100, Math.round(r.s || 0)))
  }
  const bars = days.map((d) => ({
    label: d.label,
    score: scoreMap[d.iso] ?? null,
  }))
  const hasData = bars.some((b) => b.score !== null)
  const avg = hasData
    ? Math.round(
        bars.reduce((s, b) => s + (b.score || 0), 0) /
          bars.filter((b) => b.score !== null).length,
      )
    : 0

  const barWidth = chartW / bars.length - 8
  const avgY = padTop + chartH - (avg / 100) * chartH

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}
        >
          Last 7 days
        </div>
        {hasData && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            avg <span style={{ color: '#fff', fontWeight: 600 }}>{avg}</span>
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: 140, display: 'block' }}
      >
        {[0, 50, 100].map((v) => {
          const y = padTop + chartH - (v / 100) * chartH
          return (
            <g key={v}>
              <line
                x1={padLeft}
                y1={y}
                x2={W - padRight}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                fontSize={9}
                fill="rgba(255,255,255,0.3)"
                textAnchor="end"
              >
                {v}
              </text>
            </g>
          )
        })}
        {bars.map((b, i) => {
          const x = padLeft + i * (chartW / bars.length) + 4
          const isEmpty = b.score === null
          const score = isEmpty ? 20 : b.score
          const h = (score / 100) * chartH
          const y = padTop + chartH - h
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={2}
                fill={isEmpty ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)'}
              />
              <text
                x={x + barWidth / 2}
                y={H - 4}
                fontSize={9}
                fill="rgba(255,255,255,0.4)"
                textAnchor="middle"
              >
                {b.label}
              </text>
            </g>
          )
        })}
        {hasData && (
          <line
            x1={padLeft}
            y1={avgY}
            x2={W - padRight}
            y2={avgY}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        )}
      </svg>
      {!hasData && (
        <div
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Run agents to start tracking
        </div>
      )}
    </div>
  )
}

function TopPerformersList({ items }) {
  return (
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
      {items.length === 0 ? (
        <div
          style={{
            padding: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px dashed rgba(255,255,255,0.08)',
            borderRadius: 10,
            fontSize: 11,
            color: TEXT_MUTED,
            textAlign: 'center',
          }}
        >
          No analytics scored yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((p, i) => {
            const preview = p.hook || p.caption || '(untitled)'
            const score = Math.round(p.score || 0)
            const high = score >= 80
            return (
              <div
                key={p.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 2px',
                  borderBottom:
                    i === items.length - 1
                      ? 'none'
                      : '0.5px solid rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      fontVariantNumeric: 'tabular-nums',
                      fontFamily: MONO,
                      minWidth: 14,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 11.5,
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {preview}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: high
                      ? 'rgba(255,255,255,0.08)'
                      : 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    color: high ? '#fff' : 'rgba(255,255,255,0.5)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {score}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ContentBreakdown({ typeCounts, total }) {
  const buckets = [
    { key: 'hook', label: 'Hooks' },
    { key: 'caption', label: 'Captions' },
    { key: 'script', label: 'Scripts' },
    { key: 'video', label: 'Videos' },
  ]
  const safeTotal = total || 0
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
        }}
      >
        <BarChart3 size={11} color="#ffffff" />
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>Content mix</span>
      </div>
      {safeTotal === 0 ? (
        <div
          style={{
            padding: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px dashed rgba(255,255,255,0.08)',
            borderRadius: 10,
            fontSize: 11,
            color: TEXT_MUTED,
            textAlign: 'center',
          }}
        >
          No content yet
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              height: 10,
              borderRadius: 999,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              marginBottom: 10,
            }}
          >
            {buckets.map((b, i) => {
              const count = typeCounts[b.key] || 0
              const pct = safeTotal === 0 ? 0 : (count / safeTotal) * 100
              if (pct === 0) return null
              const opacity = 0.9 - i * 0.15
              return (
                <div
                  key={b.key}
                  style={{
                    width: `${pct}%`,
                    background: `rgba(255,255,255,${Math.max(0.2, opacity)})`,
                    borderRight: '0.5px solid rgba(0,0,0,0.2)',
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {buckets.map((b) => {
              const count = typeCounts[b.key] || 0
              const pct =
                safeTotal === 0 ? 0 : Math.round((count / safeTotal) * 100)
              return (
                <div
                  key={b.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{b.label}</span>
                  <span
                    style={{
                      color: TEXT_MUTED,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {count} · {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function DigestContent({ digest }) {
  if (!digest || typeof digest !== 'object') {
    return (
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
        {String(digest || 'No content')}
      </div>
    )
  }
  const rows = [
    ['Top performer', digest.top_performer],
    ['Key insight', digest.key_insight],
    ['Recommendation', digest.recommendation],
    ['Memory update', digest.memory_update],
    ['Avoid', digest.avoid],
  ].filter(([, v]) => v)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <div
            style={{
              fontSize: 10,
              color: TEXT_FAINT,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginBottom: 3,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
