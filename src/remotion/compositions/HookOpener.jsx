import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

export const HookOpener = ({ headline, subtext, brandColor }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headlineProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  })
  const headlineY = interpolate(headlineProgress, [0, 1], [80, 0])
  const headlineOpacity = interpolate(headlineProgress, [0, 1], [0, 1])

  const subOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const logoOpacity = interpolate(frame, [80, 110], [0, 1], {
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
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: brandColor || '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: 920,
        }}
      >
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
          bottom: 120,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: logoOpacity,
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 28,
          letterSpacing: '0.3em',
          fontWeight: 600,
        }}
      >
        LIMITLESS
      </div>
    </AbsoluteFill>
  )
}
