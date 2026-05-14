import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

const FILM_GRAIN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='1'/></svg>`,
)}`

function Point({ index, text, primaryColor, frame, fps, startFrame }) {
  const local = frame - startFrame
  const y = spring({
    frame: local,
    fps,
    config: { mass: 0.6, damping: 16, stiffness: 200 },
    from: 30,
    to: 0,
  })
  const o = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const textLocal = local - 10
  const tx = spring({
    frame: textLocal,
    fps,
    config: { mass: 0.6, damping: 18, stiffness: 200 },
    from: -20,
    to: 0,
  })
  const lineWidth = interpolate(local - 15, [0, 15], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        opacity: o,
        transform: `translateY(${y}px)`,
        marginBottom: 36,
        width: '85%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: primaryColor,
            color: '#0B0B0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 800,
            fontSize: 22,
            boxShadow: `0 0 24px ${primaryColor}55`,
          }}
        >
          {index + 1}
        </div>
        <div
          style={{
            transform: `translateX(${tx}px)`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            fontSize: 28,
            color: 'white',
            flex: 1,
          }}
        >
          {text}
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          marginLeft: 66,
          width: `${lineWidth}%`,
          height: 1,
          backgroundColor: 'rgba(255,255,255,0.25)',
        }}
      />
    </div>
  )
}

export const TradeInsight = ({
  title = 'The habit that separates winning traders',
  points = ['Journal every trade', 'Review every week', 'Improve every month'],
  brandName = 'BRAND',
  primaryColor = '#c084fc',
  secondaryColor = '#ffffff',
  logoUrl = null,
  ctaText = 'Start journaling today',
  backgroundVideoUrl = null,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleX = spring({
    frame: frame - 10,
    fps,
    config: { mass: 0.7, damping: 18, stiffness: 180 },
    from: -100,
    to: 0,
  })
  const titleO = interpolate(frame, [10, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const ctaBase = frame - 155
  const ctaO = interpolate(ctaBase, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const pulse = 1 + 0.02 * Math.sin((ctaBase * Math.PI) / 10)
  const ctaScale = ctaBase > 0 ? pulse : 1

  const pointStarts = [50, 90, 130]

  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0B0D' }}>
      {backgroundVideoUrl ? (
        <Video
          src={backgroundVideoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
        />
      ) : null}
      <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${FILM_GRAIN_SVG})`,
          backgroundSize: '200px 200px',
          opacity: 0.03,
          mixBlendMode: 'overlay',
        }}
      />

      <AbsoluteFill
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 18,
            transform: `translateX(${titleX}px)`,
            opacity: titleO,
            marginBottom: 60,
            width: '85%',
          }}
        >
          <div style={{ width: 4, backgroundColor: primaryColor }} />
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 38,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ width: '100%', alignItems: 'flex-start' }}>
          {(points || []).slice(0, 3).map((p, i) => (
            <Point
              key={i}
              index={i}
              text={p}
              primaryColor={primaryColor}
              frame={frame}
              fps={fps}
              startFrame={pointStarts[i]}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 30,
            width: '85%',
            opacity: ctaO,
            transform: `scale(${ctaScale})`,
            padding: '16px 28px',
            border: `1.5px solid ${primaryColor}`,
            backgroundColor: `${primaryColor}26`,
            borderRadius: 12,
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 600,
            fontSize: 18,
            color: 'white',
            letterSpacing: 0.5,
            boxShadow: `0 0 30px ${primaryColor}33`,
          }}
        >
          {ctaText}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          right: 60,
          bottom: 40,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: 3,
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {logoUrl ? (
          <Img
            src={logoUrl}
            style={{ width: 18, height: 18, objectFit: 'contain' }}
          />
        ) : null}
        {brandName}
      </div>
    </AbsoluteFill>
  )
}
