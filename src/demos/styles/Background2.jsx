const NOISE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.18 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(%23n)'/>
  </svg>`,
)

export default function Background2({ businessName = '' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 50% at 80% 20%, rgba(220,100,30,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 90%, rgba(180,60,10,0.04) 0%, transparent 60%)',
        }}
      />

      {/* Watermark with business name */}
      <div
        style={{
          position: 'absolute',
          top: '24%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 'clamp(80px, 15vw, 180px)',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.025)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        }}
      >
        {(businessName || 'Premium').slice(0, 12)}
      </div>

      {/* Subtle horizontal lines */}
      {[18, 52, 78].map((top) => (
        <div
          key={top}
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: 0,
            right: 0,
            height: 1,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,140,50,0.04) 30%, rgba(255,140,50,0.04) 70%, transparent 100%)',
          }}
        />
      ))}

      {/* Orb 1 — top right */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          top: -100,
          right: -100,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(200,80,20,0.18) 0%, rgba(180,60,10,0.08) 40%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'warmFloat1 20s ease-in-out infinite',
        }}
      />
      {/* Orb 2 — bottom left */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          bottom: -80,
          left: -80,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(160,60,10,0.12) 0%, transparent 65%)',
          filter: 'blur(70px)',
          animation: 'warmFloat2 25s ease-in-out infinite',
        }}
      />
      {/* Orb 3 — center subtle */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          top: '20%',
          left: '10%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(220,100,30,0.04) 0%, transparent 60%)',
          filter: 'blur(90px)',
          animation: 'warmFloat3 30s ease-in-out infinite',
        }}
      />

      {/* Noise grain */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml;utf8,${NOISE_SVG}")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
