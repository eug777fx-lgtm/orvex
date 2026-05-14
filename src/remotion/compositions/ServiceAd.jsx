import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

function CountUp({ value, frame, startFrame, endFrame }) {
  const match = String(value || '').match(/(\D*)(\d+(?:\.\d+)?)(.*)/)
  if (!match) return <span>{value}</span>
  const [, prefix, num, suffix] = match
  const target = parseFloat(num)
  const t = interpolate(frame, [startFrame, endFrame], [0, target], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const display = Number.isInteger(target)
    ? Math.round(t).toString()
    : t.toFixed(2)
  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

export const ServiceAd = ({
  problem = 'Hidden leaks are costing you money',
  solution = 'Professional leak detection in Aruba',
  serviceName = 'Leak Inspection',
  price = 'Afl. 175',
  brandName = 'BRAND',
  primaryColor = '#4ade80',
  secondaryColor = '#ffffff',
  logoUrl = null,
  ctaText = 'Call us today',
  backgroundVideoUrl = null,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const redOpacity = interpolate(frame, [10, 30, 55, 70], [0, 0.08, 0.08, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const tintOpacity = interpolate(frame, [60, 100], [0, 0.1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const problemLocal = frame - 10
  const problemScale = spring({
    frame: problemLocal,
    fps,
    config: { mass: 0.6, damping: 14, stiffness: 220 },
    from: 1.1,
    to: 1,
  })
  const shakeSeq = [-3, 3, -2, 2, 0]
  const shakeIdx = Math.min(Math.max(problemLocal - 4, 0), shakeSeq.length - 1)
  const shake = problemLocal >= 4 && problemLocal < 14 ? shakeSeq[shakeIdx] : 0
  const problemO = interpolate(problemLocal, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const problemFadeOut = interpolate(frame, [50, 65], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const solutionLocal = frame - 60
  const solutionY = spring({
    frame: solutionLocal,
    fps,
    config: { mass: 0.7, damping: 18, stiffness: 200 },
    from: 30,
    to: 0,
  })
  const solutionO = interpolate(solutionLocal, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const solutionFadeOut = interpolate(frame, [105, 120], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const serviceLocal = frame - 110
  const serviceO = interpolate(serviceLocal, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const serviceY = spring({
    frame: serviceLocal,
    fps,
    config: { mass: 0.6, damping: 16, stiffness: 200 },
    from: 20,
    to: 0,
  })

  const ctaLocal = frame - 150
  const ctaY = spring({
    frame: ctaLocal,
    fps,
    config: { mass: 0.7, damping: 18, stiffness: 200 },
    from: 40,
    to: 0,
  })
  const ctaO = interpolate(ctaLocal, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const ctaPulse = 1 + 0.025 * Math.sin((ctaLocal * Math.PI) / 12)

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
          backgroundColor: 'rgba(255,0,0,1)',
          opacity: redOpacity,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: primaryColor,
          opacity: tintOpacity,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)',
        }}
      />

      {frame < 65 ? (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 60,
            opacity: problemO * problemFadeOut,
            transform: `translateX(${shake}px) scale(${problemScale})`,
          }}
        >
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 46,
              color: 'white',
              textAlign: 'center',
              maxWidth: '85%',
              letterSpacing: '-0.5px',
              textShadow: '0 2px 20px rgba(0,0,0,0.8)',
            }}
          >
            {problem}
          </div>
        </AbsoluteFill>
      ) : null}

      {frame >= 60 && frame < 120 ? (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 60,
            opacity: solutionO * solutionFadeOut,
            transform: `translateY(${solutionY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              fontSize: 42,
              color: 'white',
              textAlign: 'center',
              maxWidth: '85%',
              letterSpacing: '-0.5px',
              textShadow: `0 0 30px ${primaryColor}55, 0 2px 20px rgba(0,0,0,0.8)`,
            }}
          >
            {solution}
          </div>
        </AbsoluteFill>
      ) : null}

      {frame >= 110 ? (
        <AbsoluteFill
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 60,
            opacity: serviceO,
            transform: `translateY(${serviceY}px)`,
            gap: 18,
          }}
        >
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 56,
              color: 'white',
              letterSpacing: '-1px',
              textAlign: 'center',
            }}
          >
            {serviceName}
          </div>
          <div
            style={{
              width: 60,
              height: 2,
              backgroundColor: primaryColor,
              boxShadow: `0 0 12px ${primaryColor}`,
            }}
          />
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              fontSize: 64,
              color: primaryColor,
              letterSpacing: '-1px',
              textShadow: `0 0 30px ${primaryColor}55`,
            }}
          >
            <CountUp value={price} frame={frame} startFrame={115} endFrame={140} />
          </div>
        </AbsoluteFill>
      ) : null}

      {frame >= 150 ? (
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            bottom: 60,
            opacity: ctaO,
            transform: `translateY(${ctaY}px) scale(${ctaPulse})`,
            padding: '20px 28px',
            backgroundColor: primaryColor,
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            boxShadow: `0 0 40px ${primaryColor}88`,
          }}
        >
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 800,
              fontSize: 22,
              color: '#0B0B0D',
              letterSpacing: 0.5,
            }}
          >
            {ctaText}
          </div>
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 500,
              fontSize: 13,
              color: 'rgba(11,11,13,0.7)',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            {brandName}
          </div>
        </div>
      ) : null}

      {frame < 150 ? (
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
      ) : null}
    </AbsoluteFill>
  )
}
