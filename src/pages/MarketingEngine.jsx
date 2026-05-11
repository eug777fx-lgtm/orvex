import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  { name: 'LIMITLESS', color: '#a855f7' },
  { name: 'AWATEC', color: '#10b981' },
]

const AGENTS = [
  {
    key: 'strategy',
    name: 'Strategy',
    color: '#a855f7',
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
    color: '#06b6d4',
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
    color: '#f59e0b',
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
    color: '#10b981',
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
    color: '#ef4444',
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
  { time: '7:00', task: 'Trend scan', agent: 'Strategy', color: '#a855f7', status: 'done' },
  { time: '8:00', task: 'Write hooks', agent: 'Writer', color: '#06b6d4', status: 'done' },
  { time: '9:00', task: 'Post Instagram', agent: 'Distribution', color: '#10b981', status: 'active' },
  { time: '12:00', task: 'Video briefs', agent: 'Video', color: '#f59e0b', status: 'pending' },
  { time: '3:00', task: 'Post TikTok', agent: 'Distribution', color: '#10b981', status: 'pending' },
  { time: '8:00', task: 'Score posts', agent: 'Analytics', color: '#ef4444', status: 'pending' },
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

// ===== Page =====
export default function MarketingEngine() {
  const [selectedBrand, setSelectedBrand] = useState('LIMITLESS')
  const [activeTab, setActiveTab] = useState('review')
  const [now, setNow] = useState(new Date())
  const [screenIndex, setScreenIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState(INITIAL_REVIEW)
  const [meetingAgents, setMeetingAgents] = useState([])
  const [liveLog, setLiveLog] = useState(LIVE_LOG)

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

  function approve(id) {
    setReviewItems((items) => items.filter((it) => it.id !== id))
  }
  function reject(id) {
    setReviewItems((items) => items.filter((it) => it.id !== id))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        // Escape Shell's main padding for full-bleed
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
        <PageHeader now={now} />
        <BrandSelector selected={selectedBrand} onSelect={setSelectedBrand} />
        <StatsRow />

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
          <AgentOffice screenIndex={screenIndex} meetingAgents={meetingAgents} />
          <ScheduleStrip />
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
            <ReviewPanel items={reviewItems} onApprove={approve} onReject={reject} />
          )}
          {activeTab === 'log' && <LogPanel entries={liveLog} />}
          {activeTab === 'stats' && <StatsPanel />}
        </div>
      </aside>
    </motion.div>
  )
}

// ===== Page Header =====
function PageHeader({ now }) {
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
        <motion.span
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.55, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px rgba(16,185,129,0.7)',
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#10b981',
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
function BrandSelector({ selected, onSelect }) {
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
      {BRANDS.map((b) => {
        const active = selected === b.name
        return (
          <button
            key={b.name}
            type="button"
            onClick={() => onSelect(b.name)}
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
                background: b.color,
                boxShadow: `0 0 6px ${b.color}80`,
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
function StatsRow() {
  const stats = [
    { label: 'Content Ready', value: 14, sub: 'awaiting approval', accent: '#a855f7' },
    { label: 'Scheduled', value: 31, sub: 'next 30 days', accent: '#06b6d4' },
    { label: 'Avg Score', value: 84, sub: 'AI performance', accent: '#f59e0b' },
    { label: 'Published', value: 127, sub: 'all time', accent: '#10b981' },
  ]
  return (
    <div
      style={{
        padding: '0 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 10,
      }}
    >
      {stats.map((s) => (
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
const ALL_HANDS_TARGETS = {
  strategy: { left: 30, top: 30 },
  writer: { left: 44, top: 24 },
  video: { left: 58, top: 30 },
  distribution: { left: 30, top: 55 },
  analytics: { left: 58, top: 55 },
}

function AgentOffice({ screenIndex, meetingAgents }) {
  const [allHands, setAllHands] = useState(false)

  function triggerAllHands() {
    if (allHands) return
    setAllHands(true)
    setTimeout(() => setAllHands(false), 4000)
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
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>
            Agent Console
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.1)',
              border: '0.5px solid rgba(16,185,129,0.25)',
              color: '#10b981',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            5 ACTIVE
          </span>
        </div>
        <Activity size={13} color={TEXT_MUTED} />
      </div>

      <div
        style={{
          position: 'relative',
          minHeight: 320,
          borderRadius: 12,
          background: 'rgba(0,0,0,0.2)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
          overflow: 'hidden',
        }}
      >
        {/* Vertical room dividers */}
        <div
          style={{
            position: 'absolute',
            left: '33%',
            top: '5%',
            height: '90%',
            width: '0.5px',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '62%',
            top: '5%',
            height: '90%',
            width: '0.5px',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        {/* Horizontal room divider */}
        <div
          style={{
            position: 'absolute',
            top: '48%',
            left: '5%',
            width: '90%',
            height: '0.5px',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        {/* Room labels */}
        {[
          { text: 'Content Room', left: '3%', top: '3%' },
          { text: 'Production', left: '35%', top: '3%' },
          { text: 'Strategy Room', left: '64%', top: '3%' },
          { text: 'Operations', left: '3%', top: '52%' },
          { text: 'Analytics Lab', left: '64%', top: '52%' },
        ].map((label) => (
          <span
            key={label.text}
            style={{
              position: 'absolute',
              left: label.left,
              top: label.top,
              fontSize: 9,
              color: 'rgba(255,255,255,0.1)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              pointerEvents: 'none',
            }}
          >
            {label.text}
          </span>
        ))}

        {/* Decorative floor dots */}
        {[
          { left: '57%', top: '68%' },
          { left: '30%', top: '78%' },
          { left: '52%', top: '22%' },
        ].map((d, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Meeting table (clickable, triggers all-hands) */}
        <motion.div
          onClick={triggerAllHands}
          animate={{
            boxShadow: allHands
              ? '0 0 20px rgba(255,255,255,0.15)'
              : '0 0 0px rgba(255,255,255,0)',
          }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '44%',
            transform: 'translate(-50%, -50%)',
            width: 100,
            height: 48,
            borderRadius: 999,
            background: allHands ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
            border: allHands
              ? '0.5px solid rgba(255,255,255,0.3)'
              : '0.5px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1,
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}
        >
          <AnimatePresence>
            {allHands && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  pointerEvents: 'none',
                }}
              >
                All hands
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {AGENTS.map((agent, i) => (
          <AgentStation
            key={agent.key}
            agent={agent}
            index={i}
            screenIndex={screenIndex}
            inMeeting={meetingAgents.includes(agent.key)}
            allHands={allHands}
          />
        ))}
      </div>
    </div>
  )
}

function AgentStation({ agent, index, screenIndex, inMeeting, allHands }) {
  const status = agent.statuses[screenIndex % agent.statuses.length]
  const [walk, setWalk] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (allHands) {
      setWalk({ x: 0, y: 0 })
      return
    }
    let returnId
    const id = setInterval(() => {
      setWalk({
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 6,
      })
      returnId = setTimeout(() => setWalk({ x: 0, y: 0 }), 1400)
    }, 6000)
    return () => {
      clearInterval(id)
      if (returnId) clearTimeout(returnId)
    }
  }, [allHands])

  const baseLeft = parseFloat(agent.pos.left)
  const baseTop = parseFloat(agent.pos.top)
  const target = allHands
    ? ALL_HANDS_TARGETS[agent.key]
    : { left: baseLeft + walk.x, top: baseTop + walk.y }

  return (
    <motion.div
      animate={{ left: `${target.left}%`, top: `${target.top}%` }}
      transition={{ duration: allHands ? 0.9 : 0.6, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        zIndex: 2,
      }}
    >
      {/* Character (bobbing) */}
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.3,
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
        aria-hidden
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: agent.color,
            boxShadow: `0 0 6px ${agent.color}99`,
          }}
        />
        <div
          style={{
            width: 10,
            height: 6,
            borderRadius: 3,
            background: agent.color,
            opacity: 0.5,
          }}
        />
      </motion.div>

      {/* Desk card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: inMeeting
            ? '0.5px solid rgba(255,255,255,0.35)'
            : '0.5px solid rgba(255,255,255,0.08)',
          boxShadow: inMeeting ? '0 0 14px rgba(255,255,255,0.18)' : 'none',
          borderRadius: 10,
          padding: '8px 10px',
          width: 120,
          maxWidth: 120,
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {agent.name}
          </span>
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.2,
            }}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: agent.color,
              boxShadow: `0 0 6px ${agent.color}cc`,
              flexShrink: 0,
            }}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={screenIndex % agent.statuses.length}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.25 }}
          >
            <div
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.55)',
                fontFamily: MONO,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {status[0]}
            </div>
            <div
              style={{
                fontSize: 9,
                color: 'rgba(255,255,255,0.4)',
                fontFamily: MONO,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minHeight: 13,
              }}
            >
              {status[1]}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ===== Schedule Strip =====
function ScheduleStrip() {
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
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {SCHEDULE.map((row, i) => {
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
                  ? 'rgba(74,222,128,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: active
                  ? '0.5px solid rgba(74,222,128,0.3)'
                  : '0.5px solid rgba(255,255,255,0.06)',
                opacity: done ? 0.4 : 1,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  color: active ? '#4ade80' : TEXT_MUTED,
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
function ReviewPanel({ items, onApprove, onReject }) {
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
        <Sparkles size={11} color="#a855f7" />
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
                  background: 'rgba(168,85,247,0.12)',
                  border: '0.5px solid rgba(168,85,247,0.3)',
                  color: '#c084fc',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                }}
              >
                {it.type.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: TEXT_FAINT,
                  letterSpacing: '0.05em',
                }}
              >
                {it.brand}
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
              {it.text}
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
                  background: 'rgba(16,185,129,0.1)',
                  border: '0.5px solid rgba(16,185,129,0.4)',
                  color: '#10b981',
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
    { label: 'Engagement', value: '12.4%', sub: '+2.1% wk', accent: '#a855f7' },
    { label: 'Reach', value: '184K', sub: '7-day', accent: '#06b6d4' },
    { label: 'Saves', value: '2.3K', sub: '/1K views', accent: '#f59e0b' },
    { label: 'Followers', value: '+312', sub: 'this week', accent: '#10b981' },
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
          <TrendingUp size={11} color="#f59e0b" />
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
                <Star size={10} color="#f59e0b" fill="#f59e0b" />
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
                  color: '#10b981',
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
