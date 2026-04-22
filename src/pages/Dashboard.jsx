import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Plus, ArrowUpRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import db from '@/lib/db'
import AddLeadModal from '../components/AddLeadModal'
import AddTaskModal from '../components/AddTaskModal'
import PageShell, { staggerContainer, staggerItem } from '../components/PageShell'
import { useCountUp } from '../utils/useCountUp'
import useIsMobile from '../utils/useIsMobile'

const STAGE_ORDER = [
  { key: 'lead', label: 'Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'interested', label: 'Interested' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
]

const DONUT_SHADES = [
  '#ffffff',
  '#cccccc',
  '#999999',
  '#666666',
  '#444444',
  '#333333',
]

const cardStyle = {
  background: 'var(--bg-card)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card), 0 0 30px rgba(99,120,255,0.05)',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
}

const glassCardStyle = {
  background: 'var(--bg-card)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-card)',
  backdropFilter: 'blur(12px) saturate(160%)',
  WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
}

const cardTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '0.01em',
}

const cardSubtitleStyle = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.35)',
  marginTop: 2,
}

const statLabelStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.45)',
  fontWeight: 500,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

const statNumberStyle = {
  fontSize: '2.5rem',
  fontWeight: 700,
  color: '#ffffff',
  lineHeight: 1,
  letterSpacing: '-0.02em',
}

const statSmallLabelStyle = {
  fontSize: 12,
  color: 'rgba(255,255,255,0.4)',
  marginTop: 6,
}

const quickActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  background: 'rgba(255,255,255,0.06)',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.15s ease',
}

const industryPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: 11,
  fontWeight: 500,
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Working late,'
}

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(v) {
  if (v === null || v === undefined) return '$0'
  const n = Number(v) || 0
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function scoreColor(score) {
  if (score >= 7) return '#ffffff'
  if (score >= 4) return 'rgba(255,255,255,0.5)'
  return 'rgba(255,255,255,0.2)'
}

function TrendPill({ delta, suffix = '' }) {
  if (delta == null || !Number.isFinite(delta)) return null
  const rounded = Math.round(delta)
  const text = rounded === 0 ? 'flat' : `${rounded > 0 ? '+' : ''}${rounded}${suffix}`
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        background: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.55)',
        fontWeight: 600,
        letterSpacing: '0.03em',
      }}
    >
      {text}
    </span>
  )
}

function Skeleton({ width = '60%', height = 32, style }) {
  return (
    <div
      className="cos-skeleton"
      style={{ width, height, ...style }}
    />
  )
}

function CountUpNumber({ target }) {
  const value = useCountUp(target, 900)
  return <>{value.toLocaleString()}</>
}

function CurrencyCountUp({ target }) {
  const value = useCountUp(target, 900)
  return <>${Math.round(value).toLocaleString()}</>
}

function PercentCountUp({ target }) {
  const value = useCountUp(target, 900)
  return <>{value}%</>
}

function StatCard({ label, value, sub, loading, trend, ambient = false }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{
        scale: 1.01,
        borderColor: 'var(--border-bright)',
      }}
      transition={{ duration: 0.2 }}
      style={{
        ...cardStyle,
        boxShadow: ambient
          ? 'var(--shadow-card), 0 0 30px rgba(99,120,255,0.05)'
          : 'var(--shadow-card)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={statLabelStyle}>{label}</div>
        {!loading && trend}
      </div>
      <div style={{ marginTop: 14, minHeight: 40 }}>
        {loading ? (
          <Skeleton width="55%" height={36} />
        ) : (
          <div style={statNumberStyle}>{value}</div>
        )}
      </div>
      <div style={statSmallLabelStyle}>{sub}</div>
    </motion.div>
  )
}

function ChartTooltip({ active, payload, labelKey = 'label', valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const label = row[labelKey] ?? payload[0].name
  const value = payload[0].value
  return (
    <div
      style={{
        background: '#ffffff',
        color: '#000000',
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ color: 'rgba(0,0,0,0.55)', fontWeight: 500, marginBottom: 2 }}>
        {label}
      </div>
      <div>{valueFormatter(value)}</div>
    </div>
  )
}

function PipelineBarChart({ data }) {
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div
        style={{
          height: 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
        }}
      >
        No deals yet
      </div>
    )
  }
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
          <XAxis
            type="number"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={<ChartTooltip />}
          />
          <Bar
            dataKey="count"
            fill="rgba(255,255,255,0.7)"
            background={{ fill: 'rgba(255,255,255,0.06)', radius: 4 }}
            radius={[4, 4, 4, 4]}
            barSize={16}
            isAnimationActive={false}
            maxBarSize={max}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function IndustryDonut({ data }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
        }}
      >
        No leads yet
      </div>
    )
  }

  const total = data.reduce((acc, d) => acc + d.value, 0)

  return (
    <div>
      <div style={{ width: '100%', height: 200, position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip content={<ChartTooltip labelKey="label" />} />
            <Pie
              data={data}
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              nameKey="label"
              stroke="#111111"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={DONUT_SHADES[index % DONUT_SHADES.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            leads
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {data.map((row, idx) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: DONUT_SHADES[idx % DONUT_SHADES.length],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.label}
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivitySparkline({ data }) {
  if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 12,
        }}
      >
        Nothing tracked yet
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height: 60 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={<ChartTooltip labelKey="label" />}
          />
          <Bar
            dataKey="count"
            fill="rgba(255,255,255,0.6)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function RevenueAreaChart({ data }) {
  const hasData = data && data.some((d) => d.revenue > 0)
  if (!hasData) {
    return (
      <div
        style={{
          height: 260,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
        }}
      >
        No closed deals yet — go close some 💪
      </div>
    )
  }
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            width={70}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
            content={<ChartTooltip valueFormatter={(v) => formatCurrency(v)} />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={{ r: 3, fill: '#ffffff', stroke: '#ffffff' }}
            activeDot={{ r: 4, fill: '#ffffff' }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totals, setTotals] = useState({
    totalLeads: 0,
    leadsThisWeek: 0,
    leadsLastWeek: 0,
    pipelineValue: 0,
    revenueClosed: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    winRate: 0,
    wonCount: 0,
    lostCount: 0,
    discovered: 0,
  })
  const [stageCounts, setStageCounts] = useState({})
  const [todayTasks, setTodayTasks] = useState([])
  const [industryData, setIndustryData] = useState([])
  const [recentLeads, setRecentLeads] = useState([])
  const [activitySummary, setActivitySummary] = useState({
    total: 0,
    byType: { call: 0, whatsapp: 0, email: 0, dm: 0 },
    daily: [],
  })
  const [revenueSeries, setRevenueSeries] = useState([])
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)

  async function loadDashboard() {
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
      const [
        leadsCountRows,
        leadsWeeklyRows,
        dealsAggRows,
        stageRows,
        todayTasksRows,
        industryRows,
        recentLeadsRows,
        activityTotalRows,
        activityTypeRows,
        activityDailyRows,
        revenueRows,
        revenueMonthlyRows,
        discoveredRows,
      ] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS count FROM leads'),
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS this_week,
            COUNT(*) FILTER (
              WHERE created_at >= now() - interval '14 days'
                AND created_at < now() - interval '7 days'
            )::int AS last_week
          FROM leads
        `),
        db.query(`
          SELECT
            COALESCE(SUM(proposed_price) FILTER (WHERE stage NOT IN ('closed_won','closed_lost')), 0)::float AS pipeline_value,
            COALESCE(SUM(COALESCE(final_price, proposed_price)) FILTER (WHERE stage = 'closed_won'), 0)::float AS revenue_closed,
            COUNT(*) FILTER (WHERE stage = 'closed_won')::int AS won_count,
            COUNT(*) FILTER (WHERE stage = 'closed_lost')::int AS lost_count
          FROM deals
        `),
        db.query(`
          SELECT stage, COUNT(*)::int AS count
          FROM deals
          GROUP BY stage
        `),
        db.query(`
          SELECT tasks.*, leads.company_name
          FROM tasks
          LEFT JOIN leads ON tasks.lead_id = leads.id
          WHERE tasks.is_complete = false
            AND tasks.due_date = CURRENT_DATE
          ORDER BY
            CASE tasks.priority
              WHEN 'high' THEN 0
              WHEN 'medium' THEN 1
              WHEN 'low' THEN 2
              ELSE 3
            END ASC
          LIMIT 5
        `),
        db.query(`
          SELECT industry, COUNT(*)::int AS count
          FROM leads
          WHERE industry IS NOT NULL AND industry <> ''
          GROUP BY industry
          ORDER BY count DESC
          LIMIT 6
        `),
        db.query(`
          SELECT id, company_name, industry, status, opportunity_score
          FROM leads
          ORDER BY created_at DESC
          LIMIT 5
        `),
        db.query(`
          SELECT COUNT(*)::int AS count
          FROM activities
          WHERE created_at >= date_trunc('week', now())
        `),
        db.query(`
          SELECT type, COUNT(*)::int AS count
          FROM activities
          WHERE created_at >= date_trunc('week', now())
          GROUP BY type
        `),
        db.query(`
          SELECT
            to_char(date_trunc('day', day_series), 'Dy') AS label,
            to_char(date_trunc('day', day_series), 'YYYY-MM-DD') AS day_key,
            COALESCE(counts.count, 0)::int AS count
          FROM generate_series(
            date_trunc('day', now() - interval '6 days'),
            date_trunc('day', now()),
            interval '1 day'
          ) AS day_series
          LEFT JOIN (
            SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS count
            FROM activities
            GROUP BY day
          ) counts ON counts.day = day_series
          ORDER BY day_series ASC
        `),
        db.query(`
          SELECT
            to_char(date_trunc('month', month_series), 'Mon') AS label,
            to_char(date_trunc('month', month_series), 'YYYY-MM') AS month_key,
            COALESCE(SUM(COALESCE(deals.final_price, deals.proposed_price)), 0)::float AS revenue
          FROM generate_series(
            date_trunc('month', now() - interval '5 months'),
            date_trunc('month', now()),
            interval '1 month'
          ) AS month_series
          LEFT JOIN deals
            ON deals.stage = 'closed_won'
            AND date_trunc('month', COALESCE(deals.closed_at, deals.created_at)) = month_series
          GROUP BY month_series
          ORDER BY month_series ASC
        `),
        db.query(`
          SELECT
            COALESCE(SUM(COALESCE(final_price, proposed_price)) FILTER (
              WHERE stage = 'closed_won'
                AND COALESCE(closed_at, created_at) >= date_trunc('month', now())
            ), 0)::float AS this_month,
            COALESCE(SUM(COALESCE(final_price, proposed_price)) FILTER (
              WHERE stage = 'closed_won'
                AND COALESCE(closed_at, created_at) >= date_trunc('month', now()) - interval '1 month'
                AND COALESCE(closed_at, created_at) < date_trunc('month', now())
            ), 0)::float AS last_month
          FROM deals
        `),
        db.query(
          `SELECT COUNT(*)::int AS count FROM leads WHERE source = 'google_places'`,
        ),
      ])

      const agg = dealsAggRows?.[0] || {}
      const won = agg.won_count ?? 0
      const lost = agg.lost_count ?? 0
      const decided = won + lost
      const winRate = decided === 0 ? 0 : Math.round((won / decided) * 100)

      const counts = {}
      for (const row of stageRows || []) counts[row.stage] = row.count

      const revenueMonthly = revenueMonthlyRows?.[0] || {}

      setTotals({
        totalLeads: leadsCountRows?.[0]?.count ?? 0,
        leadsThisWeek: leadsWeeklyRows?.[0]?.this_week ?? 0,
        leadsLastWeek: leadsWeeklyRows?.[0]?.last_week ?? 0,
        pipelineValue: agg.pipeline_value ?? 0,
        revenueClosed: agg.revenue_closed ?? 0,
        revenueThisMonth: revenueMonthly.this_month ?? 0,
        revenueLastMonth: revenueMonthly.last_month ?? 0,
        winRate,
        wonCount: won,
        lostCount: lost,
        discovered: discoveredRows?.[0]?.count ?? 0,
      })
      setStageCounts(counts)
      setTodayTasks(todayTasksRows || [])
      setIndustryData(
        (industryRows || []).map((r) => ({ label: r.industry, value: r.count })),
      )
      setRecentLeads(recentLeadsRows || [])

      const byType = { call: 0, whatsapp: 0, email: 0, dm: 0 }
      for (const row of activityTypeRows || []) {
        if (row.type && byType[row.type] !== undefined) byType[row.type] = row.count
        else if (row.type) byType[row.type] = row.count
      }
      setActivitySummary({
        total: activityTotalRows?.[0]?.count ?? 0,
        byType,
        daily: (activityDailyRows || []).map((r) => ({
          label: r.label,
          count: r.count,
        })),
      })
      setRevenueSeries(
        (revenueRows || []).map((r) => ({ label: r.label, revenue: r.revenue })),
      )
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function toggleTaskComplete(task) {
    if (!db) return
    setTodayTasks((prev) => prev.filter((t) => t.id !== task.id))
    try {
      await db.query(
        `UPDATE tasks
         SET is_complete = true, completed_at = now()
         WHERE id = $1`,
        [task.id],
      )
    } catch (err) {
      console.error(err)
      setTodayTasks((prev) => [...prev, task])
    }
  }

  const pipelineData = useMemo(
    () =>
      STAGE_ORDER.map((s) => ({
        label: s.label,
        count: stageCounts[s.key] || 0,
      })),
    [stageCounts],
  )

  const leadsTrend = useMemo(() => {
    const thisWeek = totals.leadsThisWeek
    const lastWeek = totals.leadsLastWeek
    if (lastWeek === 0) return thisWeek > 0 ? 100 : null
    return ((thisWeek - lastWeek) / lastWeek) * 100
  }, [totals.leadsThisWeek, totals.leadsLastWeek])

  const revenueTrend = useMemo(() => {
    const tm = totals.revenueThisMonth
    const lm = totals.revenueLastMonth
    if (lm === 0) return tm > 0 ? 100 : null
    return ((tm - lm) / lm) * 100
  }, [totals.revenueThisMonth, totals.revenueLastMonth])

  return (
    <PageShell style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            {getGreeting()}, Eugene
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 4,
            }}
          >
            {formatToday()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={quickActionStyle}
            onClick={() => setAddLeadOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Lead
          </button>
          <button
            type="button"
            style={quickActionStyle}
            onClick={() => setAddTaskOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Task
          </button>
          <button
            type="button"
            style={quickActionStyle}
            onClick={() => navigate('/pipeline')}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            <ArrowUpRight size={14} />
            View Pipeline
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: isMobile ? 10 : 16,
        }}
      >
        <StatCard
          label="Total Leads"
          value={<CountUpNumber target={totals.totalLeads} />}
          sub="In your database"
          loading={loading}
          ambient
          trend={<TrendPill delta={leadsTrend} suffix="%" />}
        />
        <StatCard
          label="Discovered"
          value={<CountUpNumber target={totals.discovered} />}
          sub="Found via Discover"
          loading={loading}
        />
        <StatCard
          label="Pipeline Value"
          value={<CurrencyCountUp target={totals.pipelineValue} />}
          sub="Open deals value"
          loading={loading}
          ambient
        />
        <StatCard
          label="Revenue Closed"
          value={<CurrencyCountUp target={totals.revenueClosed} />}
          sub="Closed won total"
          loading={loading}
          ambient
          trend={<TrendPill delta={revenueTrend} suffix="%" />}
        />
        <StatCard
          label="Win Rate"
          value={<PercentCountUp target={totals.winRate} />}
          sub="Close rate"
          loading={loading}
        />
      </motion.div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',
          gap: 16,
        }}
      >
        <div style={glassCardStyle}>
          <div style={{ marginBottom: 14 }}>
            <div style={cardTitleStyle}>Pipeline by Stage</div>
            <div style={cardSubtitleStyle}>Active distribution</div>
          </div>
          {loading ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center' }}>
              <Skeleton width="100%" height={200} />
            </div>
          ) : (
            <PipelineBarChart data={pipelineData} />
          )}
        </div>

        <div style={glassCardStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <div style={cardTitleStyle}>Today's Tasks</div>
              <div style={cardSubtitleStyle}>Due today</div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 24,
                height: 24,
                padding: '0 8px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.75)',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {todayTasks.length}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton height={18} width="80%" />
              <Skeleton height={18} width="60%" />
              <Skeleton height={18} width="70%" />
            </div>
          ) : todayTasks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 0',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 13,
              }}
            >
              You're all clear today
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {todayTasks.map((t, idx) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom:
                      idx === todayTasks.length - 1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleTaskComplete(t)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    aria-label="Mark complete"
                  >
                    <Check size={11} color="rgba(255,255,255,0.2)" strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/tasks')}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: '#ffffff',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.title}
                    </div>
                    {t.company_name && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.4)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.company_name}
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/tasks')}
            style={{
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 14px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            View All Tasks
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        <div style={glassCardStyle}>
          <div style={{ marginBottom: 10 }}>
            <div style={cardTitleStyle}>Leads by Industry</div>
            <div style={cardSubtitleStyle}>Distribution</div>
          </div>
          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center' }}>
              <Skeleton width="100%" height={160} />
            </div>
          ) : (
            <IndustryDonut data={industryData} />
          )}
        </div>

        <div style={glassCardStyle}>
          <div style={{ marginBottom: 10 }}>
            <div style={cardTitleStyle}>Recent Leads</div>
            <div style={cardSubtitleStyle}>Latest 5 added</div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="100%" height={26} />
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem 0',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 13,
              }}
            >
              No leads yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentLeads.map((lead, idx) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  style={{
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    padding: '10px 0',
                    borderBottom:
                      idx === recentLeads.length - 1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lead.company_name || '—'}
                    </div>
                    {lead.industry && (
                      <div style={{ marginTop: 4 }}>
                        <span style={industryPillStyle}>{lead.industry}</span>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: scoreColor(Number(lead.opportunity_score) || 0),
                      }}
                    />
                    <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>
                      {lead.opportunity_score ?? 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate('/leads')}
            style={{
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '8px 14px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            View All
          </button>
        </div>

        <div style={glassCardStyle}>
          <div style={{ marginBottom: 10 }}>
            <div style={cardTitleStyle}>Activity This Week</div>
            <div style={cardSubtitleStyle}>Touchpoints logged</div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton width="40%" height={36} />
              <Skeleton width="100%" height={60} />
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {activitySummary.total}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                activities this week
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 12,
                }}
              >
                {['call', 'whatsapp', 'email'].map((k) => (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>
                      {k === 'whatsapp' ? 'WhatsApp' : k}
                    </span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>
                      {activitySummary.byType[k] || 0}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <ActivitySparkline data={activitySummary.daily} />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={glassCardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={cardTitleStyle}>Closed Revenue Over Time</div>
            <div style={cardSubtitleStyle}>Last 6 months</div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {formatCurrency(totals.revenueClosed)} lifetime
          </div>
        </div>
        {loading ? (
          <Skeleton width="100%" height={240} />
        ) : (
          <RevenueAreaChart data={revenueSeries} />
        )}
      </div>

      <AddLeadModal
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        onCreated={() => {
          setAddLeadOpen(false)
          loadDashboard()
        }}
      />
      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onCreated={() => {
          setAddTaskOpen(false)
          loadDashboard()
        }}
      />
    </PageShell>
  )
}
