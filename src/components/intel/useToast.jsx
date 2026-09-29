import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((text, kind = 'info') => {
    clearTimeout(timer.current)
    setToast({ text, kind, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3800)
  }, [])
  const node = createPortal(
    <AnimatePresence>
      {toast && (
        <Motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            x: '-50%',
            zIndex: 400,
            background: toast.kind === 'error' ? '#1A0000' : '#ffffff',
            color: toast.kind === 'error' ? '#FF6B6B' : '#000',
            border: toast.kind === 'error' ? '1px solid rgba(255,68,68,0.4)' : '1px solid #fff',
            borderRadius: 999,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 500,
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          {toast.text}
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
  return [show, node]
}

