import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useIsMobile from '../utils/useIsMobile'

/* ============================================================
   LITHOS LABS — SALES PORTAL
   Matches the main CEO dashboard layout exactly: top nav,
   #111113 stat cards, #0e0e10 section cards, neutral palette.
   ============================================================ */
const C = {
  bg: '#0B0B0D',
  nav: 'rgba(11,11,13,0.95)',
  border: '0.5px solid rgba(255,255,255,0.06)',
  borderStrong: '0.5px solid rgba(255,255,255,0.1)',
  statCard: '#111113',
  sectionCard: '#0e0e10',
  text: '#ffffff',
  t50: 'rgba(255,255,255,0.5)',
  t40: 'rgba(255,255,255,0.4)',
  t35: 'rgba(255,255,255,0.35)',
  t25: 'rgba(255,255,255,0.25)',
  hover: 'rgba(255,255,255,0.02)',
  pill: 'rgba(255,255,255,0.06)',
  pillBorder: 'rgba(255,255,255,0.1)',
  active: 'rgba(255,255,255,0.1)',
  beige: '#C2B59B',
}
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const AUTH_KEY = 'lithos_rep_auth'

const STATUS = {
  new: { label: 'New', color: '#9ca3af' },
  contacted: { label: 'Contacted', color: '#60a5fa' },
  interested: { label: 'Interested', color: '#c084fc' },
  negotiation: { label: 'Negotiation', color: '#fbbf24' },
  demo_booked: { label: 'Demo Booked', color: '#fbbf24' },
  proposal_sent: { label: 'Proposal Sent', color: '#fb923c' },
  closed_won: { label: 'Closed Won', color: '#4ade80' },
  closed_lost: { label: 'Closed Lost', color: '#f87171' },
  not_interested: { label: 'Not Interested', color: '#f87171' },
}
const STAGES = [
  'new',
  'contacted',
  'interested',
  'negotiation',
  'closed_won',
  'closed_lost',
]
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
function fmtFullDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
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
  return new Date(d).toDateString() === new Date().toDateString()
}
function isOverdue(d) {
  if (!d) return false
  return new Date(d).getTime() < Date.now() && !isToday(d)
}
function daysSince(d) {
  if (!d) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000))
}

/* ============================================================
   ICONS — Lucide-style, currentColor
   ============================================================ */
const P = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  package:
    'M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  'file-text':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  'check-square':
    'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  monitor:
    'M20 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 21h8M12 17v4',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  'chevron-right': 'M9 18l6-6-6-6',
  'arrow-up-right': 'M7 17L17 7M7 7h10v10',
  phone:
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13 1 .37 1.97.72 2.9a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.93.35 1.9.59 2.9.72A2 2 0 0 1 22 16.92z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6',
  message:
    'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z',
  calendar:
    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  file: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7',
  check: 'M20 6L9 17l-5-5',
  trash:
    'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  building:
    'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  refresh:
    'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  copy: 'M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2zM5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1',
  sparkle:
    'M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z',
  'trending-up': 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  target:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
}
function Ico({ name, size = 16, color, strokeWidth = 1.6, style }) {
  const d = P[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {d
        .split('M')
        .filter(Boolean)
        .map((seg, i) => (
          <path key={i} d={'M' + seg} />
        ))}
    </svg>
  )
}

/* ============================================================
   PRIMITIVES
   ============================================================ */
function StatCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: C.statCard,
        border: C.border,
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.t40,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 600,
          color: accent ? C.beige : C.text,
          lineHeight: 1.1,
          marginTop: 10,
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 13, color: C.t35, marginTop: 4 }}>{sub}</div>
      ) : null}
    </div>
  )
}

function Section({ title, sub, right, children, style }) {
  return (
    <div
      style={{
        background: C.sectionCard,
        border: C.border,
        borderRadius: 16,
        padding: 24,
        ...style,
      }}
    >
      {(title || sub || right) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            {title ? (
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                {title}
              </div>
            ) : null}
            {sub ? (
              <div style={{ fontSize: 12, color: C.t35, marginTop: 2 }}>
                {sub}
              </div>
            ) : null}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

function Btn({ children, onClick, variant = 'default', size = 'md', type = 'button', disabled, full, style }) {
  const v =
    variant === 'primary'
      ? { background: '#ffffff', color: '#000000', border: '0.5px solid transparent' }
      : variant === 'danger'
        ? { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '0.5px solid rgba(248,113,113,0.25)' }
        : { background: C.pill, color: C.text, border: `0.5px solid ${C.pillBorder}` }
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { opacity: 0.85 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      style={{
        ...v,
        fontFamily: FONT,
        fontWeight: variant === 'primary' ? 600 : 500,
        fontSize: size === 'sm' ? 12.5 : 13,
        padding: size === 'sm' ? '7px 12px' : '8px 16px',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: full ? '100%' : 'auto',
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

function StatusPill({ status }) {
  const s = STATUS[status] || { label: status, color: C.t40 }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: 999,
        color: s.color,
        background: `${s.color}1f`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }}
      />
      {s.label}
    </span>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#ffffff',
  fontSize: 14,
  fontFamily: FONT,
  outline: 'none',
}
function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />
}
function Textarea(props) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, minHeight: 88, resize: 'vertical', ...(props.style || {}) }}
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
function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: C.t40,
          marginBottom: 7,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

function Skel({ w = '100%', h = 16, r = 6, style }) {
  return (
    <div
      className="sr-pulse"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: 'rgba(255,255,255,0.06)',
        ...style,
      }}
    />
  )
}
function StatSkeleton() {
  return (
    <div
      style={{
        background: C.statCard,
        border: C.border,
        borderRadius: 12,
        padding: 24,
      }}
    >
      <Skel w={80} h={10} />
      <Skel w={110} h={32} r={8} style={{ marginTop: 14 }} />
      <Skel w={60} h={11} style={{ marginTop: 10 }} />
    </div>
  )
}

function Spinner({ size = 16 }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: '#fff',
      }}
    />
  )
}

function Empty({ icon = 'file', text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: C.t35 }}>
      <div style={{ display: 'inline-flex', marginBottom: 12, color: C.t25 }}>
        <Ico name={icon} size={22} />
      </div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  )
}

function CopyBtn({ text, label = 'Copy Pitch' }) {
  const [done, setDone] = useState(false)
  return (
    <Btn
      size="sm"
      onClick={() => {
        try {
          navigator.clipboard.writeText(text)
        } catch {
          /* ignore */
        }
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
    >
      <Ico name={done ? 'check' : 'copy'} size={13} />
      {done ? 'Copied' : label}
    </Btn>
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
            zIndex: 500,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: width,
              background: C.statCard,
              border: C.borderStrong,
              borderRadius: 16,
              padding: 28,
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
                {title}
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.t40,
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
              zIndex: 450,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(3px)',
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 460,
              width: isMobile ? '100%' : 420,
              maxWidth: '100%',
              background: C.sectionCard,
              borderLeft: C.borderStrong,
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

function Accordion({ title, sub, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        background: C.statCard,
        border: C.border,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
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
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
            {title}
          </div>
          {sub ? (
            <div style={{ fontSize: 12, color: C.t35, marginTop: 2 }}>{sub}</div>
          ) : null}
        </div>
        <motion.div animate={{ rotate: open ? 90 : 0 }} style={{ color: C.t40 }}>
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
          <div style={{ padding: '0 18px 18px', borderTop: C.border }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 22, flexWrap: 'wrap' }}>
      {tabs.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            background: active === k ? C.active : 'transparent',
            color: active === k ? C.text : C.t50,
            fontWeight: active === k ? 500 : 400,
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: FONT,
          }}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/* ============================================================
   LOGIN
   ============================================================ */
function Login({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', password: '', invite: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    if (mode === 'login') {
      const d = await api('rep_login', {
        method: 'POST',
        body: { email: f.email, password: f.password },
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
          name: f.name,
          email: f.email,
          password: f.password,
          invite_code: f.invite,
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
        background: C.bg,
        fontFamily: FONT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%',
          maxWidth: 380,
          margin: 'auto',
          background: C.statCard,
          border: C.border,
          borderRadius: 16,
          padding: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            marginBottom: 6,
          }}
        >
          <img
            src="/lithos-logo.png"
            alt="Lithos Labs"
            style={{ width: 24, height: 24, objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 18, color: C.text }}>
              Lithos
            </span>
            <span style={{ fontWeight: 300, fontSize: 18, color: C.t40 }}>
              Labs
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: C.beige,
              border: `0.5px solid ${C.beige}55`,
              borderRadius: 999,
              padding: '4px 12px',
            }}
          >
            Sales Portal
          </span>
        </div>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <Field label="Full name">
              <Input value={f.name} onChange={set('name')} required />
            </Field>
          )}
          <Field label="Email">
            <Input
              type="email"
              value={f.email}
              onChange={set('email')}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={f.password}
              onChange={set('password')}
              required
            />
          </Field>
          {mode === 'register' && (
            <Field label="Invite code">
              <Input value={f.invite} onChange={set('invite')} required />
            </Field>
          )}
          {err ? (
            <div
              style={{
                fontSize: 12,
                color: 'rgba(248,113,113,0.8)',
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {err}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            style={{
              background: '#ffffff',
              color: '#000000',
              fontWeight: 600,
              borderRadius: 8,
              padding: 11,
              width: '100%',
              fontSize: 14,
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: FONT,
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? <Spinner size={15} /> : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setErr('')
          }}
          style={{
            fontSize: 13,
            color: C.t40,
            marginTop: 16,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {mode === 'login'
            ? 'Have an invite code? Register'
            : 'Already a rep? Log in'}
        </div>
      </motion.div>
    </div>
  )
}

/* ============================================================
   TOP NAV
   ============================================================ */
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'leads', label: 'Leads', icon: 'users' },
  { key: 'pipeline', label: 'Pipeline', icon: 'layers' },
  { key: 'discover', label: 'Discover', icon: 'search' },
  { key: 'offers', label: 'Offers', icon: 'package' },
  { key: 'scripts', label: 'Scripts', icon: 'file-text' },
  { key: 'tasks', label: 'Tasks', icon: 'check-square' },
  { key: 'demos', label: 'Demos', icon: 'monitor' },
  { key: 'admin', label: 'Admin', icon: 'shield', adminOnly: true },
]
const MOBILE_TABS = ['dashboard', 'leads', 'pipeline', 'tasks']

function NavPill({ label, active, onClick }) {
  const [h, setH] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        fontSize: 14,
        color: active ? C.text : C.t50,
        fontWeight: active ? 500 : 400,
        background: active ? C.active : h ? C.hover : 'transparent',
        border: 'none',
        padding: '6px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: FONT,
        whiteSpace: 'nowrap',
        transition: 'background 0.12s ease',
      }}
    >
      {label}
    </button>
  )
}

function Notifications({ rep }) {
  const [list, setList] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const load = useCallback(() => {
    if (!rep?.id) return
    api('sales_notifications', { params: { rep_id: rep.id } }).then(
      (d) => d.success && setList(d.notifications || []),
    )
  }, [rep?.id])
  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])
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
      body: { rep_id: rep.id },
    })
    load()
  }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: C.t50,
          cursor: 'pointer',
          padding: 6,
          position: 'relative',
          display: 'flex',
        }}
      >
        <Ico name="bell" size={18} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 1,
              right: 1,
              minWidth: 15,
              height: 15,
              borderRadius: 999,
              background: '#ef4444',
              color: '#fff',
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
              top: 38,
              right: 0,
              width: 320,
              maxHeight: 420,
              overflowY: 'auto',
              background: C.statCard,
              border: C.borderStrong,
              borderRadius: 12,
              zIndex: 200,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderBottom: C.border,
                position: 'sticky',
                top: 0,
                background: C.statCard,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                Notifications
              </span>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.beige,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
            {list.length === 0 ? (
              <div
                style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: C.t35,
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
                    borderBottom: C.border,
                    background: n.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>
                    {n.title}
                  </div>
                  {n.message ? (
                    <div style={{ fontSize: 11.5, color: C.t40, marginTop: 3 }}>
                      {n.message}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 10.5, color: C.t25, marginTop: 5 }}>
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

function TopNav({ rep, active, setActive, onLogout, nav, isMobile }) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 100,
        background: C.nav,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: C.border,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <img
          src="/lithos-logo.png"
          alt="Lithos"
          width={22}
          height={22}
          style={{ objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
            Lithos
          </span>
          <span style={{ fontWeight: 300, fontSize: 15, color: C.t40 }}>
            Labs
          </span>
        </div>
      </div>

      {!isMobile && (
        <nav
          style={{
            display: 'flex',
            gap: 4,
            margin: '0 auto',
            overflowX: 'auto',
          }}
        >
          {nav.map((n) => (
            <NavPill
              key={n.key}
              label={n.label}
              active={active === n.key}
              onClick={() => setActive(n.key)}
            />
          ))}
        </nav>
      )}
      {isMobile && <div style={{ flex: 1 }} />}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <Notifications rep={rep} />
        <div
          title={rep.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: C.text,
          }}
        >
          {initials(rep.name)}
        </div>
        <button
          onClick={onLogout}
          title="Log out"
          style={{
            background: 'none',
            border: 'none',
            color: C.t40,
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
          }}
        >
          <Ico name="log-out" size={16} />
        </button>
      </div>
    </header>
  )
}

function MobileNav({ active, setActive, openMore }) {
  const items = MOBILE_TABS.map((k) => NAV.find((n) => n.key === k))
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: C.nav,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: C.border,
        display: 'flex',
        zIndex: 100,
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
            color: active === it.key ? C.text : C.t40,
            fontSize: 10,
            fontFamily: FONT,
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
          color: C.t40,
          fontSize: 10,
          fontFamily: FONT,
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
   DASHBOARD
   ============================================================ */
function Dashboard({ rep, leads, deals, tasks, kpis, loading, onGo, onAddLead, onAddTask }) {
  const openLeads = leads.filter(
    (l) => !['closed_won', 'closed_lost', 'not_interested'].includes(l.status),
  )
  const pipelineValue = openLeads.reduce(
    (s, l) => s + (Number(l.estimated_value) || 0),
    0,
  )
  const revenue = deals
    .filter((d) => ['approved', 'commission_paid'].includes(d.status))
    .reduce((s, d) => s + (Number(d.deal_value) || 0), 0)
  const won = leads.filter((l) => l.status === 'closed_won').length
  const winRate = leads.length ? Math.round((won / leads.length) * 100) : 0
  const discovered = leads.filter((l) => l.source === 'discover').length

  const stageCounts = STAGES.reduce((a, k) => {
    a[k] = leads.filter((l) => l.status === k).length
    return a
  }, {})

  const todayTasks = tasks.filter(
    (t) => t.status !== 'done' && isToday(t.due_date),
  )

  const byIndustry = Object.entries(
    leads.reduce((a, l) => {
      const k = l.industry || 'Unspecified'
      a[k] = (a[k] || 0) + 1
      return a
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const recent = [...leads]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  const prioColor = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ fontSize: 26, fontWeight: 600, color: C.text }}>
            {greeting()}, {rep.name?.split(' ')[0] || 'there'}
          </div>
          <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
            {fmtFullDate(new Date())}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn onClick={onAddLead}>
            <Ico name="plus" size={14} /> Add Lead
          </Btn>
          <Btn onClick={onAddTask}>
            <Ico name="plus" size={14} /> Add Task
          </Btn>
          <Btn onClick={() => onGo('pipeline')}>
            <Ico name="arrow-up-right" size={14} /> View Pipeline
          </Btn>
        </div>
      </div>

      <div
        className="sr-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Leads" value={leads.length} sub="all sources" />
            <StatCard
              label="Discovered"
              value={discovered}
              sub="via Discover"
            />
            <StatCard
              label="Pipeline Value"
              value={money(pipelineValue)}
              sub={`${openLeads.length} open`}
            />
            <StatCard
              label="Revenue Closed"
              value={money(revenue)}
              sub="approved deals"
              accent
            />
            <StatCard
              label="Win Rate"
              value={`${winRate}%`}
              sub={`${won} won`}
            />
          </>
        )}
      </div>

      <div
        className="sr-row-65-35"
        style={{
          display: 'grid',
          gridTemplateColumns: '65fr 35fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Section title="Pipeline by Stage" sub="Active distribution">
          {leads.length === 0 ? (
            <Empty icon="layers" text="No deals yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {STAGES.map((k) => {
                const count = stageCounts[k]
                const pct = leads.length
                  ? Math.round((count / leads.length) * 100)
                  : 0
                return (
                  <div key={k}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 7,
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: C.text,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: STATUS[k].color,
                          }}
                        />
                        {STATUS[k].label}
                      </span>
                      <span
                        style={{
                          fontSize: 12.5,
                          color: C.t40,
                          fontWeight: 500,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: STATUS[k].color,
                          borderRadius: 3,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section
          title="Today's Tasks"
          sub="Due today"
          right={
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
                background: C.pill,
                border: `0.5px solid ${C.pillBorder}`,
                borderRadius: 999,
                padding: '3px 9px',
              }}
            >
              {todayTasks.length}
            </span>
          }
        >
          {todayTasks.length === 0 ? (
            <Empty icon="check-square" text="You're all clear today" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 0',
                    borderBottom: C.border,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      border: '0.5px solid rgba(255,255,255,0.2)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: C.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.title}
                  </span>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: prioColor[t.priority] || C.t40,
                    }}
                  />
                  {t.lead_company ? (
                    <span style={{ fontSize: 11, color: C.t35 }}>
                      {t.lead_company}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <Btn full onClick={() => onGo('tasks')} style={{ marginTop: 16 }}>
            View All Tasks
          </Btn>
        </Section>
      </div>

      <div
        className="sr-row-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
      >
        <Section title="Leads by Industry" sub="Distribution">
          {byIndustry.length === 0 ? (
            <Empty icon="building" text="No data yet" />
          ) : (
            byIndustry.map(([name, n]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderBottom: C.border,
                  fontSize: 13,
                }}
              >
                <span style={{ color: C.text }}>{name}</span>
                <span style={{ color: C.t40, fontWeight: 500 }}>{n}</span>
              </div>
            ))
          )}
        </Section>

        <Section title="Recent Leads" sub="Latest added">
          {recent.length === 0 ? (
            <Empty icon="users" text="No leads yet" />
          ) : (
            recent.map((l) => (
              <div
                key={l.id}
                onClick={() => onGo('leads')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: C.border,
                  cursor: 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                    {l.company_name}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.t35, marginTop: 2 }}>
                    {l.industry || '—'}
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: C.t35 }}>
                  {timeAgo(l.created_at)}
                </span>
              </div>
            ))
          )}
        </Section>

        <Section title="Activity This Week" sub="Your output">
          {[
            ['Calls made', kpis.week?.calls_made || 0],
            ['Emails sent', kpis.week?.emails_sent || 0],
            [
              'Total touchpoints',
              (kpis.week?.calls_made || 0) + (kpis.week?.emails_sent || 0),
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 0',
                borderBottom: C.border,
              }}
            >
              <span style={{ fontSize: 13, color: C.t50 }}>{k}</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>
                {v}
              </span>
            </div>
          ))}
        </Section>
      </div>
    </div>
  )
}

/* ============================================================
   LEAD DETAIL PANEL
   ============================================================ */
function PanelHead({ title, sub, onClose, children }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        background: C.sectionCard,
        borderBottom: C.border,
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
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>
            {title}
          </div>
          {sub ? <div style={{ marginTop: 8 }}>{sub}</div> : null}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: C.t40,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <Ico name="x" size={18} />
        </button>
      </div>
      {children}
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
        padding: '8px 0',
        fontSize: 13,
        borderBottom: C.border,
      }}
    >
      <span style={{ color: C.t40 }}>{k}</span>
      <span style={{ color: C.text, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

function LeadDetail({ lead, rep, services, onClose, onChanged, toast }) {
  const [tab, setTab] = useState('overview')
  const [acts, setActs] = useState([])
  const loadActs = useCallback(() => {
    api('lead_activities', { params: { lead_id: lead.id } }).then(
      (d) => d.success && setActs(d.activities || []),
    )
  }, [lead.id])
  useEffect(() => {
    loadActs()
  }, [loadActs])

  const tabs = [
    ['overview', 'Overview'],
    ['activity', 'Activity'],
    ['notes', 'Notes'],
  ]
  if (lead.status === 'closed_won') tabs.push(['deal', 'Deal'])

  async function setStatus(status) {
    await api('update_lead_status', {
      method: 'POST',
      body: { lead_id: lead.id, rep_id: rep.id, status },
    })
    onChanged()
    loadActs()
    toast('Status updated')
  }

  const waNum = (lead.contact_whatsapp || lead.contact_phone || '').replace(
    /[^0-9]/g,
    '',
  )

  return (
    <div>
      <PanelHead
        title={lead.company_name}
        sub={<StatusPill status={lead.status} />}
        onClose={onClose}
      >
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
          {tabs.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: tab === k ? C.active : 'transparent',
                color: tab === k ? C.text : C.t50,
                fontWeight: tab === k ? 500 : 400,
                border: 'none',
                borderRadius: 8,
                padding: '6px 13px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </PanelHead>

      <div style={{ padding: 22 }}>
        {tab === 'overview' && (
          <>
            <div
              style={{
                fontSize: 11,
                color: C.t40,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Contact
            </div>
            <Row k="Name" v={lead.contact_name || '—'} />
            <Row k="Email" v={lead.contact_email || '—'} />
            <Row
              k="Phone"
              v={
                lead.contact_phone ? (
                  <a href={`tel:${lead.contact_phone}`} style={{ color: C.beige }}>
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
            <div
              style={{
                fontSize: 11,
                color: C.t40,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '20px 0 8px',
              }}
            >
              Company
            </div>
            <Row k="Industry" v={lead.industry || '—'} />
            <Row k="Location" v={lead.location || '—'} />
            <Row k="Source" v={lead.source || '—'} />
            <Row
              k="Est. value"
              v={lead.estimated_value ? money(lead.estimated_value) : '—'}
            />
            {lead.notes ? (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: C.t40,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: '20px 0 8px',
                  }}
                >
                  Notes
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                  {lead.notes}
                </div>
              </>
            ) : null}
            <div
              style={{
                fontSize: 11,
                color: C.t40,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '20px 0 10px',
              }}
            >
              Quick status
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {STAGES.concat(['demo_booked', 'proposal_sent']).map((k) => (
                <button
                  key={k}
                  onClick={() => setStatus(k)}
                  style={{
                    background:
                      lead.status === k ? `${STATUS[k].color}26` : C.pill,
                    color: lead.status === k ? STATUS[k].color : C.t50,
                    border:
                      lead.status === k
                        ? `0.5px solid ${STATUS[k].color}66`
                        : `0.5px solid ${C.pillBorder}`,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 11.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: FONT,
                  }}
                >
                  {STATUS[k].label}
                </button>
              ))}
            </div>
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
          <Empty icon="clock" text="No activity logged" />
        ) : (
          acts.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom: i < acts.length - 1 ? C.border : 'none',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: C.pill,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.t50,
                  flexShrink: 0,
                }}
              >
                <Ico name={icon[a.activity_type] || 'file'} size={12} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: C.text }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                    {a.activity_type}
                  </span>
                  {a.description ? (
                    <span style={{ color: C.t40 }}> · {a.description}</span>
                  ) : null}
                </div>
                {a.outcome ? (
                  <div style={{ fontSize: 11.5, color: C.beige, marginTop: 3 }}>
                    {a.outcome}
                  </div>
                ) : null}
                <div style={{ fontSize: 11, color: C.t25, marginTop: 3 }}>
                  {timeAgo(a.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <Field label="Type">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t} style={{ background: C.statCard }}>
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
          placeholder="e.g. Booked a demo Friday"
        />
      </Field>
      <Btn variant="primary" full disabled={busy} onClick={save}>
        {busy ? <Spinner size={14} /> : 'Save activity'}
      </Btn>
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
      <div style={{ marginBottom: 16 }}>
        {notes.length === 0 ? (
          <Empty icon="file" text="No notes yet" />
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              style={{
                background: C.statCard,
                border: C.border,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                {n.description}
              </div>
              <div style={{ fontSize: 11, color: C.t25, marginTop: 8 }}>
                {timeAgo(n.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note..."
        style={{ marginBottom: 12 }}
      />
      <Btn variant="primary" full disabled={busy} onClick={save}>
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
  useEffect(() => {
    const s = services.find((x) => x.name === svc)
    if (s && s.commission_rate) setRate(s.commission_rate)
  }, [svc, services])
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
    <>
      <Field label="Service sold">
        <Select value={svc} onChange={(e) => setSvc(e.target.value)}>
          <option value="" style={{ background: C.statCard }}>
            Select a service
          </option>
          {services.map((s) => (
            <option key={s.id} value={s.name} style={{ background: C.statCard }}>
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
          background: 'rgba(194,181,155,0.08)',
          border: `0.5px solid ${C.beige}44`,
          borderRadius: 10,
          padding: 16,
          marginBottom: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: C.t40, marginBottom: 5 }}>
          You earn
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: C.beige }}>
          {money(commission)}
        </div>
      </div>
      <Field label="Payment proof URL (optional)">
        <Input value={proof} onChange={(e) => setProof(e.target.value)} />
      </Field>
      <Btn variant="primary" full disabled={busy || !svc || !value} onClick={submit}>
        {busy ? <Spinner size={14} /> : 'Submit deal'}
      </Btn>
    </>
  )
}

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
      ? `Why fit: ${prefill.why_good_fit || ''}\nAngle: ${prefill.outreach_angle}`
      : '',
    next_followup: '',
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
        next_followup: f.next_followup
          ? new Date(f.next_followup).toISOString()
          : null,
      },
    })
    setBusy(false)
    if (d.success) onSaved()
  }
  return (
    <div>
      <PanelHead title="Add Lead" onClose={onClose} />
      <div style={{ padding: 22 }}>
        <Field label="Company name *">
          <Input value={f.company_name} onChange={set('company_name')} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contact">
            <Input value={f.contact_name} onChange={set('contact_name')} />
          </Field>
          <Field label="Email">
            <Input value={f.contact_email} onChange={set('contact_email')} />
          </Field>
          <Field label="Phone">
            <Input value={f.contact_phone} onChange={set('contact_phone')} />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={f.contact_whatsapp}
              onChange={set('contact_whatsapp')}
            />
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
              <option key={s} value={s} style={{ background: C.statCard }}>
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
                    background: on ? C.active : C.pill,
                    color: on ? C.text : C.t50,
                    border: `0.5px solid ${C.pillBorder}`,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 11.5,
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Est. value (Afl.)">
            <Input
              type="number"
              value={f.estimated_value}
              onChange={set('estimated_value')}
            />
          </Field>
          <Field label="Next follow-up">
            <Input
              type="date"
              value={f.next_followup}
              onChange={set('next_followup')}
            />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={f.notes} onChange={set('notes')} />
        </Field>
        <Btn
          variant="primary"
          full
          disabled={busy || !f.company_name.trim()}
          onClick={save}
        >
          {busy ? <Spinner size={14} /> : 'Save lead'}
        </Btn>
      </div>
    </div>
  )
}

/* ============================================================
   LEADS
   ============================================================ */
function Leads({ rep, leads, services, loading, reload, isMobile, toast, prefill, clearPrefill }) {
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [openLead, setOpenLead] = useState(null)
  const [adding, setAdding] = useState(!!prefill)
  useEffect(() => {
    if (prefill) setAdding(true)
  }, [prefill])

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
  const pills = ['all', ...STAGES]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          My Leads{' '}
          <span style={{ color: C.t35, fontWeight: 400 }}>
            ({leads.length})
          </span>
        </div>
        <Btn variant="primary" onClick={() => setAdding(true)}>
          <Ico name="plus" size={14} /> Add Lead
        </Btn>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: C.t40,
            }}
          >
            <Ico name="search" size={15} />
          </span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company or contact..."
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {pills.map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            style={{
              background: filter === p ? C.active : C.pill,
              color: filter === p ? C.text : C.t50,
              fontWeight: filter === p ? 500 : 400,
              border: `0.5px solid ${C.pillBorder}`,
              borderRadius: 999,
              padding: '6px 13px',
              fontSize: 12.5,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            {p === 'all' ? 'All' : STATUS[p].label}
          </button>
        ))}
      </div>

      <Section style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr 0.9fr',
            padding: '14px 20px',
            borderBottom: C.border,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: C.t40,
          }}
          className="sr-leadhead"
        >
          <span>Company</span>
          <span>Contact</span>
          <span>Industry</span>
          <span>Status</span>
          <span>Value</span>
          <span>Last activity</span>
        </div>
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '16px 20px', borderBottom: C.border }}>
              <Skel h={14} />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <Empty icon="users" text="No leads match" />
        ) : (
          filtered.map((l) => (
            <div
              key={l.id}
              onClick={() => setOpenLead(l)}
              className="sr-leadrow"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr 0.9fr',
                padding: '16px 20px',
                borderBottom: C.border,
                cursor: 'pointer',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <span style={{ color: C.text, fontWeight: 500 }}>
                {l.company_name}
              </span>
              <span style={{ color: C.t50 }}>{l.contact_name || '—'}</span>
              <span style={{ color: C.t50 }}>{l.industry || '—'}</span>
              <span>
                <StatusPill status={l.status} />
              </span>
              <span style={{ color: C.beige }}>
                {l.estimated_value ? money(l.estimated_value) : '—'}
              </span>
              <span style={{ color: C.t35, fontSize: 12 }}>
                {l.last_activity ? timeAgo(l.last_activity) : 'new'}
              </span>
            </div>
          ))
        )}
      </Section>

      <SlidePanel
        open={!!openLead}
        onClose={() => setOpenLead(null)}
        isMobile={isMobile}
      >
        {openLead && (
          <LeadDetail
            lead={openLead}
            rep={rep}
            services={services}
            toast={toast}
            onClose={() => setOpenLead(null)}
            onChanged={reload}
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
            onSaved={() => {
              setAdding(false)
              clearPrefill && clearPrefill()
              reload()
              toast('Lead added')
            }}
          />
        )}
      </SlidePanel>
    </div>
  )
}

/* ============================================================
   PIPELINE (Kanban)
   ============================================================ */
function Pipeline({ rep, leads, loading, reload, toast }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  async function move(lead, status) {
    if (lead.status === status) return
    await api('update_lead_status', {
      method: 'POST',
      body: { lead_id: lead.id, rep_id: rep.id, status },
    })
    reload()
    toast(`Moved to ${STATUS[status].label}`)
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          Pipeline
        </div>
        <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
          Drag leads between stages
        </div>
      </div>
      {loading ? (
        <Skel h={300} r={16} />
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {STAGES.map((stage) => {
            const items = leads.filter((l) => l.status === stage)
            const total = items.reduce(
              (s, l) => s + (Number(l.estimated_value) || 0),
              0,
            )
            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverCol(stage)
                }}
                onDragLeave={() => setOverCol((c) => (c === stage ? null : c))}
                onDrop={() => {
                  const lead = leads.find((l) => l.id === dragId)
                  if (lead) move(lead, stage)
                  setDragId(null)
                  setOverCol(null)
                }}
                style={{
                  flex: '0 0 260px',
                  background: C.sectionCard,
                  border:
                    overCol === stage
                      ? `0.5px dashed ${STATUS[stage].color}`
                      : C.border,
                  borderRadius: 16,
                  padding: 14,
                  minHeight: 360,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: STATUS[stage].color,
                      }}
                    />
                    {STATUS[stage].label}
                  </span>
                  <span style={{ fontSize: 11.5, color: C.t40 }}>
                    {items.length}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: C.t35, marginBottom: 12 }}>
                  {money(total)}
                </div>
                {items.length === 0 ? (
                  <div
                    style={{
                      border: '0.5px dashed rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '24px 10px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: C.t25,
                    }}
                  >
                    Drop leads here
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map((l) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={() => setDragId(l.id)}
                        onDragEnd={() => setDragId(null)}
                        style={{
                          background: C.statCard,
                          border: C.border,
                          borderRadius: 10,
                          padding: 12,
                          cursor: 'grab',
                          opacity: dragId === l.id ? 0.5 : 1,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: C.text,
                          }}
                        >
                          {l.company_name}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: C.t35,
                            marginTop: 3,
                          }}
                        >
                          {l.contact_name || '—'}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 9,
                            fontSize: 11,
                          }}
                        >
                          <span style={{ color: C.beige }}>
                            {l.estimated_value
                              ? money(l.estimated_value)
                              : '—'}
                          </span>
                          <span style={{ color: C.t25 }}>
                            {daysSince(l.updated_at)}d
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   DISCOVER
   ============================================================ */
function Discover({ rep, leads, onSaveLead }) {
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
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          Discover Leads
        </div>
        <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
          Find and research potential clients
        </div>
      </div>

      <Section title="Search" sub="AI-researched prospects" style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span
            style={{
              position: 'absolute',
              left: 13,
              top: '50%',
              transform: 'translateY(-50%)',
              color: C.t40,
            }}
          >
            <Ico name="search" size={15} />
          </span>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Search businesses, industries, or locations in Aruba..."
            style={{ paddingLeft: 38 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Industry"
            style={{ flex: 1, minWidth: 140 }}
          />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (default Aruba)"
            style={{ flex: 1, minWidth: 140 }}
          />
        </div>
        <Btn variant="primary" onClick={run} disabled={busy || !q.trim()}>
          {busy ? <Spinner size={14} /> : <Ico name="sparkle" size={14} />}
          {busy ? 'Researching...' : 'Discover'}
        </Btn>
        {err ? (
          <div style={{ fontSize: 12.5, color: '#f87171', marginTop: 12 }}>
            {err}
          </div>
        ) : null}
      </Section>

      {results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}
        >
          {results.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: C.statCard,
                border: C.border,
                borderRadius: 12,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                {r.company_name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.t40,
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                {r.industry} · {r.location}
                {r.estimated_value ? ` · ~${money(r.estimated_value)}` : ''}
              </div>
              <div style={{ fontSize: 12.5, color: C.t50, lineHeight: 1.55, marginBottom: 10 }}>
                {r.why_good_fit}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: C.beige,
                  lineHeight: 1.55,
                  marginBottom: 16,
                }}
              >
                {r.outreach_angle}
              </div>
              <Btn full size="sm" onClick={() => onSaveLead(r)}>
                <Ico name="plus" size={13} /> Save as Lead
              </Btn>
            </motion.div>
          ))}
        </div>
      )}

      <Section title="Saved Discovers" sub={`${saved.length} saved`}>
        {saved.length === 0 ? (
          <Empty icon="search" text="No saved discoveries" />
        ) : (
          saved.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: C.border,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
                  {l.company_name}
                </div>
                <div style={{ fontSize: 11.5, color: C.t35, marginTop: 2 }}>
                  {l.industry || '—'}
                  {l.location ? ` · ${l.location}` : ''}
                </div>
              </div>
              <StatusPill status={l.status} />
            </div>
          ))
        )}
      </Section>
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
  return `Hi — I'm with Lithos Labs. We help businesses with ${s.name}. ${
    s.description || ''
  } Investment is ${
    s.price_fixed
      ? `Afl. ${s.price_fixed}`
      : `Afl. ${s.price_min} – Afl. ${s.price_max}`
  }. Would a quick call to see if it fits make sense?`
}

function Offers() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [recInput, setRecInput] = useState('')
  const [rec, setRec] = useState(null)
  const [recBusy, setRecBusy] = useState(false)
  useEffect(() => {
    api('services_catalog').then((d) => {
      if (d.success) setServices(d.services || [])
      setLoading(false)
    })
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
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          Agency Offers
        </div>
        <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
          Know what you're selling
        </div>
      </div>
      {loading ? (
        <Skel h={160} r={16} style={{ marginBottom: 14 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {services.map((s) => {
            const price = s.price_fixed
              ? `Afl. ${s.price_fixed}`
              : `Afl. ${s.price_min} — Afl. ${s.price_max}`
            const cLow = (
              ((s.price_fixed || s.price_min || 0) * (s.commission_rate || 0)) /
              100
            ).toFixed(0)
            const cHigh = (
              ((s.price_fixed || s.price_max || 0) * (s.commission_rate || 0)) /
              100
            ).toFixed(0)
            const inc = INCLUDED[s.name]
            return (
              <div
                key={s.id}
                style={{
                  background: C.sectionCard,
                  border: C.border,
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: C.text,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {s.name}
                      {s.category ? (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 500,
                            color: C.t40,
                            background: C.pill,
                            border: `0.5px solid ${C.pillBorder}`,
                            borderRadius: 999,
                            padding: '2px 8px',
                          }}
                        >
                          {s.category}
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: C.t50,
                        marginTop: 8,
                        maxWidth: 560,
                        lineHeight: 1.6,
                      }}
                    >
                      {s.description}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                      {price}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: C.beige,
                        fontWeight: 600,
                        marginTop: 6,
                      }}
                    >
                      Your commission: {s.commission_rate}% —{' '}
                      {cLow === cHigh
                        ? money(cLow)
                        : `${money(cLow)} to ${money(cHigh)}`}
                    </div>
                  </div>
                </div>
                {inc ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px 22px',
                      marginTop: 16,
                    }}
                  >
                    {inc.map((it) => (
                      <span
                        key={it}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 12.5,
                          color: C.t50,
                        }}
                      >
                        <Ico name="check" size={13} color={C.beige} />
                        {it}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div style={{ marginTop: 18 }}>
                  <CopyBtn text={pitchFor(s)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Section
        title="AI Service Recommender"
        sub="Describe the prospect"
        style={{ marginTop: 16 }}
      >
        <Textarea
          value={recInput}
          onChange={(e) => setRecInput(e.target.value)}
          placeholder="e.g. Small real estate agency, 4 agents, no CRM, all WhatsApp..."
          style={{ marginBottom: 12 }}
        />
        <Btn variant="primary" onClick={recommend} disabled={recBusy || !recInput.trim()}>
          {recBusy ? <Spinner size={14} /> : <Ico name="sparkle" size={14} />}
          {recBusy ? 'Thinking...' : 'Get Recommendation'}
        </Btn>
        {rec ? (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(194,181,155,0.06)',
              border: `0.5px solid ${C.beige}33`,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ fontSize: 12, color: C.t40, marginBottom: 5 }}>
              Recommended service
            </div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: C.beige,
                marginBottom: 10,
              }}
            >
              {rec.recommended_service}
            </div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
              {rec.why}
            </div>
            {rec.pitch ? (
              <div
                style={{
                  fontSize: 12.5,
                  color: C.t40,
                  fontStyle: 'italic',
                  borderLeft: `2px solid ${C.beige}`,
                  paddingLeft: 12,
                  marginTop: 12,
                }}
              >
                {rec.pitch}
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>
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
      "Hi [Name], [You] from Lithos Labs — I'll be quick. We build CRM systems for Aruba businesses still running on spreadsheets. Bad time for 30 seconds?",
    discovery: [
      'How are you tracking leads and clients today?',
      'Who follows up when a lead comes in, and how?',
      'How many leads slip through each month?',
      'How much time goes to manual follow-up?',
      'What would you do with that time back?',
    ],
    objection:
      '"Too expensive" -> Compare it to one lost client a month. "We have a system" -> Is it capturing every lead automatically? "Send info" -> I will send it after a 15-min call so it is relevant.',
    closing:
      "This is exactly what we fix. Let's do 20 minutes to map your pipeline — Thursday or Friday?",
  },
  {
    name: 'AI Marketing System',
    opening:
      "Hi [Name], [You] from Lithos Labs. We build AI systems that generate and post content automatically. Who handles your content right now?",
    discovery: [
      'How consistently are you posting?',
      'Who writes and designs it?',
      'What does that cost in time or money?',
      "What's stopping daily posting?",
      'What would on-brand auto-content be worth?',
    ],
    objection:
      '"AI sounds generic" -> It is trained on your brand voice and memory. "We have someone" -> This makes them 10x faster. "Not sure it works" -> I will show a sample in your voice.',
    closing:
      "Let me show you a content sample in your brand voice. 20 minutes this week?",
  },
  {
    name: 'Full Business Operating System',
    opening:
      "Hi [Name], [You] from Lithos Labs. We install complete operating systems — CRM, AI marketing, website — for businesses ready to scale. Are you the right person for systems?",
    discovery: [
      'Which part of the business feels most chaotic?',
      'Do your tools talk to each other?',
      'Where are you losing time or money?',
      'What would scaling look like with systems handled?',
      "What's your timeline?",
    ],
    objection:
      '"Big commitment" -> That is why we map it first, no obligation. "Do it in phases?" -> Yes, we sequence by impact. "Cost?" -> Mapped to ROI on the call.',
    closing:
      "This is our flagship. Let's do a full strategy session to map your operation. What day next week?",
  },
]
const DM_SCRIPTS = [
  {
    channel: 'Instagram',
    body: "Hey [Name] — love what you're building with [Company]. Quick one: handling leads/content manually right now? We build CRM + AI marketing systems for Aruba businesses — freed ~15 hrs/week for a similar brand. Worth a 15-min call?",
  },
  {
    channel: 'WhatsApp',
    body: 'Hi [Name], [You] from Lithos Labs. We help businesses like [Company] put real systems in place — CRM, automations, AI content. Can I send a 2-min example of what we built for a similar business?',
  },
  {
    channel: 'Email',
    body: 'Subject: Quick idea for [Company]\n\nHi [Name], [Company] is growing fast — most businesses at this stage start losing leads when systems cannot keep up. We install CRM + automation infrastructure that fixes exactly that, usually live in under a week. Open to a short call Thursday or Friday?',
  },
]

function Scripts() {
  const [sub, setSub] = useState('call')
  const [obj, setObj] = useState('')
  const [resp, setResp] = useState('')
  const [busy, setBusy] = useState(false)
  async function ask() {
    if (!obj.trim()) return
    setBusy(true)
    setResp('')
    const d = await api('objection_help', {
      method: 'POST',
      body: { objection: obj },
    })
    setBusy(false)
    setResp(d.success ? d.response : d.error || 'AI not available')
  }
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          Sales Scripts
        </div>
        <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
          Close with confidence
        </div>
      </div>
      <SubTabs
        tabs={[
          ['call', 'Call Scripts'],
          ['dm', 'DM Scripts'],
          ['obj', 'Objection Handler'],
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === 'call' &&
        CALL_SCRIPTS.map((s) => {
          const full = `OPENING:\n${s.opening}\n\nDISCOVERY:\n${s.discovery
            .map((q, i) => `${i + 1}. ${q}`)
            .join('\n')}\n\nOBJECTIONS:\n${s.objection}\n\nCLOSING:\n${s.closing}`
          return (
            <Accordion key={s.name} title={s.name} sub="Full call flow">
              <SB label="Opening (15s)" text={s.opening} />
              <div style={{ marginTop: 14 }}>
                <div style={lbl}>Discovery questions</div>
                {s.discovery.map((qq, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: C.text,
                      padding: '5px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {i + 1}. {qq}
                  </div>
                ))}
              </div>
              <SB label="Objection handling" text={s.objection} />
              <SB label="Closing" text={s.closing} />
              <div style={{ marginTop: 14 }}>
                <CopyBtn text={full} label="Copy Script" />
              </div>
            </Accordion>
          )
        })}
      {sub === 'dm' &&
        DM_SCRIPTS.map((s) => (
          <Accordion key={s.channel} title={s.channel} sub="Outreach template">
            <div
              style={{
                fontSize: 13,
                color: C.text,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                marginTop: 12,
              }}
            >
              {s.body}
            </div>
            <div style={{ marginTop: 14 }}>
              <CopyBtn text={s.body} label="Copy Template" />
            </div>
          </Accordion>
        ))}
      {sub === 'obj' && (
        <Section title="Objection Handler" sub="AI-assisted responses" style={{ maxWidth: 720 }}>
          <Textarea
            value={obj}
            onChange={(e) => setObj(e.target.value)}
            placeholder="e.g. It's too expensive / We already have someone"
            style={{ marginBottom: 12 }}
          />
          <Btn variant="primary" onClick={ask} disabled={busy || !obj.trim()}>
            {busy ? <Spinner size={14} /> : <Ico name="sparkle" size={14} />}
            {busy ? 'Thinking...' : 'Get Response'}
          </Btn>
          {resp ? (
            <div
              style={{
                marginTop: 16,
                background: C.statCard,
                border: C.border,
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.65, marginBottom: 12 }}>
                {resp}
              </div>
              <CopyBtn text={resp} label="Copy" />
            </div>
          ) : null}
        </Section>
      )}
    </div>
  )
}
const lbl = {
  fontSize: 11,
  color: C.t40,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  marginBottom: 7,
}
function SB({ label, text }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={lbl}>{label}</div>
      <div
        style={{
          fontSize: 13,
          color: C.text,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </div>
  )
}

/* ============================================================
   TASKS
   ============================================================ */
function Tasks({ rep, leads, tasks, loading, reload, toast }) {
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

  const filtered = tasks.filter((t) => {
    if (filter === 'today') return t.status !== 'done' && isToday(t.due_date)
    if (filter === 'overdue') return t.status !== 'done' && isOverdue(t.due_date)
    if (filter === 'done') return t.status === 'done'
    return true
  })
  async function add() {
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
    reload()
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
    reload()
  }
  async function del(t) {
    await api('delete_task', { method: 'POST', body: { task_id: t.id } })
    reload()
    toast('Task deleted')
  }
  const prioColor = { high: '#f87171', medium: '#fbbf24', low: '#60a5fa' }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          My Tasks{' '}
          <span style={{ color: C.t35, fontWeight: 400 }}>
            ({tasks.filter((t) => t.status !== 'done').length})
          </span>
        </div>
        <Btn variant="primary" onClick={() => setAdding(true)}>
          <Ico name="plus" size={14} /> Add Task
        </Btn>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {['all', 'today', 'overdue', 'done'].map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            style={{
              background: filter === p ? C.active : C.pill,
              color: filter === p ? C.text : C.t50,
              border: `0.5px solid ${C.pillBorder}`,
              borderRadius: 999,
              padding: '6px 13px',
              fontSize: 12.5,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontFamily: FONT,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <Skel h={60} r={12} />
      ) : filtered.length === 0 ? (
        <Section style={{ padding: 8 }}>
          <Empty icon="check-square" text="No tasks" />
        </Section>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((t) => {
            const overdue = isOverdue(t.due_date) && t.status !== 'done'
            const done = t.status === 'done'
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: overdue
                    ? 'rgba(251,191,36,0.06)'
                    : C.statCard,
                  border: overdue
                    ? '0.5px solid rgba(251,191,36,0.25)'
                    : C.border,
                  borderRadius: 12,
                  padding: 14,
                  opacity: done ? 0.55 : 1,
                }}
              >
                <button
                  onClick={() => toggle(t)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: done
                      ? '0.5px solid #4ade80'
                      : '0.5px solid rgba(255,255,255,0.2)',
                    background: done ? '#4ade80' : 'transparent',
                    color: '#000',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {done && <Ico name="check" size={12} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: C.text,
                      fontWeight: 500,
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {t.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: C.t35,
                      marginTop: 3,
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    {t.lead_company ? <span>{t.lead_company}</span> : null}
                    {t.due_date ? (
                      <span style={{ color: overdue ? '#fbbf24' : C.t35 }}>
                        Due {shortDate(t.due_date)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: prioColor[t.priority] || C.t40,
                    background: `${prioColor[t.priority] || '#888'}1f`,
                    borderRadius: 999,
                    padding: '3px 9px',
                    textTransform: 'capitalize',
                  }}
                >
                  {t.priority}
                </span>
                <button
                  onClick={() => del(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.t25,
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Ico name="trash" size={14} />
                </button>
              </div>
            )
          })}
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
                <option key={p} value={p} style={{ background: C.statCard }}>
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
        <Field label="Linked lead (optional)">
          <Select
            value={f.lead_id}
            onChange={(e) => setF({ ...f, lead_id: e.target.value })}
          >
            <option value="" style={{ background: C.statCard }}>
              None
            </option>
            {leads.map((l) => (
              <option key={l.id} value={l.id} style={{ background: C.statCard }}>
                {l.company_name}
              </option>
            ))}
          </Select>
        </Field>
        <Btn variant="primary" full disabled={busy || !f.title.trim()} onClick={add}>
          {busy ? <Spinner size={14} /> : 'Save task'}
        </Btn>
      </Modal>
    </div>
  )
}

/* ============================================================
   DEMOS
   ============================================================ */
function Demos({ rep, toast }) {
  const [modal, setModal] = useState(false)
  const demos = [
    { icon: 'users', title: 'CRM Demo', desc: 'Show a live CRM with pipelines and automations.' },
    { icon: 'sparkle', title: 'AI Marketing Demo', desc: 'Show content being generated in real time.' },
    { icon: 'monitor', title: 'Website Preview', desc: 'Show a mockup of their future website.' },
    { icon: 'grid', title: 'Full System Demo', desc: 'Show the complete Lithos Labs system.' },
  ]
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          Demos
        </div>
        <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
          Show clients what's possible
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {demos.map((d) => (
          <div
            key={d.title}
            style={{
              background: C.sectionCard,
              border: C.border,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: C.pill,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.t50,
                marginBottom: 14,
              }}
            >
              <Ico name={d.icon} size={18} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
              {d.title}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: C.t40,
                marginTop: 6,
                marginBottom: 16,
                lineHeight: 1.55,
                minHeight: 36,
              }}
            >
              {d.desc}
            </div>
            <Btn full size="sm" onClick={() => setModal(true)}>
              View Demo
            </Btn>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Demo">
        <div style={{ fontSize: 13, color: C.t40, lineHeight: 1.65, marginBottom: 20 }}>
          Direct the client to{' '}
          <span style={{ color: C.beige }}>lithos-labs.vercel.app</span> and
          walk them through the live system.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn
            size="sm"
            variant="primary"
            onClick={() => {
              try {
                navigator.clipboard.writeText('https://lithos-labs.vercel.app')
              } catch {
                /* ignore */
              }
              toast('Demo link copied')
            }}
          >
            <Ico name="copy" size={13} /> Copy share link
          </Btn>
          <Btn
            size="sm"
            onClick={async () => {
              await api('notify_admin', {
                method: 'POST',
                body: {
                  title: 'Custom demo requested',
                  message: `${rep.name} requested a custom demo`,
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
   ADMIN
   ============================================================ */
function Admin({ rep, toast }) {
  const [sub, setSub] = useState('pending')
  const [pending, setPending] = useState([])
  const [reps, setReps] = useState([])
  const [allLeads, setAllLeads] = useState([])
  const [services, setServices] = useState([])
  const [rejId, setRejId] = useState(null)
  const [rejNotes, setRejNotes] = useState('')

  const loadPending = useCallback(() => {
    api('admin_deals', { params: { status: 'pending_approval' } }).then(
      (d) => d.success && setPending(d.deals || []),
    )
  }, [])
  useEffect(() => {
    loadPending()
    api('admin_all_reps').then((d) => d.success && setReps(d.reps || []))
    api('services_catalog').then((d) => d.success && setServices(d.services || []))
  }, [loadPending])
  useEffect(() => {
    if (sub === 'leads' && allLeads.length === 0 && reps.length) {
      Promise.all(
        reps.map((r) =>
          api('rep_leads', { params: { rep_id: r.id } }).then((d) =>
            (d.leads || []).map((l) => ({ ...l, rep_name: r.name })),
          ),
        ),
      ).then((arrs) => setAllLeads(arrs.flat()))
    }
  }, [sub, reps, allLeads.length])

  async function decide(d, approved) {
    await api('approve_deal', {
      method: 'POST',
      body: {
        deal_id: d.id,
        admin_id: rep.id,
        approved,
        admin_notes: approved ? null : rejNotes,
      },
    })
    setRejId(null)
    setRejNotes('')
    loadPending()
    toast(approved ? 'Deal approved' : 'Deal rejected')
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
          Admin
        </div>
        <div style={{ fontSize: 13, color: C.t35, marginTop: 2 }}>
          Team oversight & approvals
        </div>
      </div>
      <SubTabs
        tabs={[
          ['pending', 'Pending Deals'],
          ['reps', 'All Reps'],
          ['leads', 'All Leads'],
          ['settings', 'Settings'],
        ]}
        active={sub}
        onChange={setSub}
      />

      {sub === 'pending' &&
        (pending.length === 0 ? (
          <Section style={{ padding: 8 }}>
            <Empty icon="check-square" text="No deals waiting" />
          </Section>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((d) => (
              <div
                key={d.id}
                style={{
                  background: C.sectionCard,
                  border: C.border,
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                      {d.service_name}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.t40, marginTop: 4 }}>
                      {d.rep_name} · {d.company_name}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.t40, marginTop: 6 }}>
                      {money(d.deal_value)} · {d.commission_rate}% · Commission{' '}
                      <span style={{ color: C.beige, fontWeight: 600 }}>
                        {money(d.commission_amount)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn size="sm" variant="primary" onClick={() => decide(d, true)}>
                      Approve
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => setRejId(d.id)}>
                      Reject
                    </Btn>
                  </div>
                </div>
                {rejId === d.id && (
                  <div style={{ marginTop: 14 }}>
                    <Textarea
                      value={rejNotes}
                      onChange={(e) => setRejNotes(e.target.value)}
                      placeholder="Reason..."
                      style={{ marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn size="sm" variant="danger" onClick={() => decide(d, false)}>
                        Confirm reject
                      </Btn>
                      <Btn size="sm" onClick={() => setRejId(null)}>
                        Cancel
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

      {sub === 'reps' && (
        <Section title="Rep Performance" sub="All active reps" style={{ padding: 0 }}>
          {reps.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: C.border,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 12, color: C.t40, marginTop: 3 }}>
                  {r.email} · {r.commission_rate}%
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, textAlign: 'right' }}>
                <Mini label="Leads" v={r.total_leads} />
                <Mini label="Deals" v={r.deals_closed} />
                <Mini label="Paid" v={money(r.paid_commission)} accent />
                <Mini label="Pending" v={money(r.pending_commission)} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {sub === 'leads' && (
        <Section title="All Leads" sub="Every rep" style={{ padding: 0 }}>
          {allLeads.length === 0 ? (
            <Empty icon="users" text="Loading or no leads" />
          ) : (
            allLeads.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: C.border,
                  fontSize: 13,
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <span style={{ color: C.text, fontWeight: 500 }}>
                    {l.company_name}
                  </span>
                  <span style={{ color: C.t35 }}> · {l.rep_name}</span>
                </div>
                <StatusPill status={l.status} />
              </div>
            ))
          )}
        </Section>
      )}

      {sub === 'settings' && (
        <>
          <Section title="Invite Code" sub="Rep self-registration" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: C.t40, lineHeight: 1.6 }}>
              Configured via the SALES_REP_INVITE_CODE environment variable in
              the deployment.
            </div>
          </Section>
          <Section title="Services Catalog" sub="Active services" style={{ padding: 0 }}>
            {services.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '14px 24px',
                  borderBottom: C.border,
                  fontSize: 13,
                }}
              >
                <span style={{ color: C.text }}>{s.name}</span>
                <span style={{ color: C.t40 }}>
                  {s.price_fixed
                    ? money(s.price_fixed)
                    : `${money(s.price_min)}–${money(s.price_max)}`}{' '}
                  · {s.commission_rate}%
                </span>
              </div>
            ))}
          </Section>
        </>
      )}
    </div>
  )
}
function Mini({ label, v, accent }) {
  return (
    <div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: accent ? C.beige : C.text,
        }}
      >
        {v}
      </div>
      <div style={{ fontSize: 10.5, color: C.t35, marginTop: 2 }}>{label}</div>
    </div>
  )
}

/* ============================================================
   TOAST + ROOT
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
            zIndex: 700,
            background: '#ffffff',
            color: '#000',
            fontSize: 13,
            fontWeight: 600,
            padding: '11px 22px',
            borderRadius: 999,
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
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
  const [rep, setRep] = useState(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState('dashboard')
  const [leads, setLeads] = useState([])
  const [deals, setDeals] = useState([])
  const [tasks, setTasks] = useState([])
  const [services, setServices] = useState([])
  const [kpis, setKpis] = useState({ week: {}, today: {} })
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [discoverPrefill, setDiscoverPrefill] = useState(null)

  const toast = useCallback((m) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg(''), 2600)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY)
      if (saved) setRep(JSON.parse(saved))
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  const reloadAll = useCallback(async () => {
    if (!rep?.id) return
    setLoading(true)
    const [ld, dl, tk, kp] = await Promise.all([
      api('rep_leads', { params: { rep_id: rep.id } }),
      api('rep_deals', { params: { rep_id: rep.id } }),
      api('rep_tasks', { params: { rep_id: rep.id } }),
      api('rep_kpis', { params: { rep_id: rep.id } }),
    ])
    if (ld.success) setLeads(ld.leads || [])
    if (dl.success) setDeals(dl.deals || [])
    if (tk.success) setTasks(tk.tasks || [])
    if (kp.success) setKpis({ week: kp.week || {}, today: kp.today || {} })
    setLoading(false)
  }, [rep?.id])

  useEffect(() => {
    if (!rep?.id) return
    reloadAll()
    api('services_catalog').then((d) => d.success && setServices(d.services || []))
  }, [rep?.id, reloadAll])

  function logout() {
    localStorage.removeItem(AUTH_KEY)
    setRep(null)
    setActive('dashboard')
  }
  function go(key) {
    setActive(key)
    setMoreOpen(false)
  }

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size={24} />
      </div>
    )
  }
  if (!rep) return <Login onAuth={setRep} />

  const nav = NAV.filter((n) => !n.adminOnly || rep.role === 'admin')

  const view = (() => {
    switch (active) {
      case 'dashboard':
        return (
          <Dashboard
            rep={rep}
            leads={leads}
            deals={deals}
            tasks={tasks}
            kpis={kpis}
            loading={loading}
            onGo={go}
            onAddLead={() => go('leads')}
            onAddTask={() => go('tasks')}
          />
        )
      case 'leads':
        return (
          <Leads
            rep={rep}
            leads={leads}
            services={services}
            loading={loading}
            reload={reloadAll}
            isMobile={isMobile}
            toast={toast}
            prefill={discoverPrefill}
            clearPrefill={() => setDiscoverPrefill(null)}
          />
        )
      case 'pipeline':
        return (
          <Pipeline
            rep={rep}
            leads={leads}
            loading={loading}
            reload={reloadAll}
            toast={toast}
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
      case 'scripts':
        return <Scripts />
      case 'tasks':
        return (
          <Tasks
            rep={rep}
            leads={leads}
            tasks={tasks}
            loading={loading}
            reload={reloadAll}
            toast={toast}
          />
        )
      case 'demos':
        return <Demos rep={rep} toast={toast} />
      case 'admin':
        return rep.role === 'admin' ? (
          <Admin rep={rep} toast={toast} />
        ) : (
          <Dashboard
            rep={rep}
            leads={leads}
            deals={deals}
            tasks={tasks}
            kpis={kpis}
            loading={loading}
            onGo={go}
            onAddLead={() => go('leads')}
            onAddTask={() => go('tasks')}
          />
        )
      default:
        return null
    }
  })()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: FONT,
      }}
    >
      <style>{`
        @keyframes srPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .sr-pulse { animation: srPulse 1.4s ease-in-out infinite; }
        .sr-leadrow:hover { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar { width: 7px; height: 7px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        @media (max-width: 1100px) {
          .sr-stats { grid-template-columns: repeat(2,1fr) !important; }
          .sr-row-65-35 { grid-template-columns: 1fr !important; }
          .sr-row-3 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .sr-stats { grid-template-columns: 1fr !important; }
          .sr-leadhead, .sr-leadrow { grid-template-columns: 1.4fr 1fr 0.9fr !important; }
          .sr-leadhead span:nth-child(2), .sr-leadrow span:nth-child(2),
          .sr-leadhead span:nth-child(5), .sr-leadrow span:nth-child(5),
          .sr-leadhead span:nth-child(6), .sr-leadrow span:nth-child(6) { display:none !important; }
        }
      `}</style>

      <TopNav
        rep={rep}
        active={active}
        setActive={go}
        onLogout={logout}
        nav={nav}
        isMobile={isMobile}
      />

      <main
        style={{
          padding: isMobile ? '20px 16px 84px' : '32px 32px',
          maxWidth: 1400,
          margin: '56px auto 0',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {view}
        </motion.div>
      </main>

      {isMobile && (
        <MobileNav
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
              <button
                key={n.key}
                onClick={() => go(n.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: active === n.key ? C.active : 'transparent',
                  color: active === n.key ? C.text : C.t50,
                  fontFamily: FONT,
                }}
              >
                <Ico name={n.icon} size={16} />
                {n.label}
              </button>
            ))}
        </div>
      </Modal>

      <Toast msg={toastMsg} />
    </div>
  )
}
