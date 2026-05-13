import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { BrandWatermark } from '../components/BrandWatermark'

export const QuoteCard = ({ quote, author, logoUrl, brandName, primaryColor }) => {
  const frame = useCurrentFrame()

  const quoteOpacity = interpolate(frame, [10, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const quoteY = interpolate(frame, [10, 60], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const lineWidth = interpolate(frame, [70, 100], [0, 320], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const authorOpacity = interpolate(frame, [90, 110], [0, 1], {
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
        color: '#ffffff',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 860 }}>
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
            background: primaryColor || 'rgba(255,255,255,0.5)',
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
        primaryColor={primaryColor}
        position="bottom-right"
      />
    </AbsoluteFill>
  )
}
