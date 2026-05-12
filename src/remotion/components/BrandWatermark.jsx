import { interpolate, useCurrentFrame } from 'remotion'

const POS_STYLES = {
  'top-left': { top: 24, left: 24 },
  'top-right': { top: 24, right: 24 },
  'bottom-left': { bottom: 24, left: 24 },
  'bottom-right': { bottom: 24, right: 24 },
}

export const BrandWatermark = ({
  logoUrl,
  brandName,
  primaryColor,
  position = 'bottom-right',
}) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [30, 60], [0, 0.7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const pos = POS_STYLES[position] || POS_STYLES['bottom-right']

  return (
    <div
      style={{
        position: 'absolute',
        ...pos,
        width: 24,
        height: 24,
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: `drop-shadow(0 0 6px ${primaryColor || '#fff'}55)`,
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 4,
            background: primaryColor || '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {(brandName || '?').charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
