import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Grid3x3,
  CalendarDays,
  Plus,
  Share2,
  RefreshCw,
  Loader2,
  Heart,
  Eye,
  MessageCircle,
  Bookmark,
  Edit3,
  Trash2,
  Instagram,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import PageShell from '../components/PageShell'
import { useAuth, workflowApi } from '../lib/auth'

// ---- design tokens (monochrome theme) ----
const BG_PAGE = '#000000'
const BG_CARD = '#111111'
const BG_ELEVATED = '#1A1A1A'
const BG_INPUT = '#141414'
const BORDER = '#2A2A2A'
const BORDER_SUBTLE = '#1A1A1A'
const TEXT = '#FFFFFF'
const TEXT_MUTED = '#A0A0A0'
const TEXT_DIM = '#666666'
const TEXT_PLACEHOLDER = '#555555'

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

const money = (n) => Number(n || 0).toLocaleString()
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'posts', label: 'Posts', icon: Grid3x3 },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'create', label: 'Create', icon: Plus },
]

export default function Social() {
  const { appAuth } = useAuth()
  const [tab, setTab] = useState('overview')
  const [posts, setPosts] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [editingPost, setEditingPost] = useState(null)

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
          <Share2 size={36} style={{ color: TEXT_DIM, marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
            Access Denied
          </h2>
          <p style={{ fontSize: 14, color: TEXT_MUTED, lineHeight: 1.6 }}>
            The Social Media manager is restricted to admins.
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
      const [postsRes, analyticsRes] = await Promise.all([
        workflowApi('get_social_posts'),
        workflowApi('get_social_analytics'),
      ])
      setPosts(postsRes?.posts || [])
      setAnalytics(analyticsRes?.analytics || null)
      setRecent(analyticsRes?.recent_posts || [])
    } catch (e) {
      showToast('Could not load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function syncAnalytics() {
    showToast('Syncing analytics…')
    try {
      const d = await workflowApi('sync_instagram_analytics')
      if (d?.success) {
        showToast(`Synced ${d.synced} posts`)
        loadAll()
      } else {
        showToast(d?.error || 'Sync failed')
      }
    } catch (e) {
      showToast('Sync failed')
    }
  }

  async function savePost(payload, mode = 'create') {
    try {
      const action = mode === 'create' ? 'create_social_post' : 'update_social_post'
      const d = await workflowApi(action, { method: 'POST', body: payload })
      if (d?.success) {
        showToast(mode === 'create' ? 'Post saved' : 'Post updated')
        loadAll()
        return true
      }
      showToast(d?.error || 'Save failed')
      return false
    } catch (e) {
      showToast('Save failed')
      return false
    }
  }

  async function deletePost(id) {
    try {
      const d = await workflowApi('delete_social_post', {
        method: 'POST',
        body: { post_id: id },
      })
      if (d?.success) {
        showToast('Post deleted')
        loadAll()
      } else {
        showToast('Could not delete')
      }
    } catch (e) {
      showToast('Could not delete')
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
              <Share2 size={22} /> Social Media Manager
            </h2>
            <p style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 6 }}>
              Plan, schedule, and publish Instagram content from one place.
            </p>
          </div>
          <button type="button" onClick={syncAnalytics} style={ghostBtn}>
            <RefreshCw size={13} />
            Sync Analytics
          </button>
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
          <OverviewTab
            loading={loading}
            analytics={analytics}
            recent={recent}
          />
        )}

        {tab === 'posts' && (
          <PostsTab
            loading={loading}
            posts={posts}
            onEdit={(p) => {
              setEditingPost(p)
              setTab('create')
            }}
            onDelete={deletePost}
          />
        )}

        {tab === 'schedule' && <ScheduleTab posts={posts} />}

        {tab === 'create' && (
          <CreateTab
            editingPost={editingPost}
            onCancelEdit={() => setEditingPost(null)}
            onSubmit={async (payload, mode) => {
              const ok = await savePost(payload, mode)
              if (ok) {
                setEditingPost(null)
                setTab('posts')
              }
            }}
          />
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
function OverviewTab({ loading, analytics, recent }) {
  const stats = [
    { label: 'Published', value: analytics?.total_published, icon: Share2 },
    { label: 'Reach', value: analytics?.total_reach, icon: Eye },
    { label: 'Likes', value: analytics?.total_likes, icon: Heart },
    { label: 'Comments', value: analytics?.total_comments, icon: MessageCircle },
    { label: 'Saves', value: analytics?.total_saves, icon: Bookmark },
  ]

  if (loading) return <LoadingBlock />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div style={{ ...card, padding: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
            Recent published posts
          </h3>
          <span style={{ fontSize: 12, color: TEXT_DIM }}>
            Last {recent.length || 0}
          </span>
        </div>
        {recent.length === 0 ? (
          <div style={{ fontSize: 13, color: TEXT_DIM, padding: '20px 0' }}>
            No published posts yet. Create one in the Create tab.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((p) => (
              <PostRow key={p.id} post={p} compact />
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
        {money(value)}
      </div>
    </div>
  )
}

// ---------- Posts ----------
function PostsTab({ loading, posts, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all')

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'draft', label: 'Drafts' },
  ]

  const filtered = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.status === filter)),
    [posts, filter],
  )

  if (loading) return <LoadingBlock />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filterTabs.map((f) => {
          const active = filter === f.key
          const count = f.key === 'all' ? posts.length : posts.filter((p) => p.status === f.key).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: active ? TEXT : TEXT_MUTED,
                background: active ? BG_ELEVATED : 'transparent',
                border: '1px solid ' + (active ? BORDER : BORDER_SUBTLE),
                borderRadius: 999,
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              {f.label}
              <span style={{ color: TEXT_DIM, fontWeight: 500 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            ...card,
            padding: 48,
            textAlign: 'center',
            color: TEXT_MUTED,
            fontSize: 13.5,
          }}
        >
          No posts in this view.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    published: { bg: '#FFFFFF', color: '#000000', label: 'Published' },
    scheduled: { bg: BG_ELEVATED, color: TEXT, label: 'Scheduled' },
    draft: { bg: '#0A0A0A', color: TEXT_MUTED, label: 'Draft' },
  }
  const s = styles[status] || styles.draft
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: s.bg,
        color: s.color,
        border: '1px solid ' + BORDER,
        borderRadius: 999,
        padding: '3px 10px',
      }}
    >
      {s.label}
    </span>
  )
}

function PostCard({ post, onEdit, onDelete }) {
  const dateLabel =
    post.status === 'published'
      ? `Published ${fmtDate(post.published_at)}`
      : post.status === 'scheduled'
        ? `Scheduled ${fmtDateTime(post.scheduled_at)}`
        : `Created ${fmtDate(post.created_at)}`

  return (
    <div
      style={{
        ...card,
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          aspectRatio: '1 / 1',
          background: BG_ELEVATED,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageIcon size={24} style={{ color: TEXT_DIM }} />
        )}
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={post.status} />
          <span style={{ fontSize: 11, color: TEXT_DIM }}>{dateLabel}</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: TEXT,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.caption}
        </div>
        {post.status === 'published' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              padding: '8px 0',
              borderTop: '1px solid ' + BORDER_SUBTLE,
              borderBottom: '1px solid ' + BORDER_SUBTLE,
              fontSize: 11,
              color: TEXT_MUTED,
            }}
          >
            <Metric icon={Heart} value={post.likes} />
            <Metric icon={Eye} value={post.reach} />
            <Metric icon={MessageCircle} value={post.comments} />
            <Metric icon={Bookmark} value={post.saves} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          {post.status !== 'published' && (
            <button
              type="button"
              onClick={() => onEdit(post)}
              style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}
            >
              <Edit3 size={12} /> Edit
            </button>
          )}
          {post.status !== 'published' && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              style={{ ...dangerBtn, padding: '6px 12px', fontSize: 12 }}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, value }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} style={{ color: TEXT_DIM }} />
      <span style={{ color: TEXT }}>{money(value)}</span>
    </div>
  )
}

function PostRow({ post, compact }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: compact ? '10px 0' : '14px 0',
        borderTop: '1px solid ' + BORDER_SUBTLE,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: 8,
          background: BG_ELEVATED,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {post.image_url ? (
          <img
            src={post.image_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImageIcon size={16} style={{ color: TEXT_DIM }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: TEXT,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {post.caption}
        </div>
        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>
          {fmtDate(post.published_at)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: TEXT_MUTED }}>
        <span><Heart size={11} /> {money(post.likes)}</span>
        <span><Eye size={11} /> {money(post.reach)}</span>
        <span><MessageCircle size={11} /> {money(post.comments)}</span>
      </div>
    </div>
  )
}

// ---------- Schedule (calendar) ----------
function ScheduleTab({ posts }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState(null)

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  function shift(delta) {
    const m = cursor.month + delta
    const year = cursor.year + Math.floor(m / 12)
    const month = ((m % 12) + 12) % 12
    setCursor({ year, month })
    setSelectedDay(null)
  }

  // First day of month + days in month
  const firstDow = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()

  // Group posts by yyyy-mm-dd (key from scheduled_at OR published_at OR created_at).
  const postsByDay = useMemo(() => {
    const map = {}
    for (const p of posts) {
      const ref = p.scheduled_at || p.published_at || p.created_at
      if (!ref) continue
      const d = new Date(ref)
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue
      const key = d.getDate()
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [posts, cursor])

  const selectedPosts = selectedDay ? postsByDay[selectedDay] || [] : []
  const dowLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, padding: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => shift(-1)}
            style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}
          >
            ‹ Prev
          </button>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>{monthLabel}</h3>
          <button
            type="button"
            onClick={() => shift(1)}
            style={{ ...ghostBtn, padding: '6px 12px', fontSize: 12 }}
          >
            Next ›
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 4,
            marginBottom: 8,
          }}
        >
          {dowLabels.map((d) => (
            <div
              key={d}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: TEXT_DIM,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textAlign: 'center',
                padding: '6px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={'pad-' + i} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayPosts = postsByDay[day] || []
            const active = selectedDay === day
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(active ? null : day)}
                style={{
                  aspectRatio: '1 / 1',
                  background: active ? BG_ELEVATED : BG_CARD,
                  border: '1px solid ' + (active ? '#FFFFFF' : BORDER_SUBTLE),
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: 6,
                  color: TEXT,
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>{day}</span>
                {dayPosts.length > 0 && (
                  <span style={{ display: 'flex', gap: 3 }}>
                    {dayPosts.slice(0, 4).map((p, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background:
                            p.status === 'published'
                              ? '#FFFFFF'
                              : p.status === 'scheduled'
                                ? '#AAAAAA'
                                : '#444444',
                        }}
                      />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid ' + BORDER_SUBTLE,
            fontSize: 11,
            color: TEXT_DIM,
            justifyContent: 'center',
          }}
        >
          <LegendDot color="#FFFFFF" label="Published" />
          <LegendDot color="#AAAAAA" label="Scheduled" />
          <LegendDot color="#444444" label="Draft" />
        </div>
      </div>

      {selectedDay && (
        <div style={{ ...card, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 12 }}>
            {monthLabel.split(' ')[0]} {selectedDay} — {selectedPosts.length}{' '}
            {selectedPosts.length === 1 ? 'post' : 'posts'}
          </h3>
          {selectedPosts.length === 0 ? (
            <div style={{ fontSize: 13, color: TEXT_DIM }}>No posts on this day.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedPosts.map((p) => (
                <PostRow key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  )
}

// ---------- Create / Edit ----------
function CreateTab({ editingPost, onCancelEdit, onSubmit }) {
  const [caption, setCaption] = useState(editingPost?.caption || '')
  const [imageUrl, setImageUrl] = useState(editingPost?.image_url || '')
  const [scheduleNow, setScheduleNow] = useState(!editingPost?.scheduled_at)
  const [scheduledAt, setScheduledAt] = useState(
    editingPost?.scheduled_at ? toLocalInput(editingPost.scheduled_at) : '',
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCaption(editingPost?.caption || '')
    setImageUrl(editingPost?.image_url || '')
    setScheduleNow(!editingPost?.scheduled_at)
    setScheduledAt(
      editingPost?.scheduled_at ? toLocalInput(editingPost.scheduled_at) : '',
    )
  }, [editingPost])

  const mode = editingPost ? 'edit' : 'create'

  function buildPayload(status) {
    return {
      post_id: editingPost?.id,
      caption,
      image_url: imageUrl || null,
      scheduled_at: scheduleNow || status === 'draft' ? null : new Date(scheduledAt).toISOString(),
      status,
    }
  }

  async function handleAction(status) {
    if (!caption.trim()) return
    if (status === 'scheduled' && !scheduleNow && !scheduledAt) return
    setSubmitting(true)
    try {
      await onSubmit(buildPayload(status), mode === 'edit' ? 'update' : 'create')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
        gap: 18,
        alignItems: 'start',
      }}
    >
      {/* Composer */}
      <div style={{ ...card, padding: 22 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
            {mode === 'edit' ? 'Edit post' : 'Create new post'}
          </h3>
          {mode === 'edit' && (
            <button
              type="button"
              onClick={onCancelEdit}
              style={{
                ...ghostBtn,
                padding: '4px 10px',
                fontSize: 11.5,
                border: 'none',
                color: TEXT_DIM,
              }}
            >
              <X size={12} /> Cancel edit
            </button>
          )}
        </div>

        {/* Platform */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Platform</label>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 999,
              background: BG_ELEVATED,
              border: '1px solid ' + BORDER,
              color: TEXT,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <Instagram size={13} /> Instagram
          </div>
        </div>

        {/* Caption */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            Caption
            <span style={{ float: 'right', color: caption.length > 2200 ? '#FF4444' : TEXT_DIM }}>
              {caption.length} / 2200
            </span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={2200}
            rows={6}
            placeholder="Write your caption…"
            style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }}
          />
        </div>

        {/* Image URL */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            style={inputStyle}
          />
        </div>

        {/* Schedule */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Posting time</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => setScheduleNow(true)}
              style={toggleBtn(scheduleNow)}
            >
              Post now
            </button>
            <button
              type="button"
              onClick={() => setScheduleNow(false)}
              style={toggleBtn(!scheduleNow)}
            >
              Schedule for later
            </button>
          </div>
          {!scheduleNow && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            paddingTop: 14,
            borderTop: '1px solid ' + BORDER_SUBTLE,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction('draft')}
            style={ghostBtn}
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={
              submitting ||
              !caption.trim() ||
              (!scheduleNow && !scheduledAt)
            }
            onClick={() => handleAction('scheduled')}
            style={primaryBtn}
          >
            {submitting ? <Loader2 size={13} className="spin" /> : null}
            {scheduleNow ? 'Publish at next cron' : 'Schedule post'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <PhonePreview caption={caption} imageUrl={imageUrl} />
    </div>
  )
}

function toggleBtn(active) {
  return {
    flex: 1,
    fontSize: 12.5,
    fontWeight: 600,
    color: active ? '#000000' : TEXT,
    background: active ? '#FFFFFF' : 'transparent',
    border: '1px solid ' + (active ? '#FFFFFF' : BORDER),
    borderRadius: 8,
    padding: '9px 12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

function toLocalInput(iso) {
  // datetime-local expects "YYYY-MM-DDTHH:MM" in local time.
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function PhonePreview({ caption, imageUrl }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 16,
        background: '#000000',
        border: '8px solid ' + BG_ELEVATED,
        borderRadius: 36,
        padding: 14,
        boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid #E5E5E5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#000000',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              LL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#000000' }}>
                lithoslabs
              </span>
              <span style={{ fontSize: 9.5, color: '#666666' }}>Sponsored</span>
            </div>
          </div>
          <span style={{ fontSize: 14, color: '#000000' }}>•••</span>
        </div>
        {/* Image */}
        <div
          style={{
            aspectRatio: '1 / 1',
            background: '#F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={28} style={{ color: '#999999' }} />
          )}
        </div>
        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '10px 14px 6px',
            color: '#000000',
          }}
        >
          <Heart size={20} />
          <MessageCircle size={20} />
          <Share2 size={20} />
          <Bookmark size={20} style={{ marginLeft: 'auto' }} />
        </div>
        {/* Caption */}
        <div
          style={{
            padding: '0 14px 14px',
            fontSize: 12,
            color: '#000000',
            lineHeight: 1.45,
            maxHeight: 140,
            overflow: 'auto',
            wordBreak: 'break-word',
          }}
        >
          <strong style={{ marginRight: 6 }}>lithoslabs</strong>
          {caption || (
            <span style={{ color: '#999999', fontStyle: 'italic' }}>
              Your caption will appear here…
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          color: TEXT_DIM,
          textAlign: 'center',
          marginTop: 10,
        }}
      >
        Live preview · Instagram feed
      </div>
    </div>
  )
}

// ---------- Misc ----------
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
