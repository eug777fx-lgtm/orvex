import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BrandWatermark } from '../components/BrandWatermark'

const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.18 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(%23n)'/>
  </svg>`,
)

export const QuoteCard = ({ quote, author, brandColor, logoUrl, brandName, primaryColor }) => {
  const frame = useCurrentFrame()

  const quoteOpacity = interpolate(frame, [20, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const quoteY = interpolate(frame, [20, 60], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const lineWidth = interpolate(frame, [80, 120], [0, 320], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const authorOpacity = interpolate(frame, [110, 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 100px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: brandColor || '#ffffff',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          textAlign: 'center',
          maxWidth: 860,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            transform: `translateY(${quoteY}px)`,
            opacity: quoteOpacity,
            fontSize: 84,
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}
        >
          “{quote}”
        </div>
        <div
          style={{
            margin: '60px auto 0',
            width: lineWidth,
            height: 1,
            background: 'rgba(255,255,255,0.5)',
          }}
        />
        <div
          style={{
            marginTop: 32,
            opacity: authorOpacity,
            fontSize: 28,
            letterSpacing: '0.3em',
            color: 'rgba(255,255,255,0.65)',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {author}
        </div>
      </div>
      <BrandWatermark
        logoUrl={logoUrl}
        brandName={brandName || author}
        primaryColor={primaryColor || brandColor}
        position="bottom-right"
      />
    </AbsoluteFill>
  )
}
