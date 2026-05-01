import { useRef } from 'react'

export default function GlassCard2({ children, style = {}, hoverEffect = true, padding = '1.75rem' }) {
  const ref = useRef(null)

  function onMove(e) {
    if (!hoverEffect || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ref.current.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,140,50,0.08), rgba(30,22,14,0.85) 60%)`
  }
  function onLeave() {
    if (!ref.current) return
    ref.current.style.background = 'rgba(30,22,14,0.85)'
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        background: 'rgba(30,22,14,0.85)',
        border: '0.5px solid rgba(255,140,50,0.15)',
        borderRadius: 16,
        padding,
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,140,50,0.06)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.25s ease',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
