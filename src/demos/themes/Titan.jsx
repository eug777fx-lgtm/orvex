import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import ResponsiveBase from './responsiveBase'
import {
  ArrowRight,
  ArrowUpRight,
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
  ChevronRight,
} from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1]

const NICHE = {
  gym: {
    icon: Dumbbell,
    label: 'Fitness',
    tagline: 'Train Hard. Live Better.',
    sub: 'A modern training studio built around your goals.',
    bigNumbers: [
      { value: '10+', label: 'Years Coaching' },
      { value: '500+', label: 'Active Members' },
      { value: '98%', label: 'Stick With It' },
    ],
    dashSections: ['Members', 'Classes', 'Programs', 'Trainers'],
  },
  plumber: {
    icon: Wrench,
    label: 'Plumbing',
    tagline: 'Fast. Reliable. Done Right.',
    sub: 'Licensed plumbers. Same-day service. Transparent pricing.',
    bigNumbers: [
      { value: '18', label: 'Years Strong' },
      { value: '5,200+', label: 'Jobs Done' },
      { value: '< 2h', label: 'Response Time' },
    ],
    dashSections: ['Jobs', 'Schedule', 'Customers', 'Invoices'],
  },
  realestate: {
    icon: Home,
    label: 'Real Estate',
    tagline: 'Find Your Perfect Property.',
    sub: 'Curated listings. Experienced agents. A process built around you.',
    bigNumbers: [
      { value: '$48M', label: 'Sold Last Year' },
      { value: '124', label: 'Active Listings' },
      { value: '14d', label: 'Avg On Market' },
    ],
    dashSections: ['Listings', 'Buyers', 'Showings', 'Closings'],
  },
  medspa: {
    icon: Sparkles,
    label: 'Med Spa',
    tagline: 'Reveal Your Best Self.',
    sub: 'Medical-grade aesthetic treatments delivered with discretion.',
    bigNumbers: [
      { value: '24', label: 'Treatments' },
      { value: '8,400+', label: 'Clients' },
      { value: '99%', label: 'Satisfaction' },
    ],
    dashSections: ['Bookings', 'Clients', 'Providers', 'Treatments'],
  },
  hvac: {
    icon: Wind,
    label: 'HVAC',
    tagline: 'Keep Your Home Comfortable.',
    sub: 'Installation. Repair. Maintenance. Done in one trip.',
    bigNumbers: [
      { value: '3,800+', label: 'Systems Installed' },
      { value: '50mi', label: 'Service Radius' },
      { value: '92%', label: 'Same-Day Jobs' },
    ],
    dashSections: ['Service Calls', 'Schedule', 'Customers', 'Equipment'],
  },
  roofing: {
    icon: Hammer,
    label: 'Roofing',
    tagline: 'Protect Your Home From the Top.',
    sub: 'Inspections. Repairs. Full replacements. Built to last.',
    bigNumbers: [
      { value: '25', label: 'Years Of Roofs' },
      { value: '2,100+', label: 'Roofs Installed' },
      { value: 'Lifetime', label: 'Warranty' },
    ],
    dashSections: ['Projects', 'Estimates', 'Customers', 'Crews'],
  },
}

function getNiche(key) {
  return NICHE[(key || 'gym').toLowerCase()] || NICHE.gym
}

function TitanGlobalCss() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
      .titan-root {
        background: #080808;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        min-height: 100vh;
      }
      .titan-display {
        font-family: 'Anton', 'Impact', sans-serif;
        font-weight: 400;
        letter-spacing: -0.02em;
        line-height: 0.92;
        text-transform: uppercase;
      }
      .titan-link {
        color: rgba(255,255,255,0.7);
        text-decoration: none;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        transition: color 0.2s ease;
      }
      .titan-link:hover { color: #ffffff; }
      .titan-btn {
        background: #ffffff;
        color: #080808;
        padding: 14px 26px;
        border: none;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        transition: background 0.2s ease;
      }
      .titan-btn:hover { background: rgba(255,255,255,0.85); }
      .titan-btn-outline {
        background: transparent;
        color: #ffffff;
        padding: 14px 26px;
        border: 1px solid #ffffff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .titan-btn-outline:hover { background: #ffffff; color: #080808; }
      .titan-btn-outline.dark {
        color: #080808;
        border-color: #080808;
      }
      .titan-btn-outline.dark:hover { background: #080808; color: #ffffff; }
      .titan-divider { background: #ffffff; height: 1px; opacity: 0.3; }
      .titan-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.55);
      }
      .titan-eyebrow.dark { color: rgba(8,8,8,0.55); }

      @media (max-width: 767px) {
        .titan-nav { padding: 16px 18px !important; }
        .titan-nav-links { display: none !important; }
        .titan-hero { padding: 100px 18px 60px !important; min-height: auto !important; }
        .titan-hero h1 { font-size: clamp(48px, 14vw, 96px) !important; }
        .titan-hero .titan-cta-row { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
        .titan-hero .titan-cta-row > div { width: 100%; }
        .titan-hero .titan-cta-row button { width: 100% !important; justify-content: center; }
        .titan-section { padding: 64px 18px !important; }
        .titan-whyus-grid { grid-template-columns: 1fr !important; }
        .titan-whyus-grid > div { border-right: none !important; border-bottom: 1px solid rgba(8,8,8,0.12); padding-left: 0 !important; padding-right: 0 !important; }
        .titan-whyus-grid > div:last-child { border-bottom: none; }
        .titan-services-row { padding: 28px 18px !important; gap: 16px !important; flex-direction: column !important; align-items: flex-start !important; }
        .titan-services-row:hover { padding-left: 18px !important; }
        .titan-services-row .titan-service-meta { width: 100%; justify-content: space-between !important; }
        .titan-services-row .titan-service-name { font-size: clamp(28px, 9vw, 48px) !important; white-space: normal !important; }
        .titan-pricing-grid { grid-template-columns: 1fr !important; }
        .titan-pricing-grid > div { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.15); }
        .titan-pricing-grid > div:last-child { border-bottom: none; }
        .titan-contact-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        .titan-btn, .titan-btn-outline { width: 100%; justify-content: center; }
        .titan-dash-shell { flex-direction: column !important; }
        .titan-dash-sidebar { display: none !important; }
        .titan-dash-main { padding-top: 60px; }
        .titan-dash-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .titan-dash-twocol { grid-template-columns: 1fr !important; }
      }
    `}</style>
  )
}

function FadeIn({ children, delay = 0, y = 24 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

function TitanNav({ config }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <nav
        className="titan-nav"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          gap: 12,
        }}
      >
        <div className="titan-display" style={{ fontSize: 22, color: '#ffffff' }}>
          {(config.business_name || 'Studio').toUpperCase()}
        </div>
        <div className="titan-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a className="titan-link" href="#work">Work</a>
          <a className="titan-link" href="#services">Services</a>
          <a className="titan-link" href="#pricing">Pricing</a>
          <a className="titan-link" href="#contact">Contact</a>
          <button type="button" className="titan-btn">Get In Touch</button>
        </div>
        <button
          type="button"
          className="demo-mobile-only"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          style={{
            background: 'transparent',
            border: '1px solid #ffffff',
            color: '#ffffff',
            width: 44,
            height: 44,
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {open ? '×' : '☰'}
        </button>
      </nav>
      {open && (
        <div
          className="demo-mobile-only"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            background: '#080808',
            padding: '88px 24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              width: 44,
              height: 44,
              background: 'transparent',
              border: '1px solid #ffffff',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ×
          </button>
          {[
            { href: '#work', label: 'Work' },
            { href: '#services', label: 'Services' },
            { href: '#pricing', label: 'Pricing' },
            { href: '#contact', label: 'Contact' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="titan-display"
              style={{
                color: '#ffffff',
                fontSize: 32,
                padding: '14px 0',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </a>
          ))}
          <button
            type="button"
            className="titan-btn"
            style={{ marginTop: 24, justifyContent: 'center' }}
            onClick={() => setOpen(false)}
          >
            Get In Touch
          </button>
        </div>
      )}
    </>
  )
}

function TitanHero({ config, niche }) {
  const headline = (config.business_name || 'Studio')
  return (
    <section
      className="titan-hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        padding: '160px 32px 80px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0,
      }}
    >
      <FadeIn>
        <div className="titan-eyebrow" style={{ marginBottom: 24, paddingLeft: 4 }}>
          {niche.label} · {config.location || 'Aruba'}
        </div>
      </FadeIn>
      <FadeIn delay={0.06}>
        <h1
          className="titan-display"
          style={{
            fontSize: 'clamp(72px, 13vw, 220px)',
            margin: 0,
            color: '#ffffff',
            wordBreak: 'break-word',
          }}
        >
          {headline.toUpperCase()}
        </h1>
      </FadeIn>
      <FadeIn delay={0.14}>
        <div className="titan-divider" style={{ marginTop: 40, marginBottom: 28 }} />
      </FadeIn>
      <FadeIn delay={0.18}>
        <div
          className="titan-cta-row"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 40,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 540 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.85)',
                marginBottom: 14,
              }}
            >
              {(config.tagline || '').trim() || niche.tagline}
            </div>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.55,
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {niche.sub}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="titan-btn">
              Start a Project <ArrowRight size={14} />
            </button>
            <button type="button" className="titan-btn-outline">
              View Work
            </button>
          </div>
        </div>
      </FadeIn>
    </section>
  )
}

function TitanWhyUs({ niche }) {
  return (
    <section
      className="titan-section"
      style={{
        background: '#ffffff',
        color: '#080808',
        padding: '120px 32px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn>
          <div className="titan-eyebrow dark" style={{ marginBottom: 16 }}>
            Why Us
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <h2
            className="titan-display"
            style={{ fontSize: 'clamp(48px, 8vw, 120px)', margin: 0, marginBottom: 80 }}
          >
            We Don’t Cut Corners.
          </h2>
        </FadeIn>
        <div
          className="titan-whyus-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 0,
          }}
        >
          {niche.bigNumbers.map((n, i) => (
            <FadeIn key={n.label} delay={i * 0.08}>
              <div
                style={{
                  padding: '32px 0',
                  borderRight:
                    i < niche.bigNumbers.length - 1
                      ? '1px solid rgba(8,8,8,0.12)'
                      : 'none',
                  paddingLeft: i === 0 ? 0 : 32,
                  paddingRight: 32,
                  textAlign: i === 0 ? 'left' : 'left',
                }}
              >
                <div
                  className="titan-display"
                  style={{ fontSize: 'clamp(60px, 8vw, 120px)', marginBottom: 12 }}
                >
                  {n.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(8,8,8,0.55)',
                  }}
                >
                  {n.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function TitanServices({ config }) {
  const services = config.services || []
  if (!services.length) return null
  return (
    <section
      id="services"
      style={{
        background: '#080808',
        color: '#ffffff',
        padding: '120px 0 0',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px' }}>
        <FadeIn>
          <div className="titan-eyebrow" style={{ marginBottom: 16 }}>
            Services
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <h2
            className="titan-display"
            style={{
              fontSize: 'clamp(48px, 8vw, 120px)',
              margin: 0,
              marginBottom: 80,
            }}
          >
            What We Do.
          </h2>
        </FadeIn>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
        {services.slice(0, 8).map((s, i) => (
          <FadeIn key={`${s.name}-${i}`} delay={Math.min(i * 0.04, 0.2)}>
            <a
              href="#contact"
              className="titan-link titan-services-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '40px 32px',
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff',
                textDecoration: 'none',
                gap: 32,
                fontSize: 'clamp(28px, 5vw, 64px)',
                fontFamily: '"Anton", "Impact", sans-serif',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                transition: 'background 0.25s ease, padding-left 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.paddingLeft = '48px'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.paddingLeft = '32px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    letterSpacing: '0.18em',
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 700,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="titan-service-name"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name}
                </span>
              </div>
              <div
                className="titan-service-meta"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    letterSpacing: '0.12em',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {s.price || 'Custom'}
                </span>
                <ArrowUpRight size={20} />
              </div>
            </a>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

function TitanReview({ niche }) {
  return (
    <section
      style={{
        background: '#ffffff',
        color: '#080808',
        padding: '120px 32px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div
            className="titan-display"
            style={{
              fontSize: 200,
              lineHeight: 0.6,
              color: '#080808',
              marginBottom: -20,
            }}
          >
            “
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <p
            className="titan-display"
            style={{
              fontSize: 'clamp(32px, 4.4vw, 60px)',
              lineHeight: 1.05,
              margin: 0,
              marginBottom: 56,
              maxWidth: 1000,
            }}
          >
            They showed up, did the work, and didn’t make it complicated. Best decision we made all year.
          </p>
        </FadeIn>
        <FadeIn delay={0.12}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#080808',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              MV
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Marie van der Linden</div>
              <div
                className="titan-eyebrow dark"
                style={{ marginTop: 4 }}
              >
                {niche.label} · Client
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

function TitanPricing({ config }) {
  const services = config.services || []
  const tiers = [
    {
      name: 'Standard',
      price: services[0]?.price || 'Custom',
      desc: 'Get the job done. No fluff.',
      features: ['Initial consultation', 'Standard turnaround', 'Email support'],
      featured: false,
    },
    {
      name: 'Premium',
      price: services[1]?.price || 'Tailored',
      desc: 'Everything, plus priority everything.',
      features: ['Priority scheduling', 'Dedicated contact', 'Phone + email', 'Extended warranty'],
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Talk to us',
      desc: 'Custom scope, custom solution.',
      features: ['Custom SLAs', 'On-site senior team', 'White-glove handover'],
      featured: false,
    },
  ]
  return (
    <section
      id="pricing"
      style={{
        background: '#080808',
        color: '#ffffff',
        padding: '120px 32px',
      }}
    >
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <FadeIn>
          <div className="titan-eyebrow" style={{ marginBottom: 16 }}>
            Pricing
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <h2
            className="titan-display"
            style={{ fontSize: 'clamp(48px, 8vw, 120px)', margin: 0, marginBottom: 80 }}
          >
            Pick A Lane.
          </h2>
        </FadeIn>
        <div
          className="titan-pricing-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 0,
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {tiers.map((t, i) => {
            const featured = t.featured
            return (
              <FadeIn key={t.name} delay={i * 0.06}>
                <div
                  style={{
                    padding: 36,
                    background: featured ? '#ffffff' : 'transparent',
                    color: featured ? '#080808' : '#ffffff',
                    borderRight: i < tiers.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      opacity: 0.55,
                      marginBottom: 24,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="titan-display"
                    style={{ fontSize: 'clamp(48px, 5vw, 72px)', marginBottom: 16 }}
                  >
                    {t.price}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      opacity: 0.75,
                      marginBottom: 24,
                      minHeight: 44,
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
                          gap: 12,
                          fontSize: 14,
                        }}
                      >
                        <ChevronRight size={14} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={featured ? 'titan-btn-outline dark' : 'titan-btn'}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Choose {t.name}
                  </button>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function TitanContact({ config }) {
  return (
    <section
      id="contact"
      style={{
        background: '#080808',
        color: '#ffffff',
        padding: '120px 32px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div style={{ maxWidth: 1300, margin: '0 auto' }}>
        <FadeIn>
          <div className="titan-eyebrow" style={{ marginBottom: 16 }}>
            Contact
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <h2
            className="titan-display"
            style={{ fontSize: 'clamp(56px, 10vw, 160px)', margin: 0, marginBottom: 56 }}
          >
            Let’s Talk.
          </h2>
        </FadeIn>
        <div
          className="titan-contact-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 56,
          }}
        >
          <FadeIn>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {config.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 16 }}>
                  <Phone size={16} /> {config.phone}
                </div>
              )}
              {config.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 16 }}>
                  <Mail size={16} /> {config.email}
                </div>
              )}
              {config.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 16 }}>
                  <MapPin size={16} /> {config.location}
                </div>
              )}
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <form
              onSubmit={(e) => e.preventDefault()}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              {[
                { label: 'Name', placeholder: 'Your name' },
                { label: 'Email', placeholder: 'you@email.com' },
                { label: 'Tell us what you need', placeholder: 'Project description' },
              ].map((f) => (
                <div key={f.label}>
                  <div className="titan-eyebrow" style={{ marginBottom: 10 }}>
                    {f.label}
                  </div>
                  <input
                    placeholder={f.placeholder}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#ffffff',
                      padding: '14px 0',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.3)',
                      outline: 'none',
                      fontSize: 16,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              ))}
              <button type="submit" className="titan-btn" style={{ alignSelf: 'flex-start' }}>
                Send <ArrowRight size={14} />
              </button>
            </form>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

function TitanFooter({ config }) {
  return (
    <footer
      style={{
        background: '#080808',
        color: 'rgba(255,255,255,0.55)',
        padding: '36px 32px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        fontSize: 12,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      <div>
        © {new Date().getFullYear()} {(config.business_name || 'Studio').toUpperCase()}
      </div>
      <div>All Rights Reserved</div>
    </footer>
  )
}

export function TitanWebsite({ config }) {
  const niche = getNiche(config.template)
  return (
    <div className="titan-root">
      <ResponsiveBase />
      <TitanGlobalCss />
      <TitanNav config={config} />
      <TitanHero config={config} niche={niche} />
      <TitanWhyUs niche={niche} />
      <TitanServices config={config} />
      <TitanReview niche={niche} />
      <TitanPricing config={config} />
      <TitanContact config={config} />
      <TitanFooter config={config} />
    </div>
  )
}

/* ---------- Dashboard ---------- */

function TitanDashSidebar({ config, niche }) {
  return (
    <div
      className="titan-dash-sidebar"
      style={{
        width: 240,
        flexShrink: 0,
        background: '#0f0f0f',
        borderRight: '1px solid rgba(255,255,255,0.12)',
        padding: '28px 0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '0 24px 28px' }}>
        <div className="titan-display" style={{ fontSize: 22, color: '#ffffff' }}>
          {(config.business_name || 'Studio').toUpperCase()}
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            marginTop: 6,
          }}
        >
          {niche.label} OS
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 24px',
            background: 'transparent',
            color: '#ffffff',
            border: 'none',
            borderLeft: '4px solid #ffffff',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            textAlign: 'left',
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
              gap: 12,
              padding: '14px 24px',
              background: 'transparent',
              color: 'rgba(255,255,255,0.6)',
              border: 'none',
              borderLeft: '4px solid transparent',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Activity size={14} />
            {s}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 'auto', padding: '0 24px' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            background: 'transparent',
            color: 'rgba(255,255,255,0.55)',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  )
}

function TitanStat({ icon: Icon, label, value, change }) {
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Icon size={16} />
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {change}
        </div>
      </div>
      <div className="titan-display" style={{ fontSize: 44, marginBottom: 8 }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function TitanChart() {
  const data = [42, 58, 51, 72, 64, 81, 76, 92, 84, 95, 88, 102]
  const max = Math.max(...data)
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              marginBottom: 8,
            }}
          >
            Revenue
          </div>
          <div className="titan-display" style={{ fontSize: 36 }}>
            $24,820
          </div>
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.4)',
            padding: '4px 10px',
          }}
        >
          + 18.4%
        </div>
      </div>
      <div
        style={{
          height: 160,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
        }}
      >
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: i === data.length - 1 ? '#ffffff' : 'rgba(255,255,255,0.4)',
              height: `${(v / max) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TitanList({ niche }) {
  const items = [
    { who: 'Marie van der Linden', detail: niche.dashSections[0] || '-', amount: '$320' },
    { who: 'David Eduardo', detail: niche.dashSections[1] || '-', amount: '$1,140' },
    { who: 'Camila Reyes', detail: niche.dashSections[0] || '-', amount: '$520' },
    { who: 'Jonathan Martis', detail: niche.dashSections[2] || '-', amount: '$890' },
    { who: 'Isabella Croes', detail: niche.dashSections[1] || '-', amount: '$240' },
  ]
  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: 28,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 24,
        }}
      >
        Recent {niche.dashSections[0] || 'Records'}
      </div>
      {items.map((it) => (
        <div
          key={it.who}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: 16,
            padding: '18px 0',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>{it.who}</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {it.detail}
          </div>
          <div className="titan-display" style={{ fontSize: 22 }}>
            {it.amount}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TitanDashboard({ config }) {
  const niche = getNiche(config.template)
  return (
    <div
      className="titan-dash-shell"
      style={{
        background: '#080808',
        minHeight: '100vh',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        display: 'flex',
      }}
    >
      <ResponsiveBase />
      <TitanGlobalCss />
      <TitanDashSidebar config={config} niche={niche} />
      <div className="titan-dash-main" style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="titan-display" style={{ fontSize: 32 }}>
            Overview
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className="titan-btn-outline">
              Export
            </button>
            <button type="button" className="titan-btn">
              New {niche.dashSections[0]?.slice(0, -1) || 'Item'}
            </button>
          </div>
        </div>
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="titan-dash-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 0,
              border: '1px solid rgba(255,255,255,0.15)',
              borderRight: 'none',
              borderBottom: 'none',
            }}
          >
            <TitanStat icon={Users} label={`Total ${niche.dashSections[0] || ''}`} value="248" change="+12 wk" />
            <TitanStat icon={Calendar} label="This Week" value="64" change="+8.2%" />
            <TitanStat icon={DollarSign} label="MTD Revenue" value="$24.8K" change="+18.4%" />
            <TitanStat icon={TrendingUp} label="Conversion" value="38%" change="+2.1%" />
          </div>
          <div
            className="titan-dash-twocol"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: 16,
            }}
          >
            <TitanChart />
            <TitanList niche={niche} />
          </div>
        </div>
      </div>
    </div>
  )
}

export const TITAN_RENDERERS = {
  gym: { Website: TitanWebsite, Dashboard: TitanDashboard },
  plumber: { Website: TitanWebsite, Dashboard: TitanDashboard },
  realestate: { Website: TitanWebsite, Dashboard: TitanDashboard },
  medspa: { Website: TitanWebsite, Dashboard: TitanDashboard },
  hvac: { Website: TitanWebsite, Dashboard: TitanDashboard },
  roofing: { Website: TitanWebsite, Dashboard: TitanDashboard },
}

export default TITAN_RENDERERS
