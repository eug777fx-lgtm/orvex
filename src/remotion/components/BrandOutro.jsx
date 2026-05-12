import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export const BrandOutro = ({ logoUrl, brandName, primaryColor, ctaText }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const overlay = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const logoOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const ctaSpring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 22, stiffness: 90, mass: 1 },
  })
  const ctaY = interpolate(ctaSpring, [0, 1], [30, 0])
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1])

  const pulseT = Math.max(0, frame - 50) / 10
  const pulse = pulseT < 1 ? 1 + 0.05 * Math.sin(pulseT * Math.PI) : 1

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 220,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          opacity: overlay,
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          opacity: logoOpacity,
          transform: `scale(${0.6 * pulse})`,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            style={{
              maxWidth: 320,
              maxHeight: 200,
              objectFit: 'contain',
              filter: `drop-shadow(0 0 20px ${primaryColor || '#fff'}33)`,
            }}
          />
        ) : (
          <div
            style={{
              color: '#ffffff',
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            {brandName || 'Brand'}
          </div>
        )}
      </div>
      <div
        style={{
          position: 'relative',
          marginTop: 30,
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          color: primaryColor || '#ffffff',
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        {ctaText || 'Learn more'}
      </div>
    </AbsoluteFill>
  )
}
