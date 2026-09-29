// Shared UI primitives for Lead Intelligence, matching the existing CRM
// monochrome glass style (Leads / Discover / AddLeadModal).

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { S } from './shared'
import { X, Loader2 } from 'lucide-react'

export function Button({ variant = 'ghost', small, children, style, disabled, ...rest }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    fontSize: small ? 12 : 13,
    fontWeight: variant === 'solid' ? 600 : 500,
    padding: small ? '6px 12px' : '9px 18px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s ease, background 0.15s ease',
  }
  const variants = {
    solid: { background: '#fff', color: '#000', border: '1px solid #fff' },
    ghost: { background: 'transparent', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' },
    subtle: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
    danger: { background: 'transparent', color: '#FF6B6B', border: '1px solid rgba(255,68,68,0.35)' },
  }
  return (
    <button type="button" disabled={disabled} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
}

export function Pill({ children, strong, style, title }) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        background: strong ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.05)',
        color: strong ? '#fff' : 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function TogglePill({ active, children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 13px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active ? '#ffffff' : 'rgba(255,255,255,0.05)',
        color: active ? '#000000' : 'rgba(255,255,255,0.85)',
        border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

export function Field({ label, children, hint, style }) {
  return (
    <div style={style}>
      {label && <div style={S.label}>{label}</div>}
      {children}
      {hint && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{hint}</div>}
    </div>
  )
}

// Score badge: grayscale ramp so higher scores read brighter.
export function ScoreBadge({ score, size = 'md' }) {
  const s = Number(score) || 0
  const big = size === 'lg'
  const bg = s >= 70 ? '#ffffff' : s >= 50 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'
  const fg = s >= 70 ? '#000000' : '#ffffff'
  return (
    <span
      title="Lead Intelligence Score: strength of the sales opportunity for Lithos Labs (not a rating of the business)"
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        minWidth: big ? 64 : 40,
        padding: big ? '8px 12px' : '3px 8px',
        borderRadius: big ? 14 : 999,
        background: bg,
        color: fg,
        fontWeight: 700,
        fontSize: big ? 26 : 12.5,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {s}
      {big && <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.6, marginLeft: 3 }}>/100</span>}
    </span>
  )
}

// Detected / Not detected / Unknown, never conflated.
export function TriState({ status, detected = 'Detected', notDetected = 'Not detected', unknown = 'Unknown' }) {
  const map = {
    detected: { text: detected, dot: '#ffffff' },
    not_detected: { text: notDetected, dot: 'rgba(255,255,255,0.35)' },
    unknown: { text: unknown, dot: 'transparent' },
  }
  const m = map[status] || map.unknown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: status === 'unknown' || !status ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, border: '1px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
      {m.text}
    </span>
  )
}

export function NA({ children = 'Not available' }) {
  return <span style={{ color: 'rgba(255,255,255,0.3)' }}>{children}</span>
}

export function Spinner({ size = 14 }) {
  return <Loader2 size={size} style={{ animation: 'intel-spin 0.9s linear infinite' }} />
}

export function Modal({ open, onClose, title, children, width = 560, footer }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return createPortal(
    <AnimatePresence>
      {open && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: 16,
          }}
        >
          <Motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18,
              width: '100%',
              maxWidth: width,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px' }}>
              <div style={{ fontSize: 16, fontWeight: 650, color: '#fff' }}>{title}</div>
              <button type="button" aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '4px 20px 20px', overflowY: 'auto' }}>{children}</div>
            {footer && <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>{footer}</div>}
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Checkbox({ checked, onChange, label, indeterminate }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      style={{ width: 15, height: 15, accentColor: '#ffffff', cursor: 'pointer' }}
    />
  )
}

