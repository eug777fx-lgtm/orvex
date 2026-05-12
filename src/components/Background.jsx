const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.22 0'/>
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
  background: '#060608',
}

const baseGradientStyle = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,255,255,0.04) 0%, transparent 60%)',
  pointerEvents: 'none',
}

const noiseStyle = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `url("data:image/svg+xml;utf8,${NOISE_SVG}")`,
  backgroundRepeat: 'repeat',
  mixBlendMode: 'overlay',
  opacity: 0.35,
  pointerEvents: 'none',
}

export default function Background() {
  return (
    <div aria-hidden="true" style={wrapperStyle}>
      <div style={baseGradientStyle} />
      <div style={noiseStyle} />
    </div>
  )
}
