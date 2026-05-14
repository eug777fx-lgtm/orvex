import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

function WordByWord({ text, frame, fps, startFrame }) {
  const words = String(text || '').split(' ')
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 14,
        maxWidth: '85%',
        textShadow: '0 2px 20px rgba(0,0,0,0.8)',
      }}
    >
      {words.map((w, i) => {
        const local = frame - startFrame - i * 8
        const y = spring({
          frame: local,
          fps,
          config: { mass: 0.6, damping: 16, stiffness: 200 },
          from: 30,
          to: 0,
        })
        const o = interpolate(local, [0, 14], [0, 1], {
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
              fontSize: 44,
              color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            {w}
          </span>
        )
      })}
    </div>
  )
}

function Feature({ text, primaryColor, frame, fps, startFrame }) {
  const local = frame - startFrame
  const iconScale = spring({
    frame: local,
    fps,
    config: { mass: 0.5, damping: 12, stiffness: 220 },
    from: 0,
    to: 1,
  })
  const tx = spring({
    frame: local - 6,
    fps,
    config: { mass: 0.6, damping: 18, stiffness: 200 },
    from: 40,
    to: 0,
  })
  const o = interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const fadeOut = interpolate(frame, [190, 220], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const checkLen = interpolate(local - 12, [0, 14], [0, 28], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        marginBottom: 26,
        opacity: o * fadeOut,
        width: '85%',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 999,
          backgroundColor: primaryColor,
          transform: `scale(${iconScale})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 30px ${primaryColor}55`,
          flexShrink: 0,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28">
          <path
            d="M5 14 L12 21 L24 7"
            stroke="#0B0B0D"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={28}
            strokeDashoffset={28 - checkLen}
          />
        </svg>
      </div>
      <div
        style={{
          transform: `translateX(${tx}px)`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          fontSize: 26,
          color: 'white',
        }}
      >
        {text}
      </div>
    </div>
  )
}

export const BrandPromo = ({
  headline = 'The smarter way to trade',
  features = ['Track every trade', 'Spot your patterns', 'Improve your edge'],
  brandName = 'BRAND',
  primaryColor = '#c084fc',
  secondaryColor = '#ffffff',
  logoUrl = null,
  ctaText = 'Start free today',
  backgroundVideoUrl = null,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const introScale = spring({
    frame,
    fps,
    config: { mass: 0.6, damping: 16, stiffness: 200 },
    from: 0.8,
    to: 1,
  })
  const introO = interpolate(frame, [0, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const introFade = interpolate(frame, [30, 50], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const headlineFadeOut = interpolate(frame, [180, 200], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const closingO = interpolate(frame, [195, 220], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const closingScale = spring({
    frame: frame - 195,
    fps,
    config: { mass: 0.6, damping: 18, stiffness: 180 },
    from: 0.95,
    to: 1.05,
  })

  const sweepX = interpolate(frame, [210, 240], [-100, 100], {
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
      <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: introO * introFade,
          transform: `scale(${introScale})`,
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {logoUrl ? (
          <Img
            src={logoUrl}
            style={{ width: 120, height: 120, objectFit: 'contain' }}
          />
        ) : null}
        <div
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 200,
            fontSize: 30,
            color: 'white',
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          {brandName}
        </div>
      </AbsoluteFill>

      {frame >= 35 && frame < 200 ? (
        <AbsoluteFill
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 60,
            opacity: headlineFadeOut,
          }}
        >
          <div style={{ marginBottom: 50 }}>
            <WordByWord
              text={headline}
              frame={frame}
              fps={fps}
              startFrame={35}
            />
          </div>
          <div style={{ width: '100%', alignItems: 'flex-start' }}>
            {(features || []).slice(0, 3).map((f, i) => (
              <Feature
                key={i}
                text={f}
                primaryColor={primaryColor}
                frame={frame}
                fps={fps}
                startFrame={70 + i * 40}
              />
            ))}
          </div>
        </AbsoluteFill>
      ) : null}

      {frame >= 195 ? (
        <AbsoluteFill
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: closingO,
            transform: `scale(${closingScale})`,
            gap: 18,
          }}
        >
          {logoUrl ? (
            <Img
              src={logoUrl}
              style={{ width: 100, height: 100, objectFit: 'contain' }}
            />
          ) : null}
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 56,
              color: 'white',
              letterSpacing: '-1px',
            }}
          >
            {brandName}
          </div>
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 400,
              fontSize: 20,
              color: primaryColor,
              letterSpacing: 1,
            }}
          >
            {ctaText}
          </div>
        </AbsoluteFill>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '100%',
            transform: `translateX(${sweepX}%)`,
            background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
          }}
        />
      </div>
    </AbsoluteFill>
  )
}
