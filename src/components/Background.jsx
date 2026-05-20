const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 0.76  0 0 0 0 0.71  0 0 0 0 0.61  0 0 0 0.18 0'/>
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
  background: '#000000',
}

const warmGradientStyle = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(255, 255, 255,0.05) 0%, transparent 60%)',
  pointerEvents: 'none',
}

const noiseStyle = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `url("data:image/svg+xml;utf8,${NOISE_SVG}")`,
  backgroundRepeat: 'repeat',
  mixBlendMode: 'overlay',
  opacity: 0.32,
  pointerEvents: 'none',
}

export default function Background() {
  return (
    <div aria-hidden="true" style={wrapperStyle}>
      <div style={warmGradientStyle} />
      <div style={noiseStyle} />
    </div>
  )
}
