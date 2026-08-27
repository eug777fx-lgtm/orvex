// Electronic signature pad — draw with mouse or touch, or type a signature.
// Exposes the result as a PNG data URL via onChange (null when empty).

import { useEffect, useRef, useState } from 'react'

const PAD_H = 160

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)
  const [mode, setMode] = useState('draw') // draw | type
  const [typed, setTyped] = useState('')
  const [empty, setEmpty] = useState(true)

  // --- drawing ------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'draw') return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = PAD_H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111'

    const pos = (e) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const down = (e) => {
      e.preventDefault()
      drawing.current = true
      const { x, y } = pos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      canvas.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (!drawing.current) return
      e.preventDefault()
      const { x, y } = pos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      if (!hasInk.current) {
        hasInk.current = true
        setEmpty(false)
      }
    }
    const up = () => {
      if (drawing.current && hasInk.current) {
        onChange?.(canvas.toDataURL('image/png'))
      }
      drawing.current = false
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [mode, onChange])

  // --- typed --------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'type') return
    if (!typed.trim()) {
      onChange?.(null)
      setEmpty(true)
      return
    }
    const c = document.createElement('canvas')
    c.width = 700
    c.height = 220
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#111'
    ctx.font = 'italic 64px "Snell Roundhand", "Brush Script MT", "Segoe Script", cursive'
    ctx.textBaseline = 'middle'
    ctx.fillText(typed.trim().slice(0, 40), 24, 110)
    onChange?.(c.toDataURL('image/png'))
    setEmpty(false)
  }, [typed, mode, onChange])

  const clear = () => {
    hasInk.current = false
    setEmpty(true)
    setTyped('')
    onChange?.(null)
    if (mode === 'draw') {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const tabBtn = (active) => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 999,
    cursor: 'pointer',
    border: active ? '1px solid #fff' : '1px solid rgba(255,255,255,0.2)',
    background: active ? '#fff' : 'transparent',
    color: active ? '#000' : 'rgba(255,255,255,0.7)',
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button type="button" style={tabBtn(mode === 'draw')} onClick={() => { setMode('draw'); clear() }}>
          Draw
        </button>
        <button type="button" style={tabBtn(mode === 'type')} onClick={() => { setMode('type'); clear() }}>
          Type
        </button>
        {!empty && (
          <button
            type="button"
            onClick={clear}
            style={{ ...tabBtn(false), marginLeft: 'auto', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Clear
          </button>
        )}
      </div>

      {mode === 'draw' ? (
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: PAD_H,
              background: '#fff',
              borderRadius: 10,
              touchAction: 'none',
              cursor: 'crosshair',
              display: 'block',
            }}
          />
          {empty && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                color: 'rgba(0,0,0,0.3)',
                fontSize: 14,
              }}
            >
              Sign here
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your full name"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {typed.trim() && (
            <div
              style={{
                marginTop: 10,
                background: '#fff',
                borderRadius: 10,
                padding: '18px 20px',
                fontFamily: '"Snell Roundhand", "Brush Script MT", "Segoe Script", cursive',
                fontStyle: 'italic',
                fontSize: 34,
                color: '#111',
              }}
            >
              {typed.trim()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
