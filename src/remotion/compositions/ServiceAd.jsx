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

function AdBody({ problem, solution, serviceName, price, primaryColor, secondaryColor }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const problemOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const solutionSpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 22, stiffness: 80 },
  })
  const solutionY = interpolate(solutionSpring, [0, 1], [30, 0])
  const solutionOpacity = interpolate(solutionSpring, [0, 1], [0, 1])

  const offerSpring = spring({
    frame: frame - 120,
    fps,
    config: { damping: 22, stiffness: 80 },
  })
  const offerScale = interpolate(offerSpring, [0, 1], [0.85, 1])
  const offerOpacity = interpolate(offerSpring, [0, 1], [0, 1])

  return (
    <AbsoluteFill
      style={{
        background: '#000',
        padding: 80,
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        gap: 60,
      }}
    >
      <div
        style={{
          opacity: problemOpacity,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          maxWidth: 880,
          lineHeight: 1.2,
        }}
      >
        {problem}
      </div>
      <div
        style={{
          transform: `translateY(${solutionY}px)`,
          opacity: solutionOpacity,
          fontSize: 48,
          color: primaryColor || '#ffffff',
          fontWeight: 600,
          maxWidth: 880,
          lineHeight: 1.3,
        }}
      >
        {solution}
      </div>
      <div
        style={{
          opacity: offerOpacity,
          transform: `scale(${offerScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 40,
            color: secondaryColor || 'rgba(255,255,255,0.85)',
            fontWeight: 500,
          }}
        >
          {serviceName}
        </div>
        <div
          style={{
            fontSize: 80,
            color: '#ffffff',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {price}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const ServiceAd = ({
  logoUrl,
  brandName,
  primaryColor,
  secondaryColor,
  problem,
  solution,
  serviceName,
  price,
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
      <Sequence from={60} durationInFrames={180}>
        <AdBody
          problem={problem}
          solution={solution}
          serviceName={serviceName}
          price={price}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      </Sequence>
      <Sequence from={240} durationInFrames={60}>
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
