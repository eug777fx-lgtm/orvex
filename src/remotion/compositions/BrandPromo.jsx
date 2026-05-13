import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandWatermark } from '../components/BrandWatermark'

export const BrandPromo = ({
  headline,
  features,
  logoUrl,
  brandName,
  primaryColor,
  secondaryColor,
  ctaText,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headlineSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22, stiffness: 80 },
  })
  const headlineY = interpolate(headlineSpring, [0, 1], [40, 0])
  const headlineOpacity = interpolate(headlineSpring, [0, 1], [0, 1])

  const featureStarts = [40, 70, 100]
  const ctaSpring = spring({
    frame: frame - 140,
    fps,
    config: { damping: 22, stiffness: 90 },
  })
  const ctaY = interpolate(ctaSpring, [0, 1], [30, 0])
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1])

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        padding: '160px 80px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1
        style={{
          transform: `translateY(${headlineY}px)`,
          opacity: headlineOpacity,
          fontSize: 76,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: 0,
          marginBottom: 80,
        }}
      >
        {headline}
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {(features || []).slice(0, 3).map((f, i) => {
          const op = interpolate(frame, [featureStarts[i], featureStarts[i] + 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const x = interpolate(frame, [featureStarts[i], featureStarts[i] + 20], [40, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return (
            <div
              key={i}
              style={{
                transform: `translateX(${x}px)`,
                opacity: op,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                fontSize: 48,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: primaryColor || '#ffffff',
                  boxShadow: `0 0 12px ${primaryColor || '#ffffff'}55`,
                }}
              />
              <span>{f}</span>
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
          transform: `translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          fontSize: 52,
          fontWeight: 600,
          color: secondaryColor || '#ffffff',
          letterSpacing: '-0.01em',
        }}
      >
        {ctaText || 'Start free today'}
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
