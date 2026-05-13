import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandWatermark } from '../components/BrandWatermark'

export const TradeInsight = ({ title, points, logoUrl, brandName, primaryColor, ctaText }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22, stiffness: 70, mass: 1 },
  })
  const titleX = interpolate(titleSpring, [0, 1], [-160, 0])
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1])

  const pointStarts = [40, 80, 120]
  const ctaOpacity = interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        padding: '180px 80px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1
        style={{
          transform: `translateX(${titleX}px)`,
          opacity: titleOpacity,
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: 0,
          marginBottom: 80,
        }}
      >
        {title}
      </h1>
      <div>
        {(points || []).slice(0, 3).map((p, i) => {
          const op = interpolate(frame, [pointStarts[i], pointStarts[i] + 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return (
            <div
              key={i}
              style={{
                opacity: op,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                fontSize: 44,
                fontWeight: 500,
                lineHeight: 1.3,
                marginBottom: 28,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: primaryColor || '#ffffff',
                  flexShrink: 0,
                }}
              />
              <span>{p}</span>
            </div>
          )
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 220,
          left: 80,
          right: 80,
          opacity: ctaOpacity,
          fontSize: 48,
          fontWeight: 600,
          color: primaryColor || '#ffffff',
          letterSpacing: '-0.01em',
        }}
      >
        {ctaText || 'Start journaling your trades'}
      </div>
      <BrandWatermark
        logoUrl={logoUrl}
        brandName={brandName}
        primaryColor={primaryColor}
        position="bottom-right"
      />
    </AbsoluteFill>
  )
}
