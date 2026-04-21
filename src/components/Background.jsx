const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.28 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(%23n)'/>
  </svg>`,
)

const wrapperStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  overflow: 'hidden',
}

const baseGradientStyle = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(99,102,241,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(45,90,180,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 60% at 50% 50%, rgba(20,20,35,0.8) 0%, transparent 100%)',
  pointerEvents: 'none',
}

const noiseStyle = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `url("data:image/svg+xml;utf8,${NOISE_SVG}")`,
  backgroundRepeat: 'repeat',
  mixBlendMode: 'overlay',
  opacity: 0.4,
  pointerEvents: 'none',
}

const orb1Style = {
  position: 'absolute',
  top: '-15%',
  left: '-10%',
  width: 700,
  height: 700,
  borderRadius: '50%',
  background:
    'radial-gradient(circle, rgba(79,70,229,0.14) 0%, rgba(79,70,229,0.04) 40%, transparent 70%)',
  filter: 'blur(80px)',
  animation: 'orbFloat1 18s ease-in-out infinite',
  pointerEvents: 'none',
}

const orb2Style = {
  position: 'absolute',
  bottom: '-20%',
  right: '-15%',
  width: 800,
  height: 800,
  borderRadius: '50%',
  background:
    'radial-gradient(circle, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.04) 40%, transparent 70%)',
  filter: 'blur(90px)',
  animation: 'orbFloat2 22s ease-in-out infinite',
  pointerEvents: 'none',
}

const orb3Style = {
  position: 'absolute',
  top: '40%',
  left: '45%',
  width: 500,
  height: 500,
  borderRadius: '50%',
  background:
    'radial-gradient(circle, rgba(130,110,200,0.06) 0%, rgba(130,110,200,0.02) 45%, transparent 75%)',
  filter: 'blur(100px)',
  animation: 'orbFloat3 26s ease-in-out infinite',
  pointerEvents: 'none',
}

const streakStyle = {
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '60%',
  height: 1,
  background:
    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
  animation: 'streakPulse 8s ease-in-out infinite',
  pointerEvents: 'none',
}

const vignetteStyle = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)',
  pointerEvents: 'none',
}

export default function Background() {
  return (
    <div aria-hidden="true" style={wrapperStyle}>
      <div style={baseGradientStyle} />
      <div style={orb1Style} />
      <div style={orb2Style} />
      <div style={orb3Style} />
      <div style={streakStyle} />
      <div style={noiseStyle} />
      <div style={vignetteStyle} />
    </div>
  )
}
