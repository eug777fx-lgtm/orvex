import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BrandWatermark } from '../components/BrandWatermark'

export const HookOpener = ({ headline, subtext, logoUrl, brandName, primaryColor }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headlineProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  })
  const headlineY = interpolate(headlineProgress, [0, 1], [60, 0])
  const headlineOpacity = interpolate(headlineProgress, [0, 1], [0, 1])

  const subOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const watermarkOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const accentWidth = interpolate(frame, [30, 90], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 80px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 920 }}>
        <h1
          style={{
            transform: `translateY(${headlineY}px)`,
            opacity: headlineOpacity,
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            opacity: subOpacity,
            fontSize: 44,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 40,
            lineHeight: 1.3,
          }}
        >
          {subtext}
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          height: 2,
          width: `${accentWidth}%`,
          maxWidth: 480,
          background: primaryColor || '#ffffff',
          borderRadius: 999,
        }}
      />
      <div style={{ opacity: watermarkOpacity }}>
        <BrandWatermark
          logoUrl={logoUrl}
          brandName={brandName}
          primaryColor={primaryColor}
          position="bottom-right"
        />
      </div>
    </AbsoluteFill>
  )
}
