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

function PromoBody({ headline, features, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headlineSpring = spring({
    frame: frame - 0,
    fps,
    config: { damping: 22, stiffness: 80 },
  })
  const headlineY = interpolate(headlineSpring, [0, 1], [40, 0])
  const headlineOpacity = interpolate(headlineSpring, [0, 1], [0, 1])

  const showcaseOpacity = interpolate(frame, [180, 220], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const fadeOut = interpolate(frame, [300, 330], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        padding: '160px 80px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: fadeOut,
      }}
    >
      <h1
        style={{
          transform: `translateY(${headlineY}px)`,
          opacity: headlineOpacity,
          fontSize: 76,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: 0,
          marginBottom: 80,
        }}
      >
        {headline}
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {(features || []).slice(0, 3).map((f, i) => {
          const start = 60 + i * 40
          const featureSpring = spring({
            frame: frame - start,
            fps,
            config: { damping: 22, stiffness: 90 },
          })
          const x = interpolate(featureSpring, [0, 1], [40, 0])
          const op = interpolate(featureSpring, [0, 1], [0, 1])
          return (
            <div
              key={i}
              style={{
                transform: `translateX(${x}px)`,
                opacity: op,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                fontSize: 48,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: primaryColor || '#ffffff',
                  boxShadow: `0 0 12px ${primaryColor || '#ffffff'}55`,
                }}
              />
              <span>{f}</span>
            </div>
          )
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: 80,
          right: 80,
          opacity: showcaseOpacity,
          textAlign: 'center',
          fontSize: 36,
          color: secondaryColor || 'rgba(255,255,255,0.7)',
        }}
      >
        Built for what matters
      </div>
    </AbsoluteFill>
  )
}

export const BrandPromo = ({
  logoUrl,
  brandName,
  primaryColor,
  secondaryColor,
  headline,
  features,
  ctaText,
}) => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={0} durationInFrames={60}>
        <BrandIntro
          logoUrl={logoUrl}
          brandName={brandName}
          primaryColor={primaryColor}
        />
      </Sequence>
      <Sequence from={60} durationInFrames={330}>
        <PromoBody
          headline={headline}
          features={features}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <BrandOutro
          logoUrl={logoUrl}
          brandName={brandName}
          primaryColor={primaryColor}
          ctaText={ctaText}
        />
      </Sequence>
    </AbsoluteFill>
  )
}
