import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { BrandIntro } from '../components/BrandIntro'
import { BrandOutro } from '../components/BrandOutro'

function Bullet({ text, startFrame, frame, fps }) {
  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  })
  const x = interpolate(progress, [0, 1], [40, 0])
  const opacity = interpolate(progress, [0, 1], [0, 1])
  return (
    <div
      style={{
        transform: `translateX(${x}px)`,
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        fontSize: 44,
        fontWeight: 500,
        color: '#ffffff',
        lineHeight: 1.3,
        marginBottom: 28,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#ffffff',
          flexShrink: 0,
        }}
      />
      <span>{text}</span>
    </div>
  )
}

function InsightBody({ title, points, brandColor, ctaText }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 22, stiffness: 70, mass: 1 },
  })
  const titleX = interpolate(titleProgress, [0, 1], [-160, 0])
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1])

  const ctaOpacity = interpolate(frame, [180, 210], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        padding: '180px 80px',
        color: brandColor || '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1
        style={{
          transform: `translateX(${titleX}px)`,
          opacity: titleOpacity,
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: 0,
          marginBottom: 80,
        }}
      >
        {title}
      </h1>
      <div>
        {(points || []).slice(0, 3).map((p, i) => (
          <Bullet
            key={i}
            text={p}
            startFrame={60 + i * 40}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 220,
          left: 80,
          right: 80,
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          {ctaText || 'Start journaling your trades'}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const TradeInsight = ({
  title,
  points,
  brandColor,
  logoUrl,
  brandName,
  primaryColor,
  ctaText,
}) => {
  const intro = 60
  const body = 240
  const outro = 60
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={0} durationInFrames={intro}>
        <BrandIntro
          logoUrl={logoUrl}
          brandName={brandName}
          primaryColor={primaryColor || brandColor}
        />
      </Sequence>
      <Sequence from={intro} durationInFrames={body}>
        <InsightBody
          title={title}
          points={points}
          brandColor={brandColor}
          ctaText={ctaText}
        />
      </Sequence>
      <Sequence from={intro + body} durationInFrames={outro}>
        <BrandOutro
          logoUrl={logoUrl}
          brandName={brandName}
          primaryColor={primaryColor || brandColor}
          ctaText={ctaText || 'Start journaling your trades'}
        />
      </Sequence>
    </AbsoluteFill>
  )
}
