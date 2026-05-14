import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

function Particles({ frame }) {
  const dots = []
  for (let i = 0; i < 8; i++) {
    const seed = (i + 1) * 13
    const speed = 0.4 + ((seed * 7) % 70) / 100
    const xPct = (seed * 31) % 100
    const startY = ((seed * 17) % 110) - 5
    const size = 2 + ((seed * 5) % 3)
    const op = 0.1 + ((seed * 3) % 12) / 100
    const y = (startY - frame * speed * 0.35) % 110
    const yFinal = y < 0 ? y + 110 : y
    dots.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${xPct}%`,
          top: `${yFinal}%`,
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,1)',
          opacity: op,
          filter: 'blur(0.5px)',
        }}
      />,
    )
  }
  return <AbsoluteFill>{dots}</AbsoluteFill>
}

export const QuoteCard = ({
  quote = 'Silence reveals character.',
  author = 'BRAND',
  brandName = 'BRAND',
  primaryColor = '#c084fc',
  secondaryColor = '#ffffff',
  logoUrl = null,
  backgroundVideoUrl = null,
}) => {
  const frame = useCurrentFrame()
  useVideoConfig()

  const gradShift = interpolate(frame, [0, 120], [0, 100])

  const revealLocal = frame - 15
  const inset = interpolate(revealLocal, [0, 60], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const authorO = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const authorY = interpolate(frame, [80, 100], [10, 0], {
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

      <AbsoluteFill
        style={{
          background: `linear-gradient(${gradShift}deg, #0B0B0D 0%, #1a1420 50%, #0B0B0D 100%)`,
          opacity: backgroundVideoUrl ? 0.6 : 1,
        }}
      />

      <AbsoluteFill style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />

      <Particles frame={frame} />

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 220,
          left: 80,
          fontFamily: 'Georgia, serif',
          fontSize: 220,
          color: primaryColor,
          opacity: 0.2,
          lineHeight: 1,
          fontStyle: 'italic',
        }}
      >
        "
      </div>

      <AbsoluteFill
        style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
        }}
      >
        <div
          style={{
            clipPath: `inset(0 ${inset}% 0 0)`,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: 44,
            color: 'white',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: '85%',
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}
        >
          {quote}
        </div>

        <div
          style={{
            marginTop: 40,
            opacity: authorO,
            transform: `translateY(${authorY}px)`,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          — {author}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          right: 60,
          bottom: 40,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          color: 'rgba(255,255,255,0.35)',
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
