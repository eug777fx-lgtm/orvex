import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useIsMobile from '../utils/useIsMobile'

/* ============================================================
   LITHOS LABS — SALES PORTAL
   Same design language / ecosystem as the main dashboard,
   permission-scoped for sales reps.
   ============================================================ */
const T = {
  bg: '#0B0B0D',
  accent: '#C2B59B',
  text: '#F5F5F2',
  muted: 'rgba(242,237,228,0.45)',
  faint: 'rgba(242,237,228,0.28)',
  card: 'rgba(194,181,155,0.03)',
  cardHover: 'rgba(194,181,155,0.06)',
  border: '0.5px solid rgba(194,181,155,0.08)',
  borderStrong: '0.5px solid rgba(194,181,155,0.16)',
  navActiveBg: 'rgba(194,181,155,0.1)',
  navHoverBg: 'rgba(194,181,155,0.05)',
  navHoverText: 'rgba(242,237,228,0.7)',
}
const FONT =
  "system-ui, -apple-system, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
const AUTH_KEY = 'lithos_rep_auth'

const STATUS = {
  new: { label: 'New', color: '#9ca3af' },
  contacted: { label: 'Contacted', color: '#60a5fa' },
  interested: { label: 'Interested', color: '#c084fc' },
  demo_booked: { label: 'Demo Booked', color: '#fbbf24' },
  proposal_sent: { label: 'Proposal Sent', color: '#fb923c' },
  closed_won: { label: 'Closed Won', color: '#4ade80' },
  closed_lost: { label: 'Closed Lost', color: '#f87171' },
  not_interested: { label: 'Not Interested', color: '#f87171' },
}
const PIPELINE = [
  'new',
  'contacted',
  'interested',
  'demo_booked',
  'proposal_sent',
  'closed_won',
]
const DEAL_BADGE = {
  pending_approval: { c: '#fbbf24', l: 'Pending Approval' },
  approved: { c: '#4ade80', l: 'Approved' },
  rejected: { c: '#f87171', l: 'Rejected' },
  commission_paid: { c: T.accent, l: 'Commission Paid' },
}
const SOURCES = [
  'Cold Call',
  'Cold Email',
  'Referral',
  'Social Media',
  'Walk-in',
  'Discover',
  'Other',
]
const ACTIVITY_TYPES = ['call', 'email', 'whatsapp', 'meeting', 'demo', 'note']

/* ---------- API ---------- */
async function api(action, { method = 'GET', body, params } = {}) {
  try {
    if (method === 'GET') {
      const qs = new URLSearchParams({ action, ...(params || {}) }).toString()
      const r = await fetch(`/api/workflow?${qs}`)
      return await r.json()
    }
    const r = await fetch('/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(body || {}) }),
    })
    return await r.json()
  } catch {
    return { success: false, error: 'Network error' }
  }
}

/* ---------- helpers ---------- */
function timeAgo(d) {
  if (!d) return ''
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
function fmtDate(d, opts) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', opts || {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
function shortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
function money(n) {
  const v = Number(n) || 0
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
function isToday(d) {
  if (!d) return false
  const x = new Date(d)
  const n = new Date()
  return x.toDateString() === n.toDateString()
}
function isOverdue(d) {
  if (!d) return false
  return new Date(d).getTime() < Date.now() && !isToday(d)
}

/* ============================================================
   ICONS — Lucide-style, currentColor stroke
   ============================================================ */
const PATHS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  package:
    'M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  monitor:
    'M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 21h8M12 17v4',
  'check-square': 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  'file-text':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  phone:
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .37 1.97.72 2.9a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.93.35 1.9.59 2.9.72A2 2 0 0 1 22 16.92z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  message:
    'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z',
  calendar:
    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  file: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  building:
    'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01',
  'map-pin': 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  target:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  'trending-up': 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  sparkle:
    'M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z',
  copy: 'M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2zM5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  briefcase:
    'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
}
function Ico({ name, size = 16, color, fill = 'none', strokeWidth = 1.6, style }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  )
}

/* ============================================================
   UI PRIMITIVES
   ============================================================ */
function Card({ children, style, hover, onClick }) {
  const [h, setH] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      style={{
        background: h ? T.cardHover : T.card,
        border: T.border,
        borderRadius: 12,
        transition: 'background 0.15s ease, border-color 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function Pill({ children, color = T.accent, bg, style }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.01em',
        padding: '3px 9px',
        borderRadius: 999,
        color,
        background: bg || `${color}1f`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, color: T.muted }
  return (
    <Pill color={s.color}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: s.color,
        }}
      />
      {s.label}
    </Pill>
  )
}

function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  full,
  style,
}) {
  const pad = size === 'sm' ? '7px 12px' : '11px 18px'
  const fs = size === 'sm' ? 12.5 : 13.5
  const base = {
    primary: { background: T.accent, color: T.bg, border: '0.5px solid transparent' },
    ghost: {
      background: 'transparent',
      color: 'rgba(194,181,155,0.8)',
      border: '0.5px solid rgba(194,181,155,0.3)',
    },
    subtle: {
      background: T.card,
      color: T.text,
      border: T.border,
    },
    danger: {
      background: 'transparent',
      color: '#f87171',
      border: '0.5px solid rgba(248,113,113,0.3)',
    },
  }[variant]
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.015 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      style={{
        ...base,
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: fs,
        padding: pad,
        borderRadius: 9,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        width: full ? '100%' : 'auto',
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(194,181,155,0.04)',
  border: T.border,
  borderRadius: 9,
  padding: '11px 13px',
  color: T.text,
  fontSize: 13.5,
  fontFamily: FONT,
  outline: 'none',
}
function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span
        style={{
          display: 'block',
          fontSize: 11.5,
          color: T.muted,
          marginBottom: 7,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, minHeight: 90, resize: 'vertical', ...(props.style || {}) }}
    />
  )
}
function Select({ children, ...props }) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', ...(props.style || {}) }}
    >
      {children}
    </select>
  )
}

function ProgressBar({ value, max, label, hint }) {
  const v = Number(value) || 0
  const m = Number(max) || 0
  const rawPct = m > 0 ? (v / m) * 100 : 0
  const pct = Number.isFinite(rawPct) ? Math.max(0, Math.min(100, rawPct)) : 0
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 7,
        }}
      >
        <span style={{ color: T.muted }}>{label}</span>
        <span style={{ color: T.text, fontWeight: 600 }}>
          {value}
          <span style={{ color: T.faint }}> / {max}</span>
          {hint ? <span style={{ color: T.faint }}> {hint}</span> : null}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: 'rgba(194,181,155,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: T.accent,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

function Spinner({ size = 18 }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid rgba(194,181,155,0.2)`,
        borderTopColor: T.accent,
      }}
    />
  )
}

function EmptyState({ icon = 'file', title, sub }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '56px 20px',
        color: T.muted,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: T.card,
          border: T.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: T.accent,
        }}
      >
        <Ico name={icon} size={20} />
      </div>
      <div style={{ color: T.text, fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
        {title}
      </div>
      {sub ? <div style={{ fontSize: 12.5 }}>{sub}</div> : null}
    </div>
  )
}

function CopyBtn({ text, label = 'Copy', size = 'sm' }) {
  const [done, setDone] = useState(false)
  return (
    <Btn
      variant="ghost"
      size={size}
      onClick={() => {
        try {
          navigator.clipboard.writeText(text)
        } catch {
          /* ignore */
        }
        setDone(true)
        setTimeout(() => setDone(false), 1600)
      }}
    >
      <Ico name={done ? 'check' : 'copy'} size={13} />
      {done ? 'Copied' : label}
    </Btn>
  )
}

function PageTitle({ title, sub, right }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 26,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: T.text,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        {sub ? (
          <div style={{ marginTop: 6, fontSize: 13, color: T.muted }}>{sub}</div>
        ) : null}
      </div>
      {right}
    </div>
  )
}

function Modal({ open, onClose, title, children, width = 460 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 400,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: width,
              background: '#111012',
              border: T.borderStrong,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 18,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.muted,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <Ico name="x" size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SlidePanel({ open, onClose, children, isMobile }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 350,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(3px)',
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 360,
              width: isMobile ? '100%' : 480,
              maxWidth: '100%',
              background: '#0E0D10',
              borderLeft: T.borderStrong,
              overflowY: 'auto',
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Accordion({ title, sub, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <Card style={{ marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>{title}</div>
          {sub ? (
            <div style={{ color: T.muted, fontSize: 12, marginTop: 3 }}>{sub}</div>
          ) : null}
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} style={{ color: T.accent }}>
          <Ico name="chevron-right" size={16} />
        </motion.div>
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          transition: 'grid-template-rows 0.28s ease, opacity 0.2s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '0 18px 18px', borderTop: T.border }}>
            {children}
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ============================================================
   LOGIN
   ============================================================ */
function Login({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    invite: '',
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    if (mode === 'login') {
      const d = await api('rep_login', {
        method: 'POST',
        body: { email: form.email, password: form.password },
      })
      setBusy(false)
      if (d.success) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(d.rep))
        onAuth(d.rep)
      } else setErr(d.error || 'Login failed')
    } else {
      const d = await api('rep_register', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          password: form.password,
          invite_code: form.invite,
        },
      })
      setBusy(false)
      if (d.success) {
        const rep = { ...d.rep, commission_rate: 10 }
        localStorage.setItem(AUTH_KEY, JSON.stringify(rep))
        onAuth(rep)
      } else setErr(d.error || 'Registration failed')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        fontFamily: FONT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '12%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 520,
          height: 360,
          background:
            'radial-gradient(ellipse, rgba(194,181,155,0.08), transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          background: T.card,
          border: T.borderStrong,
          borderRadius: 18,
          padding: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <img
            src="/lithos-logo.png"
            alt="Lithos Labs"
            style={{ width: 30, height: 30, objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 19, color: T.text }}>
              Lithos
            </span>
            <span style={{ fontWeight: 300, fontSize: 19, color: 'rgba(194,181,155,0.6)' }}>
              Labs
            </span>
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 12.5,
            color: T.muted,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginBottom: 30,
          }}
        >
          Sales Portal
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <Field label="Full name">
              <Input value={form.name} onChange={set('name')} required />
            </Field>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
            />
          </Field>
          {mode === 'register' && (
            <Field label="Invite code">
              <Input value={form.invite} onChange={set('invite')} required />
            </Field>
          )}
          {err ? (
            <div
              style={{
                fontSize: 12.5,
                color: '#f87171',
                marginBottom: 14,
              }}
            >
              {err}
            </div>
          ) : null}
          <Btn type="submit" full disabled={busy} style={{ marginTop: 4 }}>
            {busy ? <Spinner size={15} /> : mode === 'login' ? 'Sign in' : 'Create account'}
          </Btn>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12.5,
            color: T.muted,
          }}
        >
          {mode === 'login' ? "Don't have an account? " : 'Already a rep? '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setErr('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: T.accent,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12.5,
            }}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ rep, leads, onGo }) {
  const [profile, setProfile] = useState(null)
  const [kpis, setKpis] = useState({ week: {}, today: {} })
  const [activities, setActivities] = useState([])
  const [tasks, setTasks] = useState([])
  const [overdue, setOverdue] = useState([])

  useEffect(() => {
    if (!rep?.id) return
    api('rep_profile', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setProfile(d.profile),
    )
    api('rep_kpis', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setKpis({ week: d.week || {}, today: d.today || {} }),
    )
    api('rep_activities', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setActivities(d.activities || []),
    )
    api('rep_tasks', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setTasks(d.tasks || []),
    )
    api('overdue_followups', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setOverdue(d.overdue || []),
    )
  }, [rep?.id])

  const stageCounts = PIPELINE.reduce((acc, k) => {
    acc[k] = leads.filter((l) => l.status === k).length
    return acc
  }, {})
  const tasksDueToday = tasks.filter(
    (t) => t.status !== 'done' && isToday(t.due_date),
  ).length

  const actIcon = {
    call: 'phone',
    email: 'mail',
    whatsapp: 'message',
    meeting: 'users',
    demo: 'monitor',
    note: 'file',
    status_change: 'check',
  }

  const targets = {
    calls: 50,
    leads: 15,
    deals: 2,
  }

  const stats = [
    {
      label: 'Leads Added',
      value: leads.length,
      hint: `${kpis.today?.leads_added || 0} today`,
      icon: 'users',
    },
    {
      label: 'Deals Closed',
      value: Number(profile?.deals_closed || 0),
      hint: 'all time',
      icon: 'check-square',
    },
    {
      label: 'Commission Earned',
      value: money(profile?.total_earnings || 0),
      hint: 'approved',
      icon: 'dollar',
      accent: true,
    },
    {
      label: 'Tasks Due',
      value: tasksDueToday,
      hint: 'today',
      icon: 'clock',
    },
  ]

  return (
    <div>
      <PageTitle
        title="Dashboard"
        sub={`${greeting()}, ${rep.name?.split(' ')[0] || 'there'} — ${fmtDate(new Date())}`}
      />

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <Card style={{ padding: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 12, color: T.muted }}>{s.label}</span>
                <span style={{ color: T.accent, opacity: 0.7 }}>
                  <Ico name={s.icon} size={15} />
                </span>
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: s.accent ? T.accent : T.text,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11.5, color: T.faint, marginTop: 4 }}>
                {s.hint}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pipeline strip */}
      <Card style={{ padding: 20, marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          Pipeline Overview
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {PIPELINE.map((k, i) => (
            <Fragment key={k}>
              <div
                onClick={() => onGo('leads')}
                style={{
                  flex: '1 0 auto',
                  minWidth: 120,
                  textAlign: 'center',
                  padding: '14px 10px',
                  borderRadius: 10,
                  background: T.card,
                  border: T.border,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: STATUS[k].color,
                  }}
                >
                  {stageCounts[k]}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.muted,
                    marginTop: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: STATUS[k].color,
                    }}
                  />
                  {STATUS[k].label}
                </div>
              </div>
              {i < PIPELINE.length - 1 && (
                <Ico name="chevron-right" size={14} color={T.faint} />
              )}
            </Fragment>
          ))}
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 18,
        }}
        className="sr-dash-grid"
      >
        {/* Left column */}
        <div>
          <Card style={{ padding: 20, marginBottom: 18 }}>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 18 }}
            >
              Weekly Targets
            </div>
            <ProgressBar
              label="Calls made"
              value={kpis.week?.calls_made || 0}
              max={targets.calls}
            />
            <ProgressBar
              label="Leads added"
              value={kpis.week?.leads_added || 0}
              max={targets.leads}
            />
            <ProgressBar
              label="Deals closed"
              value={kpis.week?.deals_closed || 0}
              max={targets.deals}
            />
          </Card>

          <Card style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                Upcoming Follow-ups
              </span>
              <Pill color={overdue.length ? '#fbbf24' : T.muted}>
                {overdue.length} due
              </Pill>
            </div>
            {overdue.length === 0 ? (
              <div style={{ fontSize: 12.5, color: T.muted, padding: '8px 0' }}>
                Nothing overdue. Nice work.
              </div>
            ) : (
              overdue.slice(0, 6).map((o, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom:
                      i < Math.min(overdue.length, 6) - 1 ? T.border : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
                      {o.company_name}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.muted }}>
                      {o.contact_name || '—'}
                    </div>
                  </div>
                  <Pill color={isOverdue(o.next_followup) ? '#fbbf24' : T.muted}>
                    {shortDate(o.next_followup)}
                  </Pill>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Right column — activity */}
        <Card style={{ padding: 20 }}>
          <div
            style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 16 }}
          >
            Recent Activity
          </div>
          {activities.length === 0 ? (
            <EmptyState
              icon="clock"
              title="No activity yet"
              sub="Log a call or note on a lead to see it here."
            />
          ) : (
            activities.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '11px 0',
                  borderBottom: i < activities.length - 1 ? T.border : 'none',
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: T.card,
                    border: T.border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.accent,
                    flexShrink: 0,
                  }}
                >
                  <Ico name={actIcon[a.activity_type] || 'file'} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: T.text }}>
                    <span style={{ fontWeight: 600 }}>{a.company_name}</span>
                    <span style={{ color: T.muted }}>
                      {' '}
                      · {a.description || a.activity_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>
                    {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

/* ============================================================
   LEAD DETAIL PANEL
   ============================================================ */
function LeadDetail({ lead, rep, services, onClose, onChanged, toast }) {
  const [tab, setTab] = useState('overview')
  const [acts, setActs] = useState([])
  const [busy, setBusy] = useState(false)

  const loadActs = useCallback(() => {
    api('lead_activities', { params: { lead_id: lead.id } }).then(
      (d) => d.success && setActs(d.activities || []),
    )
  }, [lead.id])
  useEffect(() => {
    loadActs()
  }, [loadActs])

  const tabs = ['overview', 'activity', 'notes']
  if (lead.status === 'closed_won') tabs.push('deal')

  async function setStatus(status) {
    setBusy(true)
    await api('update_lead_status', {
      method: 'POST',
      body: { lead_id: lead.id, rep_id: rep.id, status },
    })
    setBusy(false)
    onChanged()
    loadActs()
    toast('Status updated')
  }
  async function setFollowup(val) {
    await api('update_lead_status', {
      method: 'POST',
      body: {
        lead_id: lead.id,
        rep_id: rep.id,
        status: lead.status,
        next_followup: val ? new Date(val).toISOString() : null,
      },
    })
    onChanged()
    toast('Follow-up set')
  }

  const callLink = lead.contact_phone ? `tel:${lead.contact_phone}` : null
  const waNum = (lead.contact_whatsapp || lead.contact_phone || '').replace(
    /[^0-9]/g,
    '',
  )

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0E0D10',
          borderBottom: T.border,
          padding: '20px 22px',
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: T.text,
                letterSpacing: '-0.02em',
              }}
            >
              {lead.company_name}
            </div>
            <div style={{ marginTop: 8 }}>
              <StatusPill status={lead.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: T.muted,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Ico name="x" size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
          {tabs.map((tk) => (
            <button
              key={tk}
              onClick={() => setTab(tk)}
              style={{
                background: tab === tk ? T.navActiveBg : 'transparent',
                color: tab === tk ? T.accent : T.muted,
                border: 'none',
                borderRadius: 8,
                padding: '7px 13px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: FONT,
              }}
            >
              {tk === 'deal' ? 'Submit Deal' : tk}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 22 }}>
        {tab === 'overview' && (
          <>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 12,
                }}
              >
                Contact
              </div>
              <Row k="Name" v={lead.contact_name || '—'} />
              <Row k="Email" v={lead.contact_email || '—'} />
              <Row
                k="Phone"
                v={
                  callLink ? (
                    <a href={callLink} style={{ color: T.accent }}>
                      {lead.contact_phone}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <Row
                k="WhatsApp"
                v={
                  waNum ? (
                    <a
                      href={`https://wa.me/${waNum}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#4ade80' }}
                    >
                      Chat
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </Card>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  color: T.muted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 12,
                }}
              >
                Company
              </div>
              <Row k="Industry" v={lead.industry || '—'} />
              <Row k="Location" v={lead.location || '—'} />
              <Row k="Source" v={lead.source || '—'} />
              <Row k="Est. value" v={lead.estimated_value ? money(lead.estimated_value) : '—'} />
              {Array.isArray(lead.service_interest) &&
              lead.service_interest.length ? (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lead.service_interest.map((s) => (
                    <Pill key={s}>{s}</Pill>
                  ))}
                </div>
              ) : null}
            </Card>

            {lead.notes ? (
              <Card style={{ padding: 16, marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: T.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: 10,
                  }}
                >
                  Notes
                </div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                  {lead.notes}
                </div>
              </Card>
            ) : null}

            <div
              style={{
                fontSize: 11,
                color: T.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 10,
              }}
            >
              Update Status
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
              {Object.keys(STATUS).map((k) => (
                <button
                  key={k}
                  disabled={busy}
                  onClick={() => setStatus(k)}
                  style={{
                    background:
                      lead.status === k ? `${STATUS[k].color}22` : T.card,
                    color: lead.status === k ? STATUS[k].color : T.muted,
                    border:
                      lead.status === k
                        ? `0.5px solid ${STATUS[k].color}55`
                        : T.border,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  {STATUS[k].label}
                </button>
              ))}
            </div>
            <Field label="Next follow-up">
              <Input
                type="date"
                defaultValue={
                  lead.next_followup
                    ? new Date(lead.next_followup).toISOString().slice(0, 10)
                    : ''
                }
                onChange={(e) => setFollowup(e.target.value)}
              />
            </Field>
          </>
        )}

        {tab === 'activity' && (
          <ActivityTab
            lead={lead}
            rep={rep}
            acts={acts.filter((a) => a.activity_type !== 'note')}
            reload={() => {
              loadActs()
              onChanged()
            }}
            toast={toast}
          />
        )}

        {tab === 'notes' && (
          <NotesTab
            lead={lead}
            rep={rep}
            notes={acts.filter((a) => a.activity_type === 'note')}
            reload={loadActs}
            toast={toast}
          />
        )}

        {tab === 'deal' && (
          <SubmitDeal
            lead={lead}
            rep={rep}
            services={services}
            onDone={() => {
              onChanged()
              onClose()
              toast('Deal submitted for approval')
            }}
          />
        )}
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '7px 0',
        fontSize: 13,
      }}
    >
      <span style={{ color: T.muted }}>{k}</span>
      <span style={{ color: T.text, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function ActivityTab({ lead, rep, acts, reload, toast }) {
  const [type, setType] = useState('call')
  const [desc, setDesc] = useState('')
  const [outcome, setOutcome] = useState('')
  const [busy, setBusy] = useState(false)
  const icon = {
    call: 'phone',
    email: 'mail',
    whatsapp: 'message',
    meeting: 'users',
    demo: 'monitor',
    note: 'file',
    status_change: 'check',
  }
  async function save() {
    if (!desc.trim()) return
    setBusy(true)
    await api('add_activity', {
      method: 'POST',
      body: {
        lead_id: lead.id,
        rep_id: rep.id,
        activity_type: type,
        description: desc,
        outcome,
      },
    })
    setBusy(false)
    setDesc('')
    setOutcome('')
    reload()
    toast('Activity logged')
  }
  return (
    <>
      <div style={{ marginBottom: 22 }}>
        {acts.length === 0 ? (
          <EmptyState icon="clock" title="No activity logged yet" />
        ) : (
          acts.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom: i < acts.length - 1 ? T.border : 'none',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: T.card,
                  border: T.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.accent,
                  flexShrink: 0,
                }}
              >
                <Ico name={icon[a.activity_type] || 'file'} size={12} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: T.text }}>
                  <span
                    style={{
                      textTransform: 'capitalize',
                      fontWeight: 600,
                    }}
                  >
                    {a.activity_type}
                  </span>
                  {a.description ? (
                    <span style={{ color: T.muted }}> · {a.description}</span>
                  ) : null}
                </div>
                {a.outcome ? (
                  <div style={{ fontSize: 11.5, color: T.accent, marginTop: 3 }}>
                    {a.outcome}
                  </div>
                ) : null}
                <div style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>
                  {fmtDate(a.created_at, { month: 'short', day: 'numeric' })} ·{' '}
                  {timeAgo(a.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <Card style={{ padding: 16 }}>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t} style={{ background: T.bg }}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What happened?"
          />
        </Field>
        <Field label="Outcome">
          <Input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g. Booked a demo for Friday"
          />
        </Field>
        <Btn full disabled={busy} onClick={save}>
          {busy ? <Spinner size={14} /> : 'Save activity'}
        </Btn>
      </Card>
    </>
  )
}

function NotesTab({ lead, rep, notes, reload, toast }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!text.trim()) return
    setBusy(true)
    await api('add_activity', {
      method: 'POST',
      body: {
        lead_id: lead.id,
        rep_id: rep.id,
        activity_type: 'note',
        description: text,
      },
    })
    setBusy(false)
    setText('')
    reload()
    toast('Note added')
  }
  return (
    <>
      <div style={{ marginBottom: 18 }}>
        {notes.length === 0 ? (
          <EmptyState icon="file" title="No notes yet" />
        ) : (
          notes.map((n) => (
            <Card key={n.id} style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                {n.description}
              </div>
              <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>
                {timeAgo(n.created_at)}
              </div>
            </Card>
          ))
        )}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note..."
        style={{ marginBottom: 12 }}
      />
      <Btn full disabled={busy} onClick={save}>
        {busy ? <Spinner size={14} /> : 'Save note'}
      </Btn>
    </>
  )
}

function SubmitDeal({ lead, rep, services, onDone }) {
  const [svc, setSvc] = useState('')
  const [value, setValue] = useState('')
  const [rate, setRate] = useState(rep.commission_rate || 10)
  const [proof, setProof] = useState('')
  const [busy, setBusy] = useState(false)

  function pickService(name) {
    setSvc(name)
    const s = services.find((x) => x.name === name)
    if (s && s.commission_rate) setRate(s.commission_rate)
  }

  const commission = ((Number(value) || 0) * (Number(rate) || 0)) / 100

  async function submit() {
    if (!svc || !value) return
    setBusy(true)
    const d = await api('submit_deal', {
      method: 'POST',
      body: {
        rep_id: rep.id,
        lead_id: lead.id,
        service_name: svc,
        deal_value: Number(value),
        commission_rate: Number(rate),
        payment_proof_url: proof,
      },
    })
    setBusy(false)
    if (d.success) onDone()
  }

  return (
    <Card style={{ padding: 18 }}>
      <Field label="Service sold">
        <Select value={svc} onChange={(e) => pickService(e.target.value)}>
          <option value="" style={{ background: T.bg }}>
            Select a service
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.name} style={{ background: T.bg }}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Deal value (Afl.)">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="2500"
        />
      </Field>
      <Field label="Commission rate (%)">
        <Input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
      </Field>
      <div
        style={{
          background: 'rgba(194,181,155,0.06)',
          border: T.borderStrong,
          borderRadius: 10,
          padding: '16px 18px',
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>
          You earn
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: T.accent }}>
          {money(commission)}
        </div>
      </div>
      <Field label="Payment proof URL (optional)">
        <Input
          value={proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="https://..."
        />
      </Field>
      <Btn full disabled={busy || !svc || !value} onClick={submit}>
        {busy ? <Spinner size={14} /> : 'Submit deal for approval'}
      </Btn>
    </Card>
  )
}

/* ============================================================
   ADD LEAD FORM
   ============================================================ */
function AddLeadForm({ rep, services, prefill, onClose, onSaved }) {
  const [f, setF] = useState({
    company_name: prefill?.company_name || '',
    contact_name: prefill?.contact_name || '',
    contact_email: '',
    contact_phone: '',
    contact_whatsapp: '',
    industry: prefill?.industry || '',
    location: prefill?.location || '',
    source: prefill ? 'Discover' : 'Cold Call',
    estimated_value: prefill?.estimated_value || '',
    notes: prefill?.outreach_angle
      ? `Why good fit: ${prefill.why_good_fit || ''}\nOutreach angle: ${prefill.outreach_angle}`
      : '',
  })
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function save() {
    if (!f.company_name.trim()) return
    setBusy(true)
    const d = await api('add_lead', {
      method: 'POST',
      body: {
        rep_id: rep.id,
        ...f,
        source: f.source.toLowerCase().replace(/ /g, '_'),
        estimated_value: f.estimated_value ? Number(f.estimated_value) : null,
        service_interest: picked,
      },
    })
    setBusy(false)
    if (d.success) onSaved()
  }

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0E0D10',
          borderBottom: T.border,
          padding: '20px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
          Add Lead
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}
        >
          <Ico name="x" size={18} />
        </button>
      </div>
      <div style={{ padding: 22 }}>
        <Field label="Company name *">
          <Input value={f.company_name} onChange={set('company_name')} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contact name">
            <Input value={f.contact_name} onChange={set('contact_name')} />
          </Field>
          <Field label="Email">
            <Input value={f.contact_email} onChange={set('contact_email')} />
          </Field>
          <Field label="Phone">
            <Input value={f.contact_phone} onChange={set('contact_phone')} />
          </Field>
          <Field label="WhatsApp">
            <Input value={f.contact_whatsapp} onChange={set('contact_whatsapp')} />
          </Field>
          <Field label="Industry">
            <Input value={f.industry} onChange={set('industry')} />
          </Field>
          <Field label="Location">
            <Input value={f.location} onChange={set('location')} />
          </Field>
        </div>
        <Field label="Source">
          <Select value={f.source} onChange={set('source')}>
            {SOURCES.map((s) => (
              <option key={s} value={s} style={{ background: T.bg }}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Services interested">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {services.map((s) => {
              const on = picked.includes(s.name)
              return (
                <button
                  key={s.id}
                  onClick={() =>
                    setPicked((p) =>
                      on ? p.filter((x) => x !== s.name) : [...p, s.name],
                    )
                  }
                  style={{
                    background: on ? T.navActiveBg : T.card,
                    color: on ? T.accent : T.muted,
                    border: on ? `0.5px solid ${T.accent}55` : T.border,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Estimated value (Afl.)">
          <Input
            type="number"
            value={f.estimated_value}
            onChange={set('estimated_value')}
          />
        </Field>
        <Field label="Notes">
          <Textarea value={f.notes} onChange={set('notes')} />
        </Field>
        <Btn full disabled={busy || !f.company_name.trim()} onClick={save}>
          {busy ? <Spinner size={14} /> : 'Save lead'}
        </Btn>
      </div>
    </div>
  )
}

/* ============================================================
   LEADS
   ============================================================ */
function Leads({ rep, leads, services, reload, isMobile, toast, prefill, clearPrefill }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [openLead, setOpenLead] = useState(null)
  const [adding, setAdding] = useState(!!prefill)

  const filtered = leads.filter((l) => {
    if (filter !== 'all' && l.status !== filter) return false
    if (q) {
      const s = q.toLowerCase()
      return (
        (l.company_name || '').toLowerCase().includes(s) ||
        (l.contact_name || '').toLowerCase().includes(s)
      )
    }
    return true
  })

  const pills = ['all', ...Object.keys(STATUS)]

  return (
    <div>
      <PageTitle
        title="My Leads"
        sub={`${leads.length} total`}
        right={
          <Btn onClick={() => setAdding(true)}>
            <Ico name="plus" size={14} />
            Add Lead
          </Btn>
        }
      />

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        {pills.map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            style={{
              background: filter === p ? T.navActiveBg : T.card,
              color: filter === p ? T.accent : T.muted,
              border: filter === p ? `0.5px solid ${T.accent}44` : T.border,
              borderRadius: 999,
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            {p === 'all' ? 'All' : STATUS[p].label}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span
          style={{
            position: 'absolute',
            left: 13,
            top: '50%',
            transform: 'translateY(-50%)',
            color: T.muted,
          }}
        >
          <Ico name="search" size={15} />
        </span>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by company or contact name..."
          style={{ paddingLeft: 38 }}
        />
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 8 }}>
          <EmptyState
            icon="users"
            title="No leads here"
            sub="Add a lead or adjust your filters."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.35 }}
            >
              <Card
                hover
                onClick={() => setOpenLead(l)}
                style={{ padding: 16 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: T.text,
                      }}
                    >
                      {l.company_name}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                      {l.contact_name || '—'}
                      {l.industry ? ` · ${l.industry}` : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    {l.estimated_value ? (
                      <span style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>
                        {money(l.estimated_value)}
                      </span>
                    ) : null}
                    <StatusPill status={l.status} />
                    <span
                      style={{
                        fontSize: 11.5,
                        color: T.faint,
                        minWidth: 56,
                        textAlign: 'right',
                      }}
                    >
                      {l.last_activity ? timeAgo(l.last_activity) : 'new'}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <SlidePanel open={!!openLead} onClose={() => setOpenLead(null)} isMobile={isMobile}>
        {openLead && (
          <LeadDetail
            lead={openLead}
            rep={rep}
            services={services}
            toast={toast}
            onClose={() => setOpenLead(null)}
            onChanged={async () => {
              await reload()
            }}
          />
        )}
      </SlidePanel>

      <SlidePanel
        open={adding}
        onClose={() => {
          setAdding(false)
          clearPrefill && clearPrefill()
        }}
        isMobile={isMobile}
      >
        {adding && (
          <AddLeadForm
            rep={rep}
            services={services}
            prefill={prefill}
            onClose={() => {
              setAdding(false)
              clearPrefill && clearPrefill()
            }}
            onSaved={async () => {
              setAdding(false)
              clearPrefill && clearPrefill()
              await reload()
              toast('Lead added')
            }}
          />
        )}
      </SlidePanel>
    </div>
  )
}

/* ============================================================
   DISCOVER
   ============================================================ */
function Discover({ rep, leads, onSaveLead }) {
  const [sub, setSub] = useState('search')
  const [q, setQ] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState([])
  const [err, setErr] = useState('')

  async function run() {
    if (!q.trim()) return
    setBusy(true)
    setErr('')
    setResults([])
    const d = await api('discover_leads', {
      method: 'POST',
      body: { query: q, industry, location, rep_id: rep.id },
    })
    setBusy(false)
    if (d.success) setResults(d.results || [])
    else setErr(d.error || 'Discovery failed')
  }

  const saved = leads.filter((l) => l.source === 'discover')

  return (
    <div>
      <PageTitle
        title="Discover Leads"
        sub="Find and research potential clients"
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['search', 'saved'].map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            style={{
              background: sub === s ? T.navActiveBg : T.card,
              color: sub === s ? T.accent : T.muted,
              border: sub === s ? `0.5px solid ${T.accent}44` : T.border,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: FONT,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {sub === 'search' ? (
        <>
          <Card style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: T.muted,
                }}
              >
                <Ico name="search" size={15} />
              </span>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && run()}
                placeholder="Search for businesses, industries, or locations..."
                style={{ paddingLeft: 38 }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Industry"
                style={{ flex: 1, minWidth: 140 }}
              />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (default: Aruba)"
                style={{ flex: 1, minWidth: 140 }}
              />
            </div>
            <Btn onClick={run} disabled={busy || !q.trim()}>
              {busy ? <Spinner size={14} /> : <Ico name="sparkle" size={14} />}
              {busy ? 'Researching...' : 'Discover leads'}
            </Btn>
          </Card>

          {err ? (
            <div style={{ fontSize: 12.5, color: '#f87171', marginBottom: 14 }}>
              {err}
            </div>
          ) : null}

          {results.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14,
              }}
            >
              {results.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card style={{ padding: 18, height: '100%' }}>
                    <div
                      style={{ fontSize: 15, fontWeight: 700, color: T.text }}
                    >
                      {r.company_name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.muted,
                        marginTop: 4,
                        marginBottom: 12,
                      }}
                    >
                      {r.industry} · {r.location}
                      {r.estimated_value
                        ? ` · ~${money(r.estimated_value)}`
                        : ''}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 5,
                      }}
                    >
                      Why a good fit
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: T.text,
                        lineHeight: 1.55,
                        marginBottom: 12,
                      }}
                    >
                      {r.why_good_fit}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.muted,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 5,
                      }}
                    >
                      Outreach angle
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: T.accent,
                        lineHeight: 1.55,
                        marginBottom: 16,
                      }}
                    >
                      {r.outreach_angle}
                    </div>
                    <Btn
                      size="sm"
                      full
                      onClick={() => onSaveLead(r)}
                    >
                      <Ico name="plus" size={13} />
                      Save as Lead
                    </Btn>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {saved.length === 0 ? (
            <Card style={{ padding: 8 }}>
              <EmptyState
                icon="search"
                title="No saved discoveries"
                sub="Leads you save from Discover appear here."
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {saved.map((l) => (
                <Card key={l.id} style={{ padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 14, fontWeight: 600, color: T.text }}
                      >
                        {l.company_name}
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                        {l.industry || '—'}
                        {l.location ? ` · ${l.location}` : ''}
                      </div>
                    </div>
                    <StatusPill status={l.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ============================================================
   OFFERS
   ============================================================ */
const INCLUDED = {
  'CRM Setup': [
    'Initial consultation',
    'CRM platform setup',
    'Pipeline configuration',
    'Automation setup',
    'Team training',
    '30-day support',
  ],
  'AI Marketing System': [
    'Brand memory setup',
    'AI agent configuration',
    'Content generation',
    'Social media scheduling',
    'Monthly performance report',
  ],
  'Website Development': [
    'Design mockup',
    'Development',
    'CMS setup',
    'Mobile responsive',
    'SEO basics',
    '2 revisions',
  ],
  'Full Business Operating System': [
    'Everything from CRM, AI Marketing & Website',
    'Dedicated account manager',
    'Monthly strategy call',
  ],
}
function pitchFor(s) {
  return `Hi — I work with Lithos Labs, and we help businesses like yours with ${s.name}. ${
    s.description || ''
  } Most clients we work with see real structure and growth within weeks, not months. The investment runs ${
    s.price_fixed
      ? `Afl. ${s.price_fixed}`
      : `Afl. ${s.price_min} – Afl. ${s.price_max}`
  }. Would it make sense to set up a quick call to see if it's a fit for your goals?`
}

function Offers() {
  const [services, setServices] = useState([])
  const [recBusy, setRecBusy] = useState(false)
  const [recInput, setRecInput] = useState('')
  const [rec, setRec] = useState(null)

  useEffect(() => {
    api('services_catalog').then((d) => d.success && setServices(d.services || []))
  }, [])

  async function recommend() {
    if (!recInput.trim()) return
    setRecBusy(true)
    setRec(null)
    const d = await api('discover_leads', {
      method: 'POST',
      body: { mode: 'recommendation', business: recInput },
    })
    setRecBusy(false)
    if (d.success && d.recommendation) setRec(d.recommendation)
  }

  return (
    <div>
      <PageTitle
        title="Agency Offers"
        sub="Everything you need to know about what we sell"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {services.map((s, i) => {
          const priceText = s.price_fixed
            ? `Afl. ${s.price_fixed}`
            : `Afl. ${s.price_min} — Afl. ${s.price_max}`
          const commLow = (
            ((s.price_fixed || s.price_min || 0) * (s.commission_rate || 0)) /
            100
          ).toFixed(0)
          const commHigh = (
            ((s.price_fixed || s.price_max || 0) * (s.commission_rate || 0)) /
            100
          ).toFixed(0)
          const included = INCLUDED[s.name]
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                style={{
                  padding: 22,
                  borderLeft: `2px solid ${T.accent}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {s.name}
                      {s.category ? (
                        <Pill color={T.muted}>{s.category}</Pill>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.muted,
                        marginTop: 8,
                        maxWidth: 560,
                        lineHeight: 1.6,
                      }}
                    >
                      {s.description}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                      {priceText}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: T.accent,
                        fontWeight: 600,
                        marginTop: 6,
                      }}
                    >
                      Your commission: {s.commission_rate}% ={' '}
                      {commLow === commHigh
                        ? money(commLow)
                        : `${money(commLow)} – ${money(commHigh)}`}
                    </div>
                  </div>
                </div>
                {included ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px 22px',
                      marginTop: 16,
                    }}
                  >
                    {included.map((it) => (
                      <div
                        key={it}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 12.5,
                          color: T.muted,
                        }}
                      >
                        <Ico name="check" size={13} color={T.accent} />
                        {it}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div style={{ marginTop: 18 }}>
                  <CopyBtn text={pitchFor(s)} label="Copy Pitch" />
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card style={{ padding: 22, marginTop: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
          Not sure which offer fits?
        </div>
        <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>
          Describe the prospect's business and AI will recommend the best match.
        </div>
        <Textarea
          value={recInput}
          onChange={(e) => setRecInput(e.target.value)}
          placeholder="e.g. A small real estate agency in Oranjestad with 4 agents, no CRM, doing everything by WhatsApp..."
          style={{ marginBottom: 12 }}
        />
        <Btn onClick={recommend} disabled={recBusy || !recInput.trim()}>
          {recBusy ? <Spinner size={14} /> : <Ico name="sparkle" size={14} />}
          {recBusy ? 'Thinking...' : 'Get recommendation'}
        </Btn>
        {rec ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 16,
              background: 'rgba(194,181,155,0.06)',
              border: T.borderStrong,
              borderRadius: 10,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 5 }}>
              Recommended service
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.accent, marginBottom: 10 }}>
              {rec.recommended_service}
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 12 }}>
              {rec.why}
            </div>
            {rec.pitch ? (
              <div
                style={{
                  fontSize: 12.5,
                  color: T.muted,
                  fontStyle: 'italic',
                  borderLeft: `2px solid ${T.accent}`,
                  paddingLeft: 12,
                }}
              >
                {rec.pitch}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </Card>
    </div>
  )
}

/* ============================================================
   DEMOS
   ============================================================ */
function Demos({ rep, toast }) {
  const [modal, setModal] = useState(false)
  const demos = [
    {
      icon: 'users',
      title: 'CRM Demo',
      desc: 'Show them a live CRM system with pipelines and automations.',
      cta: 'Create CRM Demo',
    },
    {
      icon: 'sparkle',
      title: 'AI Marketing Demo',
      desc: 'Show them content being generated by the AI system.',
      cta: 'Create Marketing Demo',
    },
    {
      icon: 'monitor',
      title: 'Website Preview',
      desc: 'Show them a mockup of their future website.',
      cta: 'Create Website Preview',
    },
    {
      icon: 'grid',
      title: 'Full System Demo',
      desc: 'Show the complete Lithos Labs operating system.',
      cta: 'View Demo',
    },
  ]
  return (
    <div>
      <PageTitle
        title="Demo Builder"
        sub="Show clients what's possible before they buy"
      />
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13.5, color: T.text, fontWeight: 600, marginBottom: 6 }}>
          Sell first, build later.
        </div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
          Create a demo project to show potential clients the value before
          committing build time. Use these to close, then we build.
        </div>
      </Card>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {demos.map((d, i) => (
          <motion.div
            key={d.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card style={{ padding: 20, height: '100%' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: T.navActiveBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.accent,
                  marginBottom: 14,
                }}
              >
                <Ico name={d.icon} size={18} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                {d.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: T.muted,
                  marginTop: 6,
                  marginBottom: 16,
                  lineHeight: 1.55,
                  minHeight: 38,
                }}
              >
                {d.desc}
              </div>
              <Btn size="sm" variant="ghost" full onClick={() => setModal(true)}>
                {d.cta}
              </Btn>
            </Card>
          </motion.div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Demo coming soon">
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.65, marginBottom: 20 }}>
          For now, direct the client to{' '}
          <span style={{ color: T.accent }}>lithos-labs.vercel.app</span> and
          walk them through the live system.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn
            size="sm"
            onClick={() => {
              try {
                navigator.clipboard.writeText('https://lithos-labs.vercel.app')
              } catch {
                /* ignore */
              }
              toast('Demo link copied')
            }}
          >
            <Ico name="copy" size={13} />
            Share demo link
          </Btn>
          <Btn
            size="sm"
            variant="ghost"
            onClick={async () => {
              await api('notify_admin', {
                method: 'POST',
                body: {
                  title: 'Custom demo requested',
                  message: `${rep.name} requested a custom demo build`,
                },
              })
              setModal(false)
              toast('Request sent to admin')
            }}
          >
            Request custom demo
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   TASKS
   ============================================================ */
function Tasks({ rep, leads, toast }) {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    lead_id: '',
  })
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api('rep_tasks', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setTasks(d.tasks || []),
    )
  }, [rep.id])
  useEffect(() => {
    load()
  }, [load])

  const filtered = tasks.filter((t) => {
    if (filter === 'today') return t.status !== 'done' && isToday(t.due_date)
    if (filter === 'overdue')
      return t.status !== 'done' && isOverdue(t.due_date)
    if (filter === 'done') return t.status === 'done'
    return true
  })

  async function addTask() {
    if (!f.title.trim()) return
    setBusy(true)
    await api('add_task', {
      method: 'POST',
      body: {
        rep_id: rep.id,
        lead_id: f.lead_id || null,
        title: f.title,
        description: f.description,
        priority: f.priority,
        due_date: f.due_date || null,
      },
    })
    setBusy(false)
    setAdding(false)
    setF({ title: '', description: '', priority: 'medium', due_date: '', lead_id: '' })
    load()
    toast('Task added')
  }
  async function toggle(t) {
    const done = t.status === 'done'
    await api('update_task', {
      method: 'POST',
      body: {
        task_id: t.id,
        status: done ? 'todo' : 'done',
        completed_at: done ? null : new Date().toISOString(),
      },
    })
    load()
  }
  async function del(t) {
    await api('delete_task', { method: 'POST', body: { task_id: t.id } })
    load()
    toast('Task deleted')
  }

  const prioColor = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' }

  return (
    <div>
      <PageTitle
        title="My Tasks"
        sub={`${tasks.filter((t) => t.status !== 'done').length} open`}
        right={
          <Btn onClick={() => setAdding(true)}>
            <Ico name="plus" size={14} />
            Add Task
          </Btn>
        }
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['all', 'today', 'overdue', 'done'].map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            style={{
              background: filter === p ? T.navActiveBg : T.card,
              color: filter === p ? T.accent : T.muted,
              border: filter === p ? `0.5px solid ${T.accent}44` : T.border,
              borderRadius: 999,
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: FONT,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card style={{ padding: 8 }}>
          <EmptyState icon="check-square" title="No tasks" sub="Add a task to stay on track." />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((t) => (
            <Card key={t.id} style={{ padding: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <button
                  onClick={() => toggle(t)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border:
                      t.status === 'done'
                        ? `0.5px solid ${T.accent}`
                        : '0.5px solid rgba(194,181,155,0.3)',
                    background: t.status === 'done' ? T.accent : 'transparent',
                    color: T.bg,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {t.status === 'done' && <Ico name="check" size={12} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: t.status === 'done' ? T.muted : T.text,
                      textDecoration:
                        t.status === 'done' ? 'line-through' : 'none',
                      fontWeight: 600,
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: T.faint,
                      marginTop: 3,
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    {t.lead_company ? <span>{t.lead_company}</span> : null}
                    {t.due_date ? (
                      <span
                        style={{
                          color:
                            isOverdue(t.due_date) && t.status !== 'done'
                              ? '#fbbf24'
                              : T.faint,
                        }}
                      >
                        Due {shortDate(t.due_date)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Pill color={prioColor[t.priority] || T.muted}>
                  {t.priority}
                </Pill>
                <button
                  onClick={() => del(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: T.faint,
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Ico name="trash" size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Task">
        <Field label="Title">
          <Input
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Priority">
            <Select
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: e.target.value })}
            >
              {['high', 'medium', 'low'].map((p) => (
                <option key={p} value={p} style={{ background: T.bg }}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={f.due_date}
              onChange={(e) => setF({ ...f, due_date: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Related lead (optional)">
          <Select
            value={f.lead_id}
            onChange={(e) => setF({ ...f, lead_id: e.target.value })}
          >
            <option value="" style={{ background: T.bg }}>
              None
            </option>
            {leads.map((l) => (
              <option key={l.id} value={l.id} style={{ background: T.bg }}>
                {l.company_name}
              </option>
            ))}
          </Select>
        </Field>
        <Btn full disabled={busy || !f.title.trim()} onClick={addTask}>
          {busy ? <Spinner size={14} /> : 'Save task'}
        </Btn>
      </Modal>
    </div>
  )
}

/* ============================================================
   SCRIPTS
   ============================================================ */
const CALL_SCRIPTS = [
  {
    name: 'CRM Setup',
    opening:
      "Hi [Name], this is [You] from Lithos Labs. I'll be quick — we build CRM systems for businesses in Aruba that are still running on spreadsheets and WhatsApp. Is now a bad time for 30 seconds?",
    discovery: [
      'How are you currently tracking your leads and clients?',
      'What happens when a lead comes in — who follows up and how?',
      'How many leads do you think slip through the cracks each month?',
      'How much time does your team spend on manual follow-up?',
      "If that was automated, what would you do with the time back?",
    ],
    value:
      'We set up a complete CRM with your pipeline, automated follow-ups, and lead tracking — so no lead is ever lost and your team stops doing manual work. Most clients are fully live within 5 days.',
    closing:
      "Based on what you've told me, this is exactly what we fix. I'd like to set up a 20-minute call to map your pipeline. Does Thursday or Friday work better for you?",
  },
  {
    name: 'AI Marketing System',
    opening:
      "Hi [Name], [You] from Lithos Labs. We build AI marketing systems that generate and schedule content for brands automatically. Quick question — who handles your content right now?",
    discovery: [
      'How often are you posting consistently?',
      'Who writes and designs your content?',
      'What does it cost you in time or money each month?',
      "What's stopping you from posting daily?",
      'If content ran itself on-brand, what would that be worth?',
    ],
    value:
      'We build an AI system trained on your brand voice that generates, schedules and posts content 24/7 — with a monthly performance report. It runs without a team.',
    closing:
      "I'd love to show you a sample of content in your brand voice. Can we book 20 minutes this week?",
  },
  {
    name: 'Full Business Operating System',
    opening:
      "Hi [Name], [You] from Lithos Labs. We install complete operating systems — CRM, AI marketing and website — for businesses ready to scale. Are you the right person to talk systems with?",
    discovery: [
      'Which part of the business feels most chaotic right now?',
      'Do your tools talk to each other or is it all manual?',
      'Where are you losing the most time or money?',
      'What would scaling look like if the systems were handled?',
      "What's your timeline to fix this?",
    ],
    value:
      'This is everything — CRM, AI marketing, website, automations — plus a dedicated account manager and monthly strategy calls. One system, fully integrated.',
    closing:
      "This is our flagship. Let's do a full strategy session so I can map your entire operation. What day works next week?",
  },
]
const DM_SCRIPTS = [
  {
    channel: 'Instagram DM',
    opening: 'Hey [Name] — love what you\'re building with [Company].',
    body: 'Quick one: are you handling leads/content manually right now? We build CRM + AI marketing systems for Aruba businesses and just freed up ~15 hrs/week for a similar brand.',
    cta: 'Worth a quick 15-min call this week?',
  },
  {
    channel: 'WhatsApp',
    opening: 'Hi [Name], this is [You] from Lithos Labs.',
    body: 'We help businesses like [Company] put proper systems in place — CRM, automations, AI content. Saw you might be doing a lot of this manually.',
    cta: 'Can I send over a 2-min example of what we built for a similar business?',
  },
  {
    channel: 'Email',
    opening: 'Subject: Quick idea for [Company]',
    body: 'Hi [Name], noticed [Company] is growing fast. Most businesses at this stage start losing leads because the systems can\'t keep up. We install CRM + automation infrastructure that fixes exactly that — usually live in under a week.',
    cta: 'Open to a short call Thursday or Friday?',
  },
  {
    channel: 'LinkedIn',
    opening: 'Hi [Name] — connecting because [Company] is doing impressive work in [Industry].',
    body: 'We build the operational backbone (CRM, automation, AI marketing) for scaling brands. Recently helped a similar company 3x their lead capture.',
    cta: 'Would a brief call be useful?',
  },
]

function Scripts() {
  const [sub, setSub] = useState('call')
  const [objection, setObjection] = useState('')
  const [resp, setResp] = useState('')
  const [busy, setBusy] = useState(false)

  async function ask() {
    if (!objection.trim()) return
    setBusy(true)
    setResp('')
    const d = await api('objection_help', {
      method: 'POST',
      body: { objection },
    })
    setBusy(false)
    if (d.success) setResp(d.response)
    else setResp(d.error || 'AI not available')
  }

  return (
    <div>
      <PageTitle title="Sales Scripts" sub="Everything you need to close" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          ['call', 'Call Scripts'],
          ['dm', 'DM Scripts'],
          ['objection', 'Objection Handler'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            style={{
              background: sub === k ? T.navActiveBg : T.card,
              color: sub === k ? T.accent : T.muted,
              border: sub === k ? `0.5px solid ${T.accent}44` : T.border,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {sub === 'call' &&
        CALL_SCRIPTS.map((s) => {
          const full = `OPENING:\n${s.opening}\n\nDISCOVERY QUESTIONS:\n${s.discovery
            .map((q, i) => `${i + 1}. ${q}`)
            .join('\n')}\n\nVALUE:\n${s.value}\n\nCLOSING:\n${s.closing}`
          return (
            <Accordion key={s.name} title={s.name} sub="Full call flow">
              <ScriptBlock label="Opening (15 sec)" text={s.opening} />
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 11.5,
                    color: T.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}
                >
                  Discovery questions
                </div>
                {s.discovery.map((q, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: T.text,
                      padding: '5px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {i + 1}. {q}
                  </div>
                ))}
              </div>
              <ScriptBlock label="Value proposition" text={s.value} />
              <ScriptBlock label="Closing" text={s.closing} />
              <div style={{ marginTop: 14 }}>
                <CopyBtn text={full} label="Copy Script" />
              </div>
            </Accordion>
          )
        })}

      {sub === 'dm' &&
        DM_SCRIPTS.map((s) => {
          const full = `${s.opening}\n\n${s.body}\n\n${s.cta}`
          return (
            <Accordion key={s.channel} title={s.channel} sub="Outreach template">
              <ScriptBlock label="Opening / Subject" text={s.opening} />
              <ScriptBlock label="Body" text={s.body} />
              <ScriptBlock label="Call to action" text={s.cta} />
              <div style={{ marginTop: 14 }}>
                <CopyBtn text={full} label="Copy Template" />
              </div>
            </Accordion>
          )
        })}

      {sub === 'objection' && (
        <Card style={{ padding: 22, maxWidth: 720 }}>
          <div style={{ fontSize: 13.5, color: T.text, fontWeight: 600, marginBottom: 6 }}>
            Objection Handler
          </div>
          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 16 }}>
            Paste what the prospect said and get a confident, value-focused
            response.
          </div>
          <Textarea
            value={objection}
            onChange={(e) => setObjection(e.target.value)}
            placeholder="e.g. It's too expensive / We already have someone / Send me an email"
            style={{ marginBottom: 12 }}
          />
          <Btn onClick={ask} disabled={busy || !objection.trim()}>
            {busy ? <Spinner size={14} /> : <Ico name="sparkle" size={14} />}
            {busy ? 'Thinking...' : 'Get response'}
          </Btn>
          {resp ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 18,
                background: 'rgba(194,181,155,0.06)',
                border: T.borderStrong,
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  color: T.text,
                  lineHeight: 1.65,
                  marginBottom: 14,
                }}
              >
                {resp}
              </div>
              <CopyBtn text={resp} label="Copy" />
            </motion.div>
          ) : null}
        </Card>
      )}
    </div>
  )
}

function ScriptBlock({ label, text }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 11.5,
          color: T.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

/* ============================================================
   ADMIN
   ============================================================ */
function Admin({ rep, toast }) {
  const [sub, setSub] = useState('pending')
  const [pending, setPending] = useState([])
  const [reps, setReps] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [services, setServices] = useState([])
  const [rejecting, setRejecting] = useState(null)
  const [rejNotes, setRejNotes] = useState('')

  const loadPending = useCallback(() => {
    api('admin_deals', { params: { status: 'pending_approval' } }).then(
      (d) => d.success && setPending(d.deals || []),
    )
  }, [])
  const loadAllLeads = useCallback(() => {
    api('admin_all_leads').then(
      (d) => d.success && setAllLeads(d.leads || []),
    )
  }, [])
  useEffect(() => {
    loadPending()
    api('admin_all_reps').then((d) => d.success && setReps(d.reps || []))
    api('services_catalog').then((d) => d.success && setServices(d.services || []))
  }, [loadPending])

  useEffect(() => {
    if (sub === 'leads') loadAllLeads()
  }, [sub, loadAllLeads])

  async function reassign(leadId, repId) {
    await api('reassign_lead', {
      method: 'POST',
      body: { lead_id: leadId, rep_id: repId },
    })
    loadAllLeads()
    toast('Lead reassigned')
  }

  async function decide(deal, approved) {
    await api('approve_deal', {
      method: 'POST',
      body: {
        deal_id: deal.id,
        admin_id: rep.id,
        approved,
        admin_notes: approved ? null : rejNotes,
      },
    })
    setRejecting(null)
    setRejNotes('')
    loadPending()
    toast(approved ? 'Deal approved' : 'Deal rejected')
  }

  const tabs = [
    ['pending', 'Pending Deals'],
    ['reps', 'All Reps'],
    ['leads', 'All Leads'],
    ['settings', 'Settings'],
  ]

  return (
    <div>
      <PageTitle title="Admin" sub="Team oversight & approvals" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            style={{
              background: sub === k ? T.navActiveBg : T.card,
              color: sub === k ? T.accent : T.muted,
              border: sub === k ? `0.5px solid ${T.accent}44` : T.border,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {sub === 'pending' && (
        <>
          {pending.length === 0 ? (
            <Card style={{ padding: 8 }}>
              <EmptyState icon="check-square" title="No deals waiting" />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map((d) => (
                <Card key={d.id} style={{ padding: 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                        {d.service_name}
                      </div>
                      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>
                        {d.rep_name} · {d.company_name} ({d.contact_name || '—'})
                      </div>
                      <div style={{ fontSize: 12.5, color: T.muted, marginTop: 6 }}>
                        Deal {money(d.deal_value)} · {d.commission_rate}% ·
                        Commission{' '}
                        <span style={{ color: T.accent, fontWeight: 600 }}>
                          {money(d.commission_amount)}
                        </span>
                      </div>
                      {d.payment_proof_url ? (
                        <a
                          href={d.payment_proof_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: T.accent }}
                        >
                          View payment proof
                        </a>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Btn size="sm" onClick={() => decide(d, true)}>
                        Approve
                      </Btn>
                      <Btn
                        size="sm"
                        variant="danger"
                        onClick={() => setRejecting(d.id)}
                      >
                        Reject
                      </Btn>
                    </div>
                  </div>
                  {rejecting === d.id && (
                    <div style={{ marginTop: 14 }}>
                      <Textarea
                        value={rejNotes}
                        onChange={(e) => setRejNotes(e.target.value)}
                        placeholder="Reason for rejection..."
                        style={{ marginBottom: 10 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn size="sm" variant="danger" onClick={() => decide(d, false)}>
                          Confirm reject
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejecting(null)}
                        >
                          Cancel
                        </Btn>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {sub === 'reps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reps.map((r) => (
            <Card key={r.id} style={{ padding: 18 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>
                    {r.email} · {r.commission_rate}% commission
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 22, textAlign: 'right' }}>
                  <Metric label="Leads" value={r.total_leads} />
                  <Metric label="Deals" value={r.deals_closed} />
                  <Metric
                    label="Paid"
                    value={money(r.paid_commission)}
                    accent
                  />
                  <Metric
                    label="Pending"
                    value={money(r.pending_commission)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {sub === 'leads' && (
        <>
          {allLeads.length === 0 ? (
            <Card style={{ padding: 8 }}>
              <EmptyState icon="users" title="No leads in the system yet" />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allLeads.map((l) => (
                <Card key={l.id} style={{ padding: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>
                        {l.company_name}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>
                        {l.contact_name || '—'}
                        {l.industry ? ` · ${l.industry}` : ''}
                      </div>
                    </div>
                    <StatusPill status={l.status} />
                    <div style={{ minWidth: 150 }}>
                      <Select
                        value={l.rep_id || ''}
                        onChange={(e) => reassign(l.id, e.target.value)}
                        style={{ padding: '7px 10px', fontSize: 12 }}
                      >
                        {reps.map((r) => (
                          <option
                            key={r.id}
                            value={r.id}
                            style={{ background: T.bg }}
                          >
                            {r.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {sub === 'settings' && (
        <>
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Invite Code
            </div>
            <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 12 }}>
              Share with reps to let them self-register. Configured via the
              SALES_REP_INVITE_CODE environment variable.
            </div>
            <Pill color={T.accent}>Set in deployment env</Pill>
          </Card>
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 14 }}>
              Services Catalog
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: T.border,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: T.text }}>{s.name}</span>
                  <span style={{ color: T.muted }}>
                    {s.price_fixed
                      ? money(s.price_fixed)
                      : `${money(s.price_min)}–${money(s.price_max)}`}{' '}
                    · {s.commission_rate}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: accent ? T.accent : T.text,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function Notifications({ rep }) {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const repId = rep?.id

  async function fetchNotifs() {
    if (!repId) return
    const d = await api('sales_notifications', { params: { rep_id: repId } })
    if (d.success) setList(d.notifications || [])
  }

  useEffect(() => {
    if (!repId) return
    let alive = true
    const tick = () =>
      api('sales_notifications', { params: { rep_id: repId } }).then(
        (d) => alive && d.success && setList(d.notifications || []),
      )
    tick()
    const id = setInterval(tick, 30000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [repId])

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = list.filter((n) => !n.read).length

  async function markAll() {
    await api('mark_notifications_read', {
      method: 'POST',
      body: { rep_id: repId },
    })
    fetchNotifs()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: T.muted,
          cursor: 'pointer',
          position: 'relative',
          padding: 6,
          display: 'flex',
        }}
      >
        <Ico name="bell" size={18} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 15,
              height: 15,
              borderRadius: 999,
              background: T.accent,
              color: T.bg,
              fontSize: 9.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'absolute',
              top: 40,
              right: 0,
              width: 320,
              maxHeight: 420,
              overflowY: 'auto',
              background: '#111012',
              border: T.borderStrong,
              borderRadius: 12,
              zIndex: 300,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: T.border,
                position: 'sticky',
                top: 0,
                background: '#111012',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                Notifications
              </span>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: T.accent,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: T.muted,
                }}
              >
                No notifications
              </div>
            ) : (
              list.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '13px 16px',
                    borderBottom: T.border,
                    background: n.read ? 'transparent' : 'rgba(194,181,155,0.04)',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
                    {n.title}
                  </div>
                  {n.message ? (
                    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 3 }}>
                      {n.message}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 10.5, color: T.faint, marginTop: 5 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   SHELL
   ============================================================ */
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'leads', label: 'Leads', icon: 'users' },
  { key: 'discover', label: 'Discover', icon: 'search' },
  { key: 'offers', label: 'Offers', icon: 'package' },
  { key: 'demos', label: 'Demos', icon: 'monitor' },
  { key: 'tasks', label: 'Tasks', icon: 'check-square' },
  { key: 'scripts', label: 'Scripts', icon: 'file-text' },
  { key: 'admin', label: 'Admin', icon: 'shield', adminOnly: true },
]
const MOBILE_TABS = ['dashboard', 'leads', 'tasks', 'scripts']

function NavItem({ item, active, onClick }) {
  const [h, setH] = useState(false)
  const isActive = active === item.key
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        width: '100%',
        textAlign: 'left',
        border: 'none',
        fontFamily: FONT,
        background: isActive
          ? T.navActiveBg
          : h
            ? T.navHoverBg
            : 'transparent',
        color: isActive ? T.accent : h ? T.navHoverText : T.muted,
        transition: 'all 0.12s ease',
      }}
    >
      <Ico name={item.icon} size={16} />
      {item.label}
    </button>
  )
}

function Sidebar({ rep, active, setActive, onLogout, nav }) {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 220,
        height: '100vh',
        background: 'rgba(11,11,13,0.98)',
        borderRight: '0.5px solid rgba(194,181,155,0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 18px',
          borderBottom: '0.5px solid rgba(194,181,155,0.08)',
        }}
      >
        <img
          src="/lithos-logo.png"
          alt="Lithos"
          style={{ width: 22, height: 22, objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>
            Lithos
          </span>
          <span style={{ fontWeight: 300, fontSize: 15, color: 'rgba(194,181,155,0.6)' }}>
            Labs
          </span>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: T.accent,
            background: T.navActiveBg,
            padding: '3px 7px',
            borderRadius: 5,
          }}
        >
          SALES
        </span>
      </div>

      <nav
        style={{
          flex: 1,
          padding: '14px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflowY: 'auto',
        }}
      >
        {nav.map((item) => (
          <NavItem
            key={item.key}
            item={item}
            active={active}
            onClick={() => setActive(item.key)}
          />
        ))}
      </nav>

      <div
        style={{
          padding: 14,
          borderTop: '0.5px solid rgba(194,181,155,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: T.navActiveBg,
              color: T.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {initials(rep.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                color: T.text,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {rep.name}
            </div>
            <div style={{ fontSize: 10.5, color: T.muted, textTransform: 'capitalize' }}>
              {rep.role}
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            background: 'transparent',
            border: T.border,
            borderRadius: 8,
            padding: '8px 12px',
            color: T.muted,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          <Ico name="log-out" size={14} />
          Log out
        </button>
      </div>
    </aside>
  )
}

function TopBar({ rep, left }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left,
        right: 0,
        height: 56,
        background: 'rgba(11,11,13,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(194,181,155,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 16,
        padding: '0 24px',
        zIndex: 40,
      }}
    >
      <Notifications rep={rep} />
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: T.navActiveBg,
          color: T.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11.5,
          fontWeight: 700,
        }}
      >
        {initials(rep.name)}
      </div>
    </header>
  )
}

function MobileTabs({ active, setActive, openMore }) {
  const items = MOBILE_TABS.map((k) => NAV.find((n) => n.key === k))
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 62,
        background: 'rgba(11,11,13,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(194,181,155,0.08)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => setActive(it.key)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            color: active === it.key ? T.accent : T.muted,
            fontSize: 10,
            fontFamily: FONT,
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Ico name={it.icon} size={19} />
          {it.label}
        </button>
      ))}
      <button
        onClick={openMore}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: T.muted,
          fontSize: 10,
          fontFamily: FONT,
          minHeight: 44,
          justifyContent: 'center',
        }}
      >
        <Ico name="more" size={19} />
        More
      </button>
    </nav>
  )
}

/* ============================================================
   ROOT
   ============================================================ */
function Toast({ msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 600,
            background: T.accent,
            color: T.bg,
            fontSize: 13,
            fontWeight: 600,
            padding: '11px 22px',
            borderRadius: 999,
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
          }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function SalesRep() {
  const isMobile = useIsMobile(900)
  const [rep, setRep] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [active, setActive] = useState('dashboard')
  const [leads, setLeads] = useState([])
  const [services, setServices] = useState([])
  const [toastMsg, setToastMsg] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [discoverPrefill, setDiscoverPrefill] = useState(null)

  const toast = useCallback((m) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg(''), 2600)
  }, [])

  async function reloadLeads() {
    if (!rep?.id) return
    const d = await api('rep_leads', { params: { rep_id: rep.id } })
    if (d.success) setLeads(d.leads || [])
  }

  useEffect(() => {
    const rid = rep?.id
    if (!rid) return
    api('rep_leads', { params: { rep_id: rid } }).then(
      (d) => d.success && setLeads(d.leads || []),
    )
    api('services_catalog').then(
      (d) => d.success && setServices(d.services || []),
    )
  }, [rep?.id])

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setRep(null)
    setActive('dashboard')
  }

  if (!rep) return <Login onAuth={setRep} />

  const nav = NAV.filter((n) => !n.adminOnly || rep.role === 'admin')

  function go(key) {
    setActive(key)
    setMoreOpen(false)
  }

  const view = (() => {
    switch (active) {
      case 'dashboard':
        return <Dashboard rep={rep} leads={leads} onGo={go} />
      case 'leads':
        return (
          <Leads
            rep={rep}
            leads={leads}
            services={services}
            reload={reloadLeads}
            isMobile={isMobile}
            toast={toast}
            prefill={discoverPrefill}
            clearPrefill={() => setDiscoverPrefill(null)}
          />
        )
      case 'discover':
        return (
          <Discover
            rep={rep}
            leads={leads}
            onSaveLead={(r) => {
              setDiscoverPrefill(r)
              go('leads')
            }}
          />
        )
      case 'offers':
        return <Offers />
      case 'demos':
        return <Demos rep={rep} toast={toast} />
      case 'tasks':
        return <Tasks rep={rep} leads={leads} toast={toast} />
      case 'scripts':
        return <Scripts />
      case 'admin':
        return rep.role === 'admin' ? (
          <Admin rep={rep} toast={toast} />
        ) : (
          <Dashboard rep={rep} leads={leads} onGo={go} />
        )
      default:
        return <Dashboard rep={rep} leads={leads} onGo={go} />
    }
  })()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: FONT,
      }}
    >
      <style>{`
        @media (max-width: 720px) {
          .sr-dash-grid { grid-template-columns: 1fr !important; }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: rgba(194,181,155,0.15); border-radius: 4px; }
        input::placeholder, textarea::placeholder { color: rgba(242,237,228,0.3); }
      `}</style>

      {!isMobile && (
        <Sidebar
          rep={rep}
          active={active}
          setActive={go}
          onLogout={logout}
          nav={nav}
        />
      )}
      <TopBar rep={rep} left={isMobile ? 0 : 220} />

      <main
        style={{
          marginLeft: isMobile ? 0 : 220,
          marginTop: 56,
          padding: isMobile ? '20px 16px 84px' : 24,
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {view}
        </motion.div>
      </main>

      {isMobile && (
        <MobileTabs
          active={active}
          setActive={go}
          openMore={() => setMoreOpen(true)}
        />
      )}

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav
            .filter((n) => !MOBILE_TABS.includes(n.key))
            .map((n) => (
              <NavItem
                key={n.key}
                item={n}
                active={active}
                onClick={() => go(n.key)}
              />
            ))}
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              color: '#f87171',
              fontFamily: FONT,
              marginTop: 6,
            }}
          >
            <Ico name="log-out" size={16} />
            Log out
          </button>
        </div>
      </Modal>

      <Toast msg={toastMsg} />
    </div>
  )
}
