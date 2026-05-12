import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export const BrandIntro = ({ logoUrl, brandName, primaryColor }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enter = spring({
    frame: frame - 0,
    fps,
    config: { damping: 18, stiffness: 80, mass: 1 },
  })
  const scale = interpolate(enter, [0, 1], [0.5, 1.0])
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const fadeOut = interpolate(frame, [40, 55], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const blackOverlay = interpolate(frame, [55, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const lineWidth = interpolate(frame, [20, 40], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const opacity = Math.min(fadeIn, fadeOut)

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            style={{
              maxWidth: 480,
              maxHeight: 320,
              objectFit: 'contain',
            }}
          />
        ) : (
          <div
            style={{
              color: '#ffffff',
              fontSize: 88,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            {brandName || 'Brand'}
          </div>
        )}
        <div
          style={{
            width: `${lineWidth * 4}px`,
            maxWidth: 480,
            height: 2,
            background: primaryColor || '#ffffff',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: blackOverlay,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
