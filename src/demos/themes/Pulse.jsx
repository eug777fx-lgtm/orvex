import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  ChevronRight,
  Check,
  Phone,
  Mail,
  MapPin,
  Dumbbell,
  Wrench,
  Home,
  Sparkles,
  Wind,
  Hammer,
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Settings,
  Terminal,
  Zap,
  Search,
  Bell,
} from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1]
const NEON = '#00ff88'
const NEON_SOFT = 'rgba(0,255,136,0.1)'
const NEON_BORDER = 'rgba(0,255,136,0.2)'

const NICHE = {
  gym: {
    icon: Dumbbell,
    label: 'FITNESS_OS',
    tagline: 'Train Hard. Live Better.',
    sub: 'Performance-grade coaching, modern programming, real results.',
    trust: ['Certified Coaches', 'Custom Programs', 'Member Community'],
    stats: [
      { value: '420+', label: 'Members' },
      { value: '38', label: 'Classes/wk' },
      { value: '4.9', label: 'Rating' },
      { value: '12', label: 'Coaches' },
    ],
    dashSections: ['Members', 'Classes', 'Programs', 'Trainers'],
  },
  plumber: {
    icon: Wrench,
    label: 'PLUMB_SYS',
    tagline: 'Fast. Reliable. Done Right.',
    sub: 'Licensed plumbers, real-time dispatch, transparent pricing.',
    trust: ['24/7 Dispatch', 'Licensed', 'Free Estimates'],
    stats: [
      { value: '5,200+', label: 'Jobs' },
      { value: '< 2h', label: 'Response' },
      { value: '4.8', label: 'Rating' },
      { value: '18', label: 'Years' },
    ],
    dashSections: ['Jobs', 'Dispatch', 'Customers', 'Invoices'],
  },
  realestate: {
    icon: Home,
    label: 'REALTY_NET',
    tagline: 'Find Your Perfect Property.',
    sub: 'Curated listings, top-1% agents, modern process.',
    trust: ['Top 1% Agents', 'Local Expertise', 'Concierge'],
    stats: [
      { value: '124', label: 'Listings' },
      { value: '$48M', label: 'Sold' },
      { value: '14d', label: 'Avg DOM' },
      { value: '4.9', label: 'Rating' },
    ],
    dashSections: ['Listings', 'Buyers', 'Showings', 'Closings'],
  },
  medspa: {
    icon: Sparkles,
    label: 'AESTHETIC_AI',
    tagline: 'Reveal Your Best Self.',
    sub: 'Medical-grade aesthetic treatments, board-certified providers.',
    trust: ['Board Certified', 'Medical Grade', 'Private Suites'],
    stats: [
      { value: '8,400+', label: 'Clients' },
      { value: '24', label: 'Treatments' },
      { value: '99%', label: 'Satisfied' },
      { value: '5.0', label: 'Rating' },
    ],
    dashSections: ['Bookings', 'Clients', 'Providers', 'Treatments'],
  },
  hvac: {
    icon: Wind,
    label: 'HVAC_GRID',
    tagline: 'Keep Your Home Comfortable.',
    sub: 'Installation, repair, maintenance — handled in one trip.',
    trust: ['Licensed', 'Factory Certified', '10-Yr Warranty'],
    stats: [
      { value: '3,800+', label: 'Systems' },
      { value: '50mi', label: 'Radius' },
      { value: '92%', label: 'Same-Day' },
      { value: '4.9', label: 'Rating' },
    ],
    dashSections: ['Calls', 'Schedule', 'Customers', 'Equipment'],
  },
  roofing: {
    icon: Hammer,
    label: 'ROOF_CORE',
    tagline: 'Protect Your Home From the Top.',
    sub: 'Inspection, repair, and full replacements that hold up.',
    trust: ['25 Years', 'Licensed', 'Lifetime Warranty'],
    stats: [
      { value: '2,100+', label: 'Roofs' },
      { value: '25', label: 'Years' },
      { value: 'Life', label: 'Warranty' },
      { value: '4.9', label: 'Rating' },
    ],
    dashSections: ['Projects', 'Estimates', 'Customers', 'Crews'],
  },
}

function getNiche(key) {
  return NICHE[(key || 'gym').toLowerCase()] || NICHE.gym
}

function PulseGlobalCss() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
      .pulse-root {
        background: #060610;
        color: #ffffff;
        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
      }
      .pulse-mono {
        font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
      }
      .pulse-grid-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image:
          radial-gradient(rgba(0,255,136,0.08) 1px, transparent 1px);
        background-size: 24px 24px;
      }
      .pulse-scanlines {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image: repeating-linear-gradient(
          0deg,
          rgba(0,255,136,0.015) 0px,
          rgba(0,255,136,0.015) 1px,
          transparent 1px,
          transparent 3px
        );
        mix-blend-mode: screen;
      }
      .pulse-orb {
        position: fixed;
        z-index: 0;
        pointer-events: none;
        width: 700px;
        height: 700px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(0,255,136,0.08) 0%, rgba(0,255,136,0.02) 40%, transparent 70%);
        filter: blur(50px);
        top: -100px;
        left: -150px;
        animation: pulseFloat 14s ease-in-out infinite;
      }
      @keyframes pulseFloat {
        0%, 100% { transform: translate(0,0); }
        50% { transform: translate(40px, 30px); }
      }
      @keyframes pulseBlink {
        0%, 60% { opacity: 1; }
        61%, 100% { opacity: 0; }
      }
      .pulse-cursor {
        display: inline-block;
        width: 8px;
        height: 1.05em;
        background: ${NEON};
        margin-left: 4px;
        vertical-align: middle;
        animation: pulseBlink 1s steps(2) infinite;
      }
      .pulse-card {
        background: rgba(8,8,20,0.8);
        border: 1px solid ${NEON_BORDER};
        border-radius: 8px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
      }
      .pulse-card:hover {
        border-color: rgba(0,255,136,0.5);
        box-shadow: 0 0 24px rgba(0,255,136,0.18);
        transform: translateY(-2px);
      }
      .pulse-link {
        color: rgba(255,255,255,0.7);
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        font-family: 'JetBrains Mono', monospace;
        transition: color 0.2s ease;
      }
      .pulse-link:hover { color: ${NEON}; }
      .pulse-btn {
        background: ${NEON};
        color: #060610;
        padding: 12px 22px;
        border: none;
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      .pulse-btn:hover {
        box-shadow: 0 0 24px rgba(0,255,136,0.5);
        transform: translateY(-1px);
      }
      .pulse-btn-ghost {
        background: transparent;
        color: ${NEON};
        padding: 12px 22px;
        border: 1px solid ${NEON};
        border-radius: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s ease;
      }
      .pulse-btn-ghost:hover { background: ${NEON_SOFT}; }
      .pulse-section-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: ${NEON};
        font-weight: 600;
        letter-spacing: 0.05em;
      }
      .pulse-content { position: relative; z-index: 1; }
    `}</style>
  )
}

function FadeIn({ children, delay = 0, y = 16 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

function Typewriter({ text, prefix = '> ' }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    let i = 0
    setShown('')
    const id = setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 38)
    return () => clearInterval(id)
  }, [text])
  return (
    <span className="pulse-mono" style={{ fontSize: 13, color: NEON, letterSpacing: '0.02em' }}>
      {prefix}
      {shown}
      <span className="pulse-cursor" />
    </span>
  )
}

function PulseNav({ config }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(6,6,16,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,255,136,0.12)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Zap size={16} color={NEON} />
          <div className="pulse-mono" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.04em' }}>
            {(config.business_name || 'Studio').toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a className="pulse-link" href="#services">// services</a>
          <a className="pulse-link" href="#pricing">// pricing</a>
          <a className="pulse-link" href="#reviews">// reviews</a>
          <a className="pulse-link" href="#contact">// contact</a>
          <button type="button" className="pulse-btn">
            Connect_
          </button>
        </div>
      </div>
    </div>
  )
}

function PulseHero({ config, niche }) {
  const Icon = niche.icon
  const businessName = config.business_name || 'Studio'
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 28px 100px',
      }}
    >
      <FadeIn>
        <Typewriter text={`INITIALIZING ${businessName.toUpperCase()}...`} />
      </FadeIn>
      <FadeIn delay={0.18}>
        <h1
          style={{
            fontSize: 'clamp(46px, 7vw, 92px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
            margin: 0,
            marginTop: 24,
            marginBottom: 24,
          }}
        >
          {(config.tagline || '').trim() || niche.tagline}
        </h1>
      </FadeIn>
      <FadeIn delay={0.24}>
        <p
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
            maxWidth: 640,
            margin: 0,
            marginBottom: 36,
          }}
        >
          {niche.sub}
        </p>
      </FadeIn>
      <FadeIn delay={0.3}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="pulse-btn">
            Get_Started <ArrowRight size={14} />
          </button>
          <button type="button" className="pulse-btn-ghost">
            View_Specs
          </button>
        </div>
      </FadeIn>
      <FadeIn delay={0.4}>
        <div
          style={{
            marginTop: 64,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 0,
            border: `1px solid ${NEON_BORDER}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {niche.stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: 22,
                borderRight:
                  i < niche.stats.length - 1 ? `1px solid ${NEON_BORDER}` : 'none',
                background: i === 0 ? NEON_SOFT : 'transparent',
              }}
            >
              <div
                className="pulse-mono"
                style={{
                  fontSize: 11,
                  color: NEON,
                  marginBottom: 8,
                  letterSpacing: '0.05em',
                }}
              >
                {`> stat_${i + 1}`}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  marginBottom: 4,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}

function PulseTrust({ niche }) {
  return (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 28px 80px',
      }}
    >
      <div
        style={{
          padding: '24px 0',
          borderTop: `1px solid ${NEON_BORDER}`,
          borderBottom: `1px solid ${NEON_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        {niche.trust.map((t) => (
          <div
            key={t}
            className="pulse-mono"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.06em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: NEON }}>[ ✓ ]</span> {t}
          </div>
        ))}
      </div>
    </section>
  )
}

function PulseServices({ config }) {
  const services = config.services || []
  if (!services.length) return null
  return (
    <section
      id="services"
      style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 80px' }}
    >
      <FadeIn>
        <div className="pulse-section-label" style={{ marginBottom: 12 }}>
          // 01_SERVICES
        </div>
      </FadeIn>
      <FadeIn delay={0.06}>
        <h2
          style={{
            fontSize: 'clamp(34px, 4.4vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: 48,
          }}
        >
          What we deploy.
        </h2>
      </FadeIn>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {services.slice(0, 8).map((s, i) => (
          <FadeIn key={`${s.name}-${i}`} delay={i * 0.05}>
            <div
              className="pulse-card"
              style={{
                padding: 24,
                position: 'relative',
                paddingLeft: 28,
                borderLeft: `4px solid ${NEON}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                className="pulse-mono"
                style={{ fontSize: 11, color: NEON, letterSpacing: '0.05em' }}
              >
                {`#0${i + 1}`}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>
                {s.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.6)',
                  flex: 1,
                }}
              >
                {s.price ? `Pricing: ${s.price}` : 'Custom pricing on request'}
              </div>
              <div
                className="pulse-mono"
                style={{
                  fontSize: 11,
                  color: NEON,
                  letterSpacing: '0.05em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Learn more <ChevronRight size={12} />
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

function PulsePricing({ config }) {
  const services = config.services || []
  const tiers = [
    {
      name: 'STANDARD',
      price: services[0]?.price || 'Custom',
      desc: 'Core service. Reliable. Fast.',
      features: ['Initial consultation', 'Standard turnaround', 'Email support'],
      featured: false,
    },
    {
      name: 'PREMIUM',
      price: services[1]?.price || 'Tailored',
      desc: 'Everything + priority everything.',
      features: ['Priority queue', 'Dedicated contact', 'Phone + email', 'Extended warranty'],
      featured: true,
    },
    {
      name: 'CUSTOM',
      price: 'Talk to us',
      desc: 'Custom scope, custom solution.',
      features: ['Custom SLAs', 'Senior team', 'White-glove'],
      featured: false,
    },
  ]
  return (
    <section
      id="pricing"
      style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 100px' }}
    >
      <FadeIn>
        <div className="pulse-section-label" style={{ marginBottom: 12 }}>
          // 02_PRICING
        </div>
      </FadeIn>
      <FadeIn delay={0.06}>
        <h2
          style={{
            fontSize: 'clamp(34px, 4.4vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: 48,
          }}
        >
          Pick your tier.
        </h2>
      </FadeIn>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {tiers.map((t, i) => {
          const featured = t.featured
          return (
            <FadeIn key={t.name} delay={i * 0.06}>
              <div
                className="pulse-card"
                style={{
                  padding: 32,
                  background: featured ? 'rgba(0,255,136,0.06)' : 'rgba(8,8,20,0.8)',
                  borderColor: featured ? NEON : NEON_BORDER,
                  boxShadow: featured ? '0 0 32px rgba(0,255,136,0.15)' : 'none',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  className="pulse-mono"
                  style={{
                    fontSize: 11,
                    color: featured ? NEON : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.1em',
                    marginBottom: 16,
                  }}
                >
                  {featured ? '> RECOMMENDED' : `// TIER_${i + 1}`}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    marginBottom: 8,
                  }}
                >
                  {t.price}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: 24,
                    minHeight: 36,
                  }}
                >
                  {t.desc}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 28,
                    flex: 1,
                  }}
                >
                  {t.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13,
                      }}
                    >
                      <Check size={14} color={NEON} />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={featured ? 'pulse-btn' : 'pulse-btn-ghost'}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Choose_{t.name}
                </button>
              </div>
            </FadeIn>
          )
        })}
      </div>
    </section>
  )
}

function PulseReviews({ niche }) {
  const items = [
    {
      quote: 'Reliable, fast, and transparent. Saved me from three other companies.',
      name: 'M. van der Linden',
      role: `${niche.label.split('_')[0]} client`,
    },
    {
      quote: 'Modern process, real expertise. Felt like working with a team that gets it.',
      name: 'D. Eduardo',
      role: 'Long-time customer',
    },
    {
      quote: 'Result was even better than the pitch. Worth every dollar.',
      name: 'C. Reyes',
      role: 'Recurring client',
    },
  ]
  return (
    <section
      id="reviews"
      style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 100px' }}
    >
      <FadeIn>
        <div className="pulse-section-label" style={{ marginBottom: 12 }}>
          // 03_TESTIMONIALS
        </div>
      </FadeIn>
      <FadeIn delay={0.06}>
        <h2
          style={{
            fontSize: 'clamp(34px, 4.4vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: 0,
            marginBottom: 48,
          }}
        >
          Signal from clients.
        </h2>
      </FadeIn>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {items.map((r, i) => (
          <FadeIn key={r.name} delay={i * 0.05}>
            <div className="pulse-card" style={{ padding: 28, height: '100%' }}>
              <div
                style={{
                  fontSize: 56,
                  color: NEON,
                  lineHeight: 0.5,
                  marginBottom: 24,
                  fontFamily: 'Georgia, serif',
                }}
              >
                “
              </div>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.85)',
                  margin: 0,
                  marginBottom: 24,
                }}
              >
                {r.quote}
              </p>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
              <div
                className="pulse-mono"
                style={{
                  fontSize: 11,
                  color: NEON,
                  marginTop: 4,
                  letterSpacing: '0.05em',
                }}
              >
                // {r.role}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

function PulseContact({ config }) {
  return (
    <section
      id="contact"
      style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 100px' }}
    >
      <div
        className="pulse-card"
        style={{
          padding: 'clamp(36px, 6vw, 80px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 56,
          background: 'linear-gradient(135deg, rgba(8,8,20,0.95) 0%, rgba(0,255,136,0.04) 100%)',
        }}
      >
        <div>
          <div className="pulse-section-label" style={{ marginBottom: 12 }}>
            // 04_CONNECT
          </div>
          <h2
            style={{
              fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
              marginBottom: 16,
            }}
          >
            Let’s talk.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
              maxWidth: 360,
            }}
          >
            We’ll respond inside 24 hours. No bots, no chains of forms.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {config.phone && (
              <div className="pulse-mono" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Phone size={14} color={NEON} /> {config.phone}
              </div>
            )}
            {config.email && (
              <div className="pulse-mono" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mail size={14} color={NEON} /> {config.email}
              </div>
            )}
            {config.location && (
              <div className="pulse-mono" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
                <MapPin size={14} color={NEON} /> {config.location}
              </div>
            )}
          </div>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          {[
            { label: 'name', placeholder: 'Your name' },
            { label: 'email', placeholder: 'you@email.com' },
            { label: 'message', placeholder: 'How can we help?' },
          ].map((f) => (
            <div key={f.label}>
              <div
                className="pulse-mono"
                style={{
                  fontSize: 11,
                  color: NEON,
                  marginBottom: 8,
                  letterSpacing: '0.05em',
                }}
              >
                {`> ${f.label}`}
              </div>
              <input
                placeholder={f.placeholder}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#ffffff',
                  padding: '12px 14px',
                  border: `1px solid ${NEON_BORDER}`,
                  borderRadius: 4,
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ))}
          <button type="submit" className="pulse-btn" style={{ alignSelf: 'flex-start' }}>
            Send_Message <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </section>
  )
}

function PulseFooter({ config }) {
  return (
    <footer
      style={{
        borderTop: `1px solid ${NEON_BORDER}`,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div className="pulse-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
        © {new Date().getFullYear()} {config.business_name || 'Studio'} · all_rights_reserved
      </div>
      <div className="pulse-mono" style={{ fontSize: 12, color: NEON }}>
        {`> system_online`}
      </div>
    </footer>
  )
}

export function PulseWebsite({ config }) {
  const niche = getNiche(config.template)
  return (
    <div className="pulse-root">
      <PulseGlobalCss />
      <div className="pulse-grid-bg" />
      <div className="pulse-scanlines" />
      <div className="pulse-orb" />
      <div className="pulse-content">
        <PulseNav config={config} />
        <PulseHero config={config} niche={niche} />
        <PulseTrust niche={niche} />
        <PulseServices config={config} />
        <PulsePricing config={config} />
        <PulseReviews niche={niche} />
        <PulseContact config={config} />
        <PulseFooter config={config} />
      </div>
    </div>
  )
}

/* ---------- Dashboard ---------- */

function PulseDashSidebar({ config, niche }) {
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: 'rgba(4,4,14,0.95)',
        borderRight: `1px solid ${NEON_BORDER}`,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color={NEON} />
          <div className="pulse-mono" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}>
            {(config.business_name || 'Studio').toUpperCase()}
          </div>
        </div>
        <div
          className="pulse-mono"
          style={{ fontSize: 10, color: NEON, marginTop: 6, letterSpacing: '0.06em' }}
        >
          {`// ${niche.label}`}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          className="pulse-mono"
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em',
            marginBottom: 6,
            paddingLeft: 12,
          }}
        >
          {`> nav`}
        </div>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 6,
            background: NEON_SOFT,
            color: NEON,
            border: 'none',
            borderLeft: `2px solid ${NEON}`,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <LayoutDashboard size={14} />
          Overview
        </button>
        {niche.dashSections.map((s) => (
          <button
            key={s}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              border: 'none',
              borderLeft: '2px solid transparent',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <Activity size={14} />
            {s}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 6,
            background: 'transparent',
            color: 'rgba(255,255,255,0.55)',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  )
}

function PulseDashTopbar({ config }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
        background: 'rgba(6,6,16,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${NEON_BORDER}`,
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${NEON_BORDER}`,
          padding: '8px 14px',
          borderRadius: 6,
          minWidth: 320,
        }}
      >
        <Search size={14} color={NEON} />
        <input
          placeholder="search_records"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: '#ffffff',
            fontFamily: 'JetBrains Mono, monospace',
            flex: 1,
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${NEON_BORDER}`,
            color: NEON,
            width: 36,
            height: 36,
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={14} />
        </button>
        <div
          className="pulse-mono"
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: NEON,
            color: '#060610',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {(config.client_name || config.business_name || 'A')
            .trim()
            .slice(0, 1)
            .toUpperCase()}
        </div>
      </div>
    </div>
  )
}

function PulseStat({ icon: Icon, label, value, change }) {
  return (
    <div
      className="pulse-card"
      style={{
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: NEON_SOFT,
            color: NEON,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} />
        </div>
        <div
          className="pulse-mono"
          style={{ fontSize: 11, color: NEON, fontWeight: 600 }}
        >
          {change}
        </div>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#ffffff',
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div
        className="pulse-mono"
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.05em',
        }}
      >
        {`> ${label.toLowerCase()}`}
      </div>
    </div>
  )
}

function PulseChart() {
  const data = [42, 58, 51, 72, 64, 81, 76, 92, 84, 95, 88, 102]
  const max = Math.max(...data)
  return (
    <div className="pulse-card" style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <div
            className="pulse-mono"
            style={{ fontSize: 11, color: NEON, marginBottom: 6, letterSpacing: '0.05em' }}
          >
            // revenue_signal
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            $24,820
          </div>
        </div>
        <div
          className="pulse-mono"
          style={{
            fontSize: 11,
            color: NEON,
            background: NEON_SOFT,
            padding: '4px 10px',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          +18.4%
        </div>
      </div>
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
        }}
      >
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: i === data.length - 1 ? NEON : 'rgba(0,255,136,0.4)',
              height: `${(v / max) * 100}%`,
              borderRadius: 2,
              boxShadow: i === data.length - 1 ? '0 0 12px rgba(0,255,136,0.5)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function PulseLog({ niche }) {
  const items = [
    { who: 'New booking', detail: niche.dashSections[0] || '-', time: '2m' },
    { who: 'Payment received', detail: '$420 · #2041', time: '14m' },
    { who: 'Profile updated', detail: 'Camila Reyes', time: '38m' },
    { who: 'Note added', detail: 'Visit scheduled', time: '1h' },
    { who: 'New review', detail: '5 stars', time: '3h' },
  ]
  return (
    <div className="pulse-card" style={{ padding: 24 }}>
      <div
        className="pulse-mono"
        style={{ fontSize: 11, color: NEON, marginBottom: 16, letterSpacing: '0.05em' }}
      >
        // event_log
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, i) => (
          <div
            key={i}
            className="pulse-mono"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 0',
              borderBottom: i < items.length - 1 ? '1px solid rgba(0,255,136,0.08)' : 'none',
              fontSize: 12,
            }}
          >
            <span style={{ color: NEON }}>[{it.time}]</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{it.who}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', flex: 1, textAlign: 'right' }}>
              {it.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PulseTable({ niche }) {
  const rows = [
    { name: 'Marie van der Linden', detail: niche.dashSections[0] || '-', amount: '$320', status: 'ACTIVE' },
    { name: 'David Eduardo', detail: niche.dashSections[1] || '-', amount: '$1,140', status: 'PENDING' },
    { name: 'Camila Reyes', detail: niche.dashSections[0] || '-', amount: '$520', status: 'ACTIVE' },
    { name: 'Jonathan Martis', detail: niche.dashSections[2] || '-', amount: '$890', status: 'ACTIVE' },
    { name: 'Isabella Croes', detail: niche.dashSections[1] || '-', amount: '$240', status: 'CLOSED' },
  ]
  return (
    <div className="pulse-card" style={{ padding: 24 }}>
      <div
        className="pulse-mono"
        style={{ fontSize: 11, color: NEON, marginBottom: 16, letterSpacing: '0.05em' }}
      >
        // recent_records
      </div>
      <div
        className="pulse-mono"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 16,
          padding: '8px 0',
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.06em',
          borderBottom: '1px solid rgba(0,255,136,0.1)',
        }}
      >
        <div>NAME</div>
        <div>{(niche.dashSections[1] || 'TYPE').toUpperCase()}</div>
        <div>AMOUNT</div>
        <div>STATUS</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 16,
            padding: '14px 0',
            fontSize: 13,
            borderBottom: '1px solid rgba(0,255,136,0.06)',
            alignItems: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,255,136,0.04)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <div style={{ fontWeight: 600 }}>{r.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)' }} className="pulse-mono">
            {r.detail}
          </div>
          <div className="pulse-mono" style={{ fontWeight: 600, color: NEON }}>
            {r.amount}
          </div>
          <div>
            <span
              className="pulse-mono"
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                background:
                  r.status === 'ACTIVE'
                    ? NEON_SOFT
                    : r.status === 'PENDING'
                      ? 'rgba(255,255,255,0.05)'
                      : 'transparent',
                color:
                  r.status === 'ACTIVE'
                    ? NEON
                    : r.status === 'PENDING'
                      ? 'rgba(255,255,255,0.7)'
                      : 'rgba(255,255,255,0.4)',
                border:
                  r.status === 'CLOSED'
                    ? '1px solid rgba(255,255,255,0.15)'
                    : 'none',
              }}
            >
              {r.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PulseDashboard({ config }) {
  const niche = getNiche(config.template)
  return (
    <div
      className="pulse-root"
      style={{
        display: 'flex',
        minHeight: '100vh',
      }}
    >
      <PulseGlobalCss />
      <div className="pulse-grid-bg" style={{ opacity: 0.6 }} />
      <div className="pulse-content" style={{ display: 'flex', flex: 1, minHeight: '100vh', minWidth: 0 }}>
        <PulseDashSidebar config={config} niche={niche} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <PulseDashTopbar config={config} />
          <div style={{ padding: 28 }}>
            <div
              className="pulse-mono"
              style={{ fontSize: 12, color: NEON, marginBottom: 6 }}
            >
              {`> system_status: online`}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
              Welcome back{config.client_name ? `, ${config.client_name}` : ''}_
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 28 }}>
              {niche.dashSections.length} channels active · realtime feed
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <PulseStat icon={Users} label={`Total ${niche.dashSections[0] || ''}`} value="248" change="+12 wk" />
              <PulseStat icon={Calendar} label="This week" value="64" change="+8.2%" />
              <PulseStat icon={DollarSign} label="MTD revenue" value="$24.8k" change="+18.4%" />
              <PulseStat icon={TrendingUp} label="Conversion" value="38%" change="+2.1%" />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <PulseChart />
              <PulseLog niche={niche} />
            </div>
            <PulseTable niche={niche} />
          </div>
        </div>
      </div>
    </div>
  )
}

export const PULSE_RENDERERS = {
  gym: { Website: PulseWebsite, Dashboard: PulseDashboard },
  plumber: { Website: PulseWebsite, Dashboard: PulseDashboard },
  realestate: { Website: PulseWebsite, Dashboard: PulseDashboard },
  medspa: { Website: PulseWebsite, Dashboard: PulseDashboard },
  hvac: { Website: PulseWebsite, Dashboard: PulseDashboard },
  roofing: { Website: PulseWebsite, Dashboard: PulseDashboard },
}

export default PULSE_RENDERERS
