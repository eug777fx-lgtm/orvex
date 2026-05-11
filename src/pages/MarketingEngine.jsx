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
  CheckCircle2,
  CalendarClock,
  Star,
} from 'lucide-react'

const cardBg = 'rgba(17,17,20,0.8)'
const cardBlur = 'blur(12px)'
const border = '0.5px solid rgba(255,255,255,0.08)'
const textMuted = 'rgba(255,255,255,0.45)'
const textFaint = 'rgba(255,255,255,0.3)'

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
    statuses: [
      ['Scanning trends', '23 hot topics'],
      ['Analyzing comps', '3 gaps found'],
      ['Brief ready', 'Sent to Writer'],
    ],
  },
  {
    key: 'writer',
    name: 'Writer',
    color: '#06b6d4',
    icon: PenLine,
    statuses: [
      ['Drafting hooks', '8 variations'],
      ['Polishing copy', 'Tone: confident'],
      ['Caption done', 'Awaiting review'],
    ],
  },
  {
    key: 'video',
    name: 'Video Director',
    color: '#f59e0b',
    icon: Video,
    statuses: [
      ['Storyboarding', 'Scene 2 of 5'],
      ['Sourcing B-roll', 'Stock library'],
      ['Brief ready', 'Editor queued'],
    ],
  },
  {
    key: 'distribution',
    name: 'Distribution',
    color: '#10b981',
    icon: Send,
    statuses: [
      ['Scheduling IG', '9:00 AM slot'],
      ['Queue: 4 pending', 'Auto-post on'],
      ['Posted reel', '234 likes'],
    ],
  },
  {
    key: 'analytics',
    name: 'Analytics',
    color: '#ef4444',
    icon: BarChart3,
    statuses: [
      ['Scoring posts', 'Avg: 84'],
      ['Top: Reel #14', 'Score 92'],
      ['Trend dropping', 'Pivot in 2d'],
    ],
  },
]

const SCHEDULE = [
  { time: '7:00', task: 'Trend scan', agent: 'Strategy', color: '#a855f7', status: 'done' },
  { time: '8:00', task: 'Write hooks', agent: 'Writer', color: '#06b6d4', status: 'done' },
  { time: '9:00', task: 'Post to Instagram', agent: 'Distribution', color: '#10b981', status: 'active' },
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
    text: 'Open on phone screen — 47 unread DMs. Voiceover: "If you\'re reading every message, you\'ve already lost."',
  },
]

const LIVE_LOG = [
  { time: '09:14', agent: 'Distribution', action: 'Posted reel to Instagram · 234 likes in 14 min' },
  { time: '09:08', agent: 'Analytics', action: 'Trend velocity dropping on "morning routine" — pivot suggested' },
  { time: '08:52', agent: 'Writer', action: 'Generated 8 hook variations for Reel #15' },
  { time: '08:31', agent: 'Strategy', action: 'Brief approved — sent to Writer queue' },
  { time: '08:12', agent: 'Video Director', action: 'Storyboard ready for "first 90 seconds" reel' },
  { time: '07:04', agent: 'Strategy', action: 'Daily trend scan complete · 23 topics scored' },
]

const TOP_PERFORMERS = [
  { title: 'Reel · 30-second rule', score: 94 },
  { title: 'Carousel · Founder bias', score: 91 },
  { title: 'Hook · Motion vs progress', score: 87 },
]

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function MarketingEngine() {
  const [selectedBrand, setSelectedBrand] = useState('LIMITLESS')
  const [activeTab, setActiveTab] = useState('review')
  const [now, setNow] = useState(new Date())
  const [screenIndex, setScreenIndex] = useState(0)
  const [reviewItems, setReviewItems] = useState(INITIAL_REVIEW)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setScreenIndex((i) => i + 1), 4000)
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      <Header now={now} />
      <BrandSelector selected={selectedBrand} onSelect={setSelectedBrand} />
      <StatsRow />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <AgentOffice screenIndex={screenIndex} />
          <ScheduleStrip />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Tabs active={activeTab} onChange={setActiveTab} />
          {activeTab === 'review' && (
            <ReviewPanel items={reviewItems} onApprove={approve} onReject={reject} />
          )}
          {activeTab === 'log' && <LogPanel />}
          {activeTab === 'stats' && <StatsPanel />}
        </div>
      </div>
    </motion.div>
  )
}

function Header({ now }) {
  return (
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
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#fff',
          }}
        >
          AI Office
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13.5,
            color: textMuted,
            letterSpacing: '0.01em',
          }}
        >
          Your autonomous marketing team — always working
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px 6px 10px',
          borderRadius: 999,
          background: 'rgba(16,185,129,0.08)',
          border: '0.5px solid rgba(16,185,129,0.25)',
        }}
      >
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
            fontSize: 11.5,
            fontWeight: 600,
            color: '#10b981',
            letterSpacing: '0.08em',
          }}
        >
          LIVE
        </span>
        <span style={{ width: 1, height: 12, background: 'rgba(16,185,129,0.25)' }} />
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatTime(now)}
        </span>
      </div>
    </div>
  )
}

function BrandSelector({ selected, onSelect }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
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
              gap: 8,
              padding: '7px 14px',
              borderRadius: 999,
              background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: active
                ? '0.5px solid rgba(255,255,255,0.4)'
                : border,
              color: active ? '#fff' : 'rgba(255,255,255,0.65)',
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: b.color,
                boxShadow: `0 0 8px ${b.color}80`,
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
          gap: 6,
          padding: '7px 12px',
          borderRadius: 999,
          background: 'transparent',
          border: '0.5px dashed rgba(255,255,255,0.18)',
          color: textMuted,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Plus size={12} />
        Add Brand
      </button>
    </div>
  )
}

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
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 12,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: cardBg,
            backdropFilter: cardBlur,
            WebkitBackdropFilter: cardBlur,
            border,
            borderRadius: 16,
            padding: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 24,
              height: 2,
              background: s.accent,
              borderRadius: 999,
            }}
          />
          <div
            style={{
              fontSize: 11,
              color: textMuted,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: '#fff',
              marginTop: 8,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 11.5, color: textFaint, marginTop: 4 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  )
}

function AgentOffice({ screenIndex }) {
  return (
    <div
      style={{
        background: cardBg,
        backdropFilter: cardBlur,
        WebkitBackdropFilter: cardBlur,
        border,
        borderRadius: 16,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: '-0.01em',
            }}
          >
            Agent Console
          </h2>
          <span
            style={{
              fontSize: 10.5,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.1)',
              color: '#10b981',
              border: '0.5px solid rgba(16,185,129,0.2)',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            5 ACTIVE
          </span>
        </div>
        <Activity size={14} color={textMuted} />
      </div>

      <div
        style={{
          position: 'relative',
          padding: 14,
          borderRadius: 12,
          background: 'rgba(0,0,0,0.25)',
          border: '0.5px solid rgba(255,255,255,0.04)',
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {AGENTS.map((agent, i) => (
            <AgentDesk
              key={agent.key}
              agent={agent}
              screenIndex={screenIndex}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function AgentDesk({ agent, screenIndex, index }) {
  const Icon = agent.icon
  const status = agent.statuses[screenIndex % agent.statuses.length]
  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.025)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 12,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: `${agent.color}1a`,
              border: `0.5px solid ${agent.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: agent.color,
              flexShrink: 0,
            }}
          >
            <Icon size={12} />
          </div>
          <span
            style={{
              fontSize: 11.5,
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
        <motion.span
          animate={{ y: [0, -3, 0], x: [0, 2, 0] }}
          transition={{
            duration: 2 + index * 0.35,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: agent.color,
            boxShadow: `0 0 8px ${agent.color}cc`,
            flexShrink: 0,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          background: 'rgba(0,0,0,0.5)',
          border: '0.5px solid rgba(255,255,255,0.05)',
          borderRadius: 6,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 3,
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screenIndex % agent.statuses.length}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
          >
            <div
              style={{
                fontSize: 10.5,
                color: agent.color,
                fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {status[0]}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.55)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {status[1]}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ScheduleStrip() {
  return (
    <div
      style={{
        background: cardBg,
        backdropFilter: cardBlur,
        WebkitBackdropFilter: cardBlur,
        border,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CalendarClock size={14} color={textMuted} />
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '-0.01em',
          }}
        >
          Today's Schedule
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SCHEDULE.map((row, i) => {
          const done = row.status === 'done'
          const active = row.status === 'active'
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr auto',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 10,
                background: active ? 'rgba(16,185,129,0.06)' : 'transparent',
                border: active
                  ? '0.5px solid rgba(16,185,129,0.35)'
                  : '0.5px solid transparent',
                opacity: done ? 0.4 : 1,
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  color: active ? '#10b981' : textMuted,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                {row.time}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                  textDecoration: done ? 'line-through' : 'none',
                }}
              >
                {row.task}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: `${row.color}15`,
                  border: `0.5px solid ${row.color}35`,
                  color: row.color,
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
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

function Tabs({ active, onChange }) {
  const tabs = [
    { key: 'review', label: 'Review' },
    { key: 'log', label: 'Live Log' },
    { key: 'stats', label: 'Stats' },
  ]
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(255,255,255,0.03)',
        border,
        padding: 3,
        borderRadius: 999,
        alignSelf: 'flex-start',
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
              position: 'relative',
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 500,
              letterSpacing: '0.01em',
              color: isActive ? '#000' : 'rgba(255,255,255,0.5)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="marketingEngineTab"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#fff',
                  borderRadius: 999,
                  zIndex: 0,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ReviewPanel({ items, onApprove, onReject }) {
  return (
    <div
      style={{
        background: cardBg,
        backdropFilter: cardBlur,
        WebkitBackdropFilter: cardBlur,
        border,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}
      >
        <Sparkles size={13} color="#a855f7" />
        <span style={{ fontSize: 12.5, color: textMuted, letterSpacing: '0.01em' }}>
          Generated overnight · needs your approval
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {items.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: 28,
                textAlign: 'center',
                color: textMuted,
                fontSize: 13,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: '0.5px dashed rgba(255,255,255,0.08)',
              }}
            >
              <CheckCircle2
                size={20}
                color="#10b981"
                style={{ marginBottom: 8 }}
              />
              <div>All caught up — agents are drafting more.</div>
            </motion.div>
          )}
          {items.map((it) => (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
              transition={{ duration: 0.25 }}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '3px 9px',
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
                    fontSize: 11,
                    color: textFaint,
                    letterSpacing: '0.05em',
                  }}
                >
                  {it.brand}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: 'rgba(255,255,255,0.88)',
                  lineHeight: 1.5,
                }}
              >
                {it.text}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => onApprove(it.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(16,185,129,0.12)',
                    border: '0.5px solid rgba(16,185,129,0.4)',
                    color: '#10b981',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border,
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => onReject(it.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    color: textMuted,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  <X size={12} /> Reject
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function LogPanel() {
  return (
    <div
      style={{
        background: cardBg,
        backdropFilter: cardBlur,
        WebkitBackdropFilter: cardBlur,
        border,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}
      >
        <Activity size={13} color="#10b981" />
        <span style={{ fontSize: 12.5, color: textMuted, letterSpacing: '0.01em' }}>
          Real-time agent activity
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {LIVE_LOG.map((entry, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '52px 110px 1fr',
              gap: 12,
              padding: '10px 4px',
              borderBottom:
                i === LIVE_LOG.length - 1
                  ? 'none'
                  : '0.5px solid rgba(255,255,255,0.04)',
              alignItems: 'baseline',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: textFaint,
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {entry.time}
            </span>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
              {entry.agent}
            </span>
            <span
              style={{
                fontSize: 12.5,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.4,
              }}
            >
              {entry.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsPanel() {
  const cells = [
    { label: 'Engagement', value: '12.4%', sub: '+2.1% vs last week', accent: '#a855f7' },
    { label: 'Reach', value: '184K', sub: '7-day total', accent: '#06b6d4' },
    { label: 'Saves', value: '2,341', sub: 'per 1K views', accent: '#f59e0b' },
    { label: 'Followers', value: '+312', sub: 'this week', accent: '#10b981' },
  ]
  return (
    <div
      style={{
        background: cardBg,
        backdropFilter: cardBlur,
        WebkitBackdropFilter: cardBlur,
        border,
        borderRadius: 16,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {cells.map((c) => (
          <div
            key={c.label}
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '0.5px solid rgba(255,255,255,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 20,
                height: 2,
                background: c.accent,
                borderRadius: 999,
              }}
            />
            <div
              style={{
                fontSize: 10.5,
                color: textMuted,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 22,
                color: '#fff',
                fontWeight: 600,
                marginTop: 6,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </div>
            <div style={{ fontSize: 11, color: textFaint, marginTop: 2 }}>
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
            gap: 8,
            marginBottom: 8,
          }}
        >
          <TrendingUp size={13} color="#f59e0b" />
          <span style={{ fontSize: 12, color: textMuted, letterSpacing: '0.01em' }}>
            Top performers
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {TOP_PERFORMERS.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 4px',
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
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <span
                  style={{
                    fontSize: 13,
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
                  fontSize: 12,
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
