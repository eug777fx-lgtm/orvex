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

function StaggeredHeadline({ text, frame, fps }) {
  const chars = Array.from(text || '')
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '85%',
        textShadow: '0 2px 20px rgba(0,0,0,0.8)',
      }}
    >
      {chars.map((ch, i) => {
        const localFrame = frame - 15 - i * 2
        const y = spring({
          frame: localFrame,
          fps,
          config: { mass: 0.6, damping: 15, stiffness: 200 },
          from: 60,
          to: 0,
        })
        const o = interpolate(localFrame, [0, 15], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${y}px)`,
              opacity: o,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 52,
              color: 'white',
              letterSpacing: '-1px',
              whiteSpace: 'pre',
            }}
          >
            {ch}
          </span>
        )
      })}
    </div>
  )
}

export const HookOpener = ({
  headline = 'Discipline is built quietly.',
  subtext = 'Most people quit too early.',
  brandName = 'BRAND',
  primaryColor = '#c084fc',
  secondaryColor = '#ffffff',
  logoUrl = null,
  backgroundVideoUrl = null,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const flashOpacity = interpolate(frame, [0, 10], [0.4, 0], {
    extrapolateRight: 'clamp',
  })

  const accentWidth = interpolate(frame, [40, 60], [0, 60], {
    easing: (t) => 1 - Math.pow(1 - t, 3),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const subY = spring({
    frame: frame - 50,
    fps,
    config: { mass: 0.7, damping: 18, stiffness: 180 },
    from: 20,
    to: 0,
  })
  const subO = interpolate(frame, [50, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const brandO = interpolate(frame, [80, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0B0D' }}>
      {backgroundVideoUrl ? (
        <Video
          src={backgroundVideoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
        />
      ) : null}

      <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
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
          backgroundColor: '#ffffff',
          opacity: flashOpacity,
          mixBlendMode: 'screen',
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
        <StaggeredHeadline text={headline} frame={frame} fps={fps} />

        <div
          style={{
            marginTop: 32,
            width: `${accentWidth}%`,
            height: 2,
            backgroundColor: primaryColor,
            boxShadow: `0 0 12px ${primaryColor}`,
          }}
        />

        <div
          style={{
            marginTop: 28,
            transform: `translateY(${subY}px)`,
            opacity: subO,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 300,
            fontSize: 22,
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            maxWidth: '70%',
          }}
        >
          {subtext}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          right: 60,
          bottom: 60,
          opacity: brandO,
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
