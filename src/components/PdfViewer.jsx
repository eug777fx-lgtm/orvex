// Embedded multi-page PDF viewer built on pdf.js — works on mobile Safari
// (which cannot render multi-page PDFs in iframes). Renders every page as a
// canvas sized to the container width, with pinch-zoom left to the browser.

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfViewer({ url, style }) {
  const containerRef = useRef(null)
  const [state, setState] = useState('loading') // loading | ready | error
  const [pageCount, setPageCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let pdf = null

    async function render() {
      const container = containerRef.current
      if (!container || !url) return
      container.innerHTML = ''
      setState('loading')
      try {
        pdf = await pdfjsLib.getDocument({ url }).promise
        if (cancelled) return
        setPageCount(pdf.numPages)
        const width = container.clientWidth || 600
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return
          const page = await pdf.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const scale = width / base.width
          const viewport = page.getViewport({ scale: scale * dpr })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.display = 'block'
          canvas.style.borderRadius = i === 1 ? '10px 10px 0 0' : '0'
          canvas.style.borderBottom = '1px solid rgba(0,0,0,0.08)'
          container.appendChild(canvas)

          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        }
        if (!cancelled) setState('ready')
      } catch (e) {
        console.error('pdf render failed:', e)
        if (!cancelled) setState('error')
      }
    }

    render()
    return () => {
      cancelled = true
      if (pdf) pdf.destroy().catch(() => {})
    }
  }, [url])

  return (
    <div style={{ position: 'relative', ...style }}>
      {state === 'loading' && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
          Loading document…
        </div>
      )}
      {state === 'error' && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
          The document couldn't be displayed.{' '}
          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>
            Open it directly
          </a>
          .
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          background: '#fff',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          display: state === 'ready' ? 'block' : 'none',
        }}
      />
      {state === 'ready' && pageCount > 1 && (
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          {pageCount} pages
        </div>
      )}
    </div>
  )
}
