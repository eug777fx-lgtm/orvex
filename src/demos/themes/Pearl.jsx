import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Star,
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
  Settings,
  Activity,
  Search,
  Bell,
} from 'lucide-react'
import ResponsiveBase from './responsiveBase'

const EASE = [0.16, 1, 0.3, 1]

const NICHE = {
  gym: {
    icon: Dumbbell,
    label: 'Fitness',
    eyebrow: 'PREMIUM FITNESS COACHING',
    tagline: 'Train Hard. Live Better.',
    sub: 'A modern training studio built around your goals — coaching, classes, and a community that shows up.',
    trust: ['Certified Coaches', 'Personalized Programs', 'Member Community'],
    stats: [
      { label: 'Active members', value: '420+' },
      { label: 'Weekly classes', value: '38' },
      { label: 'Avg rating', value: '4.9' },
    ],
    review: {
      quote:
        'Joining changed everything. The coaching is honest, the programming actually works, and the people make it the best hour of my day.',
      name: 'Marie van der Linden',
      role: 'Member · 2 years',
    },
    dashSections: ['Members', 'Classes', 'Programs', 'Trainers'],
  },
  plumber: {
    icon: Wrench,
    label: 'Plumbing',
    eyebrow: 'TRUSTED PLUMBING SERVICES',
    tagline: 'Fast. Reliable. Done Right.',
    sub: 'Licensed plumbers serving residential and commercial clients with same-day service and transparent pricing.',
    trust: ['24/7 Emergency', 'Fully Licensed', 'Free Estimates'],
    stats: [
      { label: 'Years in business', value: '18' },
      { label: 'Jobs completed', value: '5,200+' },
      { label: 'Avg response', value: '< 2h' },
    ],
    review: {
      quote:
        'Showed up within an hour, fixed a leak we had argued with another company about for weeks, and left the place spotless. The new gold standard.',
      name: 'David Eduardo',
      role: 'Homeowner · Oranjestad',
    },
    dashSections: ['Jobs', 'Schedule', 'Customers', 'Invoices'],
  },
  realestate: {
    icon: Home,
    label: 'Real Estate',
    eyebrow: 'LUXURY REAL ESTATE BROKERAGE',
    tagline: 'Find Your Perfect Property.',
    sub: 'Curated listings, experienced agents, and a process designed around your move — not ours.',
    trust: ['Top 1% Agents', 'Local Expertise', 'Concierge Service'],
    stats: [
      { label: 'Active listings', value: '124' },
      { label: 'Sold last year', value: '$48M' },
      { label: 'Avg days on market', value: '14' },
    ],
    review: {
      quote:
        'They sold our place above asking in nine days while we were still on vacation. Calm, organized, and never once dropped the ball.',
      name: 'Camila Reyes',
      role: 'Seller · Palm Beach',
    },
    dashSections: ['Listings', 'Buyers', 'Showings', 'Closings'],
  },
  medspa: {
    icon: Sparkles,
    label: 'Med Spa',
    eyebrow: 'AESTHETIC MEDICINE & WELLNESS',
    tagline: 'Reveal Your Best Self.',
    sub: 'Medical-grade aesthetic treatments delivered by board-certified providers in a calm, considered space.',
    trust: ['Board-Certified', 'Medical Grade', 'Private Suites'],
    stats: [
      { label: 'Treatments offered', value: '24' },
      { label: 'Clients served', value: '8,400+' },
      { label: 'Satisfaction', value: '99%' },
    ],
    review: {
      quote:
        'Subtle, expert work. They listened to what I actually wanted instead of selling me a package — I look like a rested version of myself.',
      name: 'Isabella Croes',
      role: 'Client · 3 years',
    },
    dashSections: ['Bookings', 'Clients', 'Providers', 'Treatments'],
  },
  hvac: {
    icon: Wind,
    label: 'HVAC',
    eyebrow: 'AIR CONDITIONING & HEATING EXPERTS',
    tagline: 'Keep Your Home Comfortable.',
    sub: 'Installation, maintenance, and emergency repair — handled by certified technicians who pick up the phone.',
    trust: ['Licensed & Bonded', 'Factory Certified', '10-Year Warranty'],
    stats: [
      { label: 'Systems installed', value: '3,800+' },
      { label: 'Service area', value: '50mi' },
      { label: 'Same-day jobs', value: '92%' },
    ],
    review: {
      quote:
        'Came out on a Sunday during a heatwave, diagnosed and fixed it in one trip, and didn’t try to upsell me on a new system. Old-school service.',
      name: 'Jonathan Martis',
      role: 'Homeowner · 4 years',
    },
    dashSections: ['Service Calls', 'Schedule', 'Customers', 'Equipment'],
  },
  roofing: {
    icon: Hammer,
    label: 'Roofing',
    eyebrow: 'PREMIUM ROOFING & EXTERIORS',
    tagline: 'Protect Your Home From the Top.',
    sub: 'Inspections, repairs, and full replacements — built to last and backed by an industry-leading warranty.',
    trust: ['25 Years Experience', 'Fully Licensed', 'Lifetime Warranty'],
    stats: [
      { label: 'Roofs installed', value: '2,100+' },
      { label: 'Years in business', value: '25' },
      { label: 'Warranty coverage', value: 'Lifetime' },
    ],
    review: {
      quote:
        'Thorough inspection, fair quote, and a crew that respected the property. Two years later — through hurricane season — not a single drop.',
      name: 'Robert Henriquez',
      role: 'Homeowner · 2 years',
    },
    dashSections: ['Projects', 'Estimates', 'Customers', 'Crews'],
  },
}

function getNiche(key) {
  return NICHE[(key || 'gym').toLowerCase()] || NICHE.gym
}

function PearlGlobalCss() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
      .pearl-root {
        background: #fafaf8;
        color: #0a0a0a;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        min-height: 100vh;
        font-feature-settings: 'ss01';
      }
      .pearl-serif { font-family: 'Playfair Display', Georgia, serif; }
      .pearl-headline { font-family: 'Playfair Display', Georgia, serif; font-weight: 600; letter-spacing: -0.02em; line-height: 1.05; }
      .pearl-link { color: #0a0a0a; text-decoration: none; transition: opacity 0.2s ease; }
      .pearl-link:hover { opacity: 0.6; }
      .pearl-card {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 20px;
        transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
      }
      .pearl-card:hover {
        border-color: rgba(0,0,0,0.16);
        transform: translateY(-2px);
        box-shadow: 0 16px 40px rgba(0,0,0,0.06);
      }
      .pearl-btn-primary {
        background: #0a0a0a;
        color: #ffffff;
        border-radius: 999px;
        padding: 14px 28px;
        font-size: 14px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s ease, background 0.2s ease;
      }
      .pearl-btn-primary:hover { background: #1a1a1a; transform: translateY(-1px); }
      .pearl-btn-ghost {
        background: transparent;
        color: #0a0a0a;
        border-radius: 999px;
        padding: 14px 28px;
        font-size: 14px;
        font-weight: 600;
        border: 1px solid rgba(0,0,0,0.15);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s ease, border-color 0.2s ease;
      }
      .pearl-btn-ghost:hover { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.3); }
      .pearl-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(10,10,10,0.55);
      }
      .pearl-section-num {
        position: absolute;
        font-family: 'Playfair Display', Georgia, serif;
        font-weight: 600;
        letter-spacing: -0.04em;
        color: rgba(10,10,10,0.05);
        line-height: 0.85;
        pointer-events: none;
        user-select: none;
      }

      @media (max-width: 767px) {
        .pearl-section-num { display: none !important; }
        .pearl-nav-links { display: none !important; }
        .pearl-nav-cta { padding: 10px 16px !important; font-size: 12px !important; min-height: 44px; }
        .pearl-hero {
          grid-template-columns: 1fr !important;
          gap: 32px !important;
          padding: 80px 20px 56px !important;
          text-align: center;
        }
        .pearl-hero h1 { font-size: clamp(32px, 9vw, 52px) !important; }
        .pearl-hero p { margin-left: auto !important; margin-right: auto !important; }
        .pearl-hero .pearl-trust { justify-content: center; }
        .pearl-hero-cta { flex-direction: column !important; width: 100%; }
        .pearl-hero-cta button { width: 100% !important; justify-content: center; }
        .pearl-hero-image { aspect-ratio: 16 / 11 !important; max-height: 300px; }
        .pearl-section { padding-left: 20px !important; padding-right: 20px !important; }
        .pearl-section-pad { padding-top: 64px !important; padding-bottom: 64px !important; }
        .pearl-pricing-grid { grid-template-columns: 1fr !important; }
        .pearl-services-grid { grid-template-columns: 1fr !important; }
        .pearl-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .pearl-contact-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        .pearl-card { padding: 22px !important; }
        .pearl-dash-sidebar { display: none !important; }
        .pearl-dash-main { padding: 80px 16px 100px !important; }
        .pearl-dash-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .pearl-dash-twocol { grid-template-columns: 1fr !important; }
        .pearl-dash-topbar { padding: 14px 16px !important; }
        .pearl-dash-topbar input { min-width: 0 !important; }
        .pearl-dash-search { min-width: 0 !important; flex: 1; }
      }
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
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

function PearlNav({ config }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(250,250,248,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="pearl-section"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          className="pearl-headline"
          style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', flex: '0 0 auto' }}
        >
          {config.business_name || 'Studio'}
        </div>
        <div className="pearl-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a className="pearl-link" href="#services" style={{ fontSize: 13, fontWeight: 500 }}>Services</a>
          <a className="pearl-link" href="#pricing" style={{ fontSize: 13, fontWeight: 500 }}>Pricing</a>
          <a className="pearl-link" href="#reviews" style={{ fontSize: 13, fontWeight: 500 }}>Reviews</a>
          <a className="pearl-link" href="#contact" style={{ fontSize: 13, fontWeight: 500 }}>Contact</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="pearl-btn-primary pearl-nav-cta"
            style={{ padding: '10px 20px', fontSize: 13 }}
          >
            Book Now
          </button>
          <button
            type="button"
            className="demo-mobile-only"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 10,
              width: 44,
              height: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0a0a0a',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {open ? '×' : '☰'}
          </button>
        </div>
      </div>
      {open && (
        <div
          className="demo-mobile-only"
          style={{
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            padding: '12px 24px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {[
            { href: '#services', label: 'Services' },
            { href: '#pricing', label: 'Pricing' },
            { href: '#reviews', label: 'Reviews' },
            { href: '#contact', label: 'Contact' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="pearl-link"
              style={{
                padding: '14px 4px',
                fontSize: 15,
                fontWeight: 500,
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function PearlHero({ config, niche }) {
  const Icon = niche.icon
  const headline = (config.tagline || '').trim() || niche.tagline
  return (
    <section
      className="pearl-hero pearl-section"
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '96px 28px 80px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
        gap: 80,
        alignItems: 'center',
      }}
    >
      <div>
        <FadeIn>
          <div className="pearl-eyebrow" style={{ marginBottom: 24 }}>
            {niche.eyebrow}
          </div>
        </FadeIn>
        <FadeIn delay={0.06}>
          <h1
            className="pearl-headline"
            style={{ fontSize: 'clamp(40px, 5.4vw, 72px)', margin: 0, marginBottom: 20 }}
          >
            {headline}
          </h1>
        </FadeIn>
        <FadeIn delay={0.12}>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: 'rgba(10,10,10,0.65)',
              maxWidth: 520,
              margin: 0,
              marginBottom: 36,
            }}
          >
            {niche.sub}
          </p>
        </FadeIn>
        <FadeIn delay={0.18}>
          <div className="pearl-hero-cta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="pearl-btn-primary">
              Get Started <ArrowRight size={14} />
            </button>
            <button type="button" className="pearl-btn-ghost">
              Learn More
            </button>
          </div>
        </FadeIn>
        <FadeIn delay={0.24}>
          <div
            className="pearl-trust"
            style={{
              marginTop: 44,
              display: 'flex',
              gap: 28,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {niche.trust.map((t) => (
              <div
                key={t}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(10,10,10,0.6)',
                }}
              >
                <Check size={14} strokeWidth={2.5} />
                {t}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.1} y={24}>
        <div
          className="pearl-hero-image"
          style={{
            position: 'relative',
            aspectRatio: '4 / 5',
            borderRadius: 24,
            overflow: 'hidden',
            background:
              'linear-gradient(140deg, #ebe8e0 0%, #d8d4ca 45%, #c2bdb0 100%)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.12)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(60% 50% at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 60%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 24,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#0a0a0a',
            }}
          >
            {niche.label}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 28,
              left: 28,
              right: 28,
              padding: 22,
              borderRadius: 18,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#0a0a0a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={20} strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{config.business_name || 'Studio'}</div>
              <div style={{ fontSize: 11, color: 'rgba(10,10,10,0.55)', marginTop: 2 }}>
                {config.location || 'Oranjestad, Aruba'}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  )
}

function PearlStats({ niche }) {
  return (
    <section className="pearl-section pearl-section-pad" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 80px' }}>
      <div
        className="pearl-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 24,
          padding: '40px 0',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        {niche.stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.06}>
            <div>
              <div
                className="pearl-headline"
                style={{ fontSize: 'clamp(32px, 3.6vw, 44px)', marginBottom: 4 }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(10,10,10,0.55)' }}>{s.label}</div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

function PearlServices({ config }) {
  const services = config.services || []
  if (!services.length) return null
  return (
    <section
      id="services"
      className="pearl-section pearl-section-pad"
      style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 100px', position: 'relative' }}
    >
      <span
        className="pearl-section-num"
        style={{ top: -10, right: 28, fontSize: 'clamp(120px, 14vw, 200px)' }}
      >
        01
      </span>
      <FadeIn>
        <div className="pearl-eyebrow" style={{ marginBottom: 12 }}>
          What We Offer
        </div>
        <h2
          className="pearl-headline"
          style={{ fontSize: 'clamp(34px, 4vw, 52px)', margin: 0, marginBottom: 56 }}
        >
          Services, refined.
        </h2>
      </FadeIn>
      <div
        className="pearl-services-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {services.slice(0, 8).map((s, i) => (
          <FadeIn key={`${s.name}-${i}`} delay={i * 0.05}>
            <div className="pearl-card" style={{ padding: 28, height: '100%' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'rgba(10,10,10,0.4)',
                  marginBottom: 14,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div
                className="pearl-headline"
                style={{ fontSize: 22, marginBottom: 10, fontWeight: 600 }}
              >
                {s.name}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'rgba(10,10,10,0.65)',
                  marginBottom: 22,
                }}
              >
                {s.price || 'Contact for pricing'}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0a0a0a',
                }}
              >
                Learn more <ArrowUpRight size={14} />
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}

function PearlPricing({ config }) {
  const services = config.services || []
  const tiers = [
    {
      name: 'Standard',
      price: services[0]?.price || 'Custom',
      desc: 'Everything you need to get started.',
      features: ['Initial consultation', 'Standard service window', 'Email support'],
      featured: false,
    },
    {
      name: 'Premium',
      price: services[1]?.price || 'Tailored',
      desc: 'For clients who expect more.',
      features: ['Priority scheduling', 'Dedicated point of contact', 'Phone & email support', 'Extended warranty'],
      featured: true,
    },
  ]
  return (
    <section
      id="pricing"
      className="pearl-section pearl-section-pad"
      style={{
        background: '#f3f1ec',
        padding: '100px 28px',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        <span
          className="pearl-section-num"
          style={{ top: -40, left: 0, fontSize: 'clamp(120px, 14vw, 200px)' }}
        >
          02
        </span>
        <FadeIn>
          <div className="pearl-eyebrow" style={{ marginBottom: 12 }}>
            Pricing
          </div>
          <h2
            className="pearl-headline"
            style={{ fontSize: 'clamp(34px, 4vw, 52px)', margin: 0, marginBottom: 56 }}
          >
            Two plans. No surprises.
          </h2>
        </FadeIn>
        <div
          className="pearl-pricing-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {tiers.map((t, i) => {
            const featured = t.featured
            return (
              <FadeIn key={t.name} delay={i * 0.06}>
                <div
                  style={{
                    padding: 36,
                    borderRadius: 24,
                    background: featured ? '#0a0a0a' : '#ffffff',
                    color: featured ? '#ffffff' : '#0a0a0a',
                    border: featured ? '1px solid #0a0a0a' : '1px solid rgba(0,0,0,0.08)',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      opacity: 0.55,
                      marginBottom: 16,
                    }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="pearl-headline"
                    style={{ fontSize: 'clamp(36px, 4vw, 48px)', marginBottom: 10, fontWeight: 600 }}
                  >
                    {t.price}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      opacity: 0.65,
                      marginBottom: 24,
                      minHeight: 40,
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
                    }}
                  >
                    {t.features.map((f) => (
                      <div
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 14,
                        }}
                      >
                        <Check size={14} strokeWidth={2.5} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: 999,
                      background: featured ? '#ffffff' : '#0a0a0a',
                      color: featured ? '#0a0a0a' : '#ffffff',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
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

function PearlReview({ niche }) {
  return (
    <section
      id="reviews"
      style={{ maxWidth: 1000, margin: '0 auto', padding: '120px 28px', textAlign: 'center', position: 'relative' }}
    >
      <span
        className="pearl-section-num"
        style={{ top: 60, left: '50%', transform: 'translateX(-50%)', fontSize: 'clamp(120px, 14vw, 200px)' }}
      >
        03
      </span>
      <FadeIn>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 28 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={18} fill="#0a0a0a" stroke="#0a0a0a" />
          ))}
        </div>
        <p
          className="pearl-headline"
          style={{
            fontSize: 'clamp(26px, 3vw, 38px)',
            lineHeight: 1.35,
            margin: 0,
            marginBottom: 32,
            fontWeight: 500,
          }}
        >
          “{niche.review.quote}”
        </p>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{niche.review.name}</div>
        <div style={{ fontSize: 13, color: 'rgba(10,10,10,0.55)', marginTop: 4 }}>
          {niche.review.role}
        </div>
      </FadeIn>
    </section>
  )
}

function PearlContact({ config }) {
  return (
    <section
      id="contact"
      className="pearl-section pearl-section-pad"
      style={{
        background: '#0a0a0a',
        color: '#ffffff',
        padding: '100px 28px',
      }}
    >
      <div
        className="pearl-contact-grid"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 56,
        }}
      >
        <FadeIn>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                opacity: 0.55,
                marginBottom: 16,
              }}
            >
              Get in touch
            </div>
            <h2
              className="pearl-headline"
              style={{ fontSize: 'clamp(32px, 4vw, 48px)', margin: 0, marginBottom: 28 }}
            >
              Ready when you are.
            </h2>
            <p style={{ fontSize: 15, opacity: 0.7, lineHeight: 1.6, maxWidth: 360 }}>
              Tell us a bit about your needs and we’ll get back to you within one business day.
            </p>
            <div
              style={{
                marginTop: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {config.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                  <Phone size={15} />
                  {config.phone}
                </div>
              )}
              {config.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                  <Mail size={15} />
                  {config.email}
                </div>
              )}
              {config.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                  <MapPin size={15} />
                  {config.location}
                </div>
              )}
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <form
            onSubmit={(e) => e.preventDefault()}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {[
              { label: 'Full name', placeholder: 'Your name' },
              { label: 'Email', placeholder: 'you@email.com' },
              { label: 'Phone', placeholder: '+297 555 0100' },
            ].map((f) => (
              <div key={f.label}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    opacity: 0.5,
                    marginBottom: 8,
                  }}
                >
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
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            ))}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  opacity: 0.5,
                  marginBottom: 8,
                }}
              >
                Message
              </div>
              <textarea
                rows={3}
                placeholder="How can we help?"
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: '#ffffff',
                  padding: '14px 0',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                  outline: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                marginTop: 12,
                background: '#ffffff',
                color: '#0a0a0a',
                padding: '16px 28px',
                borderRadius: 999,
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Send message <ArrowRight size={14} />
            </button>
          </form>
        </FadeIn>
      </div>
    </section>
  )
}

function PearlFooter({ config }) {
  return (
    <footer
      style={{
        background: '#0a0a0a',
        color: 'rgba(255,255,255,0.55)',
        padding: '32px 28px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center',
        fontSize: 12,
      }}
    >
      © {new Date().getFullYear()} {config.business_name || 'Studio'}. All rights reserved.
    </footer>
  )
}

export function PearlWebsite({ config }) {
  const niche = getNiche(config.template)
  return (
    <div className="pearl-root">
      <ResponsiveBase />
      <PearlGlobalCss />
      <PearlNav config={config} />
      <PearlHero config={config} niche={niche} />
      <PearlStats niche={niche} />
      <PearlServices config={config} />
      <PearlPricing config={config} />
      <PearlReview niche={niche} />
      <PearlContact config={config} />
      <PearlFooter config={config} />
    </div>
  )
}

/* ---------- Dashboard ---------- */

function PearlDashSidebar({ config, niche }) {
  const items = niche.dashSections
  return (
    <div
      className="pearl-dash-sidebar"
      style={{
        width: 240,
        flexShrink: 0,
        background: '#ffffff',
        borderRight: '1px solid rgba(0,0,0,0.08)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <div>
        <div
          className="pearl-headline"
          style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}
        >
          {config.business_name || 'Studio'}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(10,10,10,0.5)' }}>
          {niche.label} · Workspace
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(10,10,10,0.4)',
            marginBottom: 8,
          }}
        >
          Workspace
        </div>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 999,
            background: '#0a0a0a',
            color: '#ffffff',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LayoutDashboard size={14} />
          Overview
        </button>
        {items.map((label) => (
          <button
            key={label}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 999,
              background: 'transparent',
              color: 'rgba(10,10,10,0.7)',
              border: 'none',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Activity size={14} />
            {label}
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
            borderRadius: 999,
            background: 'transparent',
            color: 'rgba(10,10,10,0.55)',
            border: 'none',
            fontSize: 13,
            fontWeight: 500,
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

function PearlDashTopbar({ config }) {
  return (
    <div
      className="pearl-dash-topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '20px 28px',
        background: 'rgba(245,245,240,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div
        className="pearl-dash-search"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.08)',
          padding: '8px 14px',
          borderRadius: 999,
          minWidth: 320,
        }}
      >
        <Search size={14} color="rgba(10,10,10,0.45)" />
        <input
          placeholder="Search"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: '#0a0a0a',
            fontFamily: 'inherit',
            flex: 1,
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.08)',
            color: '#0a0a0a',
            width: 36,
            height: 36,
            borderRadius: 999,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={14} />
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: '#0a0a0a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
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

function PearlStat({ icon: Icon, label, value, change }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
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
            borderRadius: 10,
            background: 'rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(10,10,10,0.55)',
            fontWeight: 500,
          }}
        >
          {change}
        </div>
      </div>
      <div
        className="pearl-headline"
        style={{ fontSize: 30, fontWeight: 600, marginBottom: 4 }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)' }}>{label}</div>
    </div>
  )
}

function PearlChart() {
  const data = [42, 58, 51, 72, 64, 81, 76, 92, 84, 95, 88, 102]
  const max = Math.max(...data)
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <div className="pearl-headline" style={{ fontSize: 18, fontWeight: 600 }}>
            Revenue
          </div>
          <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', marginTop: 2 }}>
            Last 12 weeks
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(10,10,10,0.55)',
            background: 'rgba(0,0,0,0.04)',
            padding: '4px 10px',
            borderRadius: 999,
            fontWeight: 500,
          }}
        >
          + 18.4%
        </div>
      </div>
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: i === data.length - 1 ? '#0a0a0a' : 'rgba(10,10,10,0.18)',
              height: `${(v / max) * 100}%`,
              borderRadius: 6,
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function PearlActivity({ niche }) {
  const items = [
    { who: 'New booking', detail: niche.dashSections[0] || 'Activity', time: '2m ago' },
    { who: 'Payment received', detail: '$420 · invoice #2041', time: '14m ago' },
    { who: 'Updated profile', detail: 'Camila Reyes', time: '38m ago' },
    { who: 'Note added', detail: 'Site visit scheduled', time: '1h ago' },
    { who: 'New review', detail: '5 stars · M. Henriquez', time: '3h ago' },
  ]
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <div className="pearl-headline" style={{ fontSize: 18, fontWeight: 600 }}>
          Activity
        </div>
        <a
          href="#all"
          className="pearl-link"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          See all
        </a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((it, i) => (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Activity size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.who}</div>
              <div
                style={{
                  fontSize: 12,
                  color: 'rgba(10,10,10,0.55)',
                  marginTop: 2,
                }}
              >
                {it.detail}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)' }}>
              {it.time}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PearlTable({ niche }) {
  const rows = [
    { name: 'Marie van der Linden', detail: niche.dashSections[0] || '-', amount: '$320', status: 'Active' },
    { name: 'David Eduardo', detail: niche.dashSections[1] || '-', amount: '$1,140', status: 'Pending' },
    { name: 'Camila Reyes', detail: niche.dashSections[0] || '-', amount: '$520', status: 'Active' },
    { name: 'Jonathan Martis', detail: niche.dashSections[2] || '-', amount: '$890', status: 'Active' },
    { name: 'Isabella Croes', detail: niche.dashSections[1] || '-', amount: '$240', status: 'Closed' },
  ]
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: 24,
      }}
    >
      <div className="pearl-headline" style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>
        Recent {niche.dashSections[0] || 'Records'}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 16,
          padding: '8px 0',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(10,10,10,0.45)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div>Name</div>
        <div>{niche.dashSections[1] || 'Type'}</div>
        <div>Amount</div>
        <div>Status</div>
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
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 500 }}>{r.name}</div>
          <div style={{ color: 'rgba(10,10,10,0.65)' }}>{r.detail}</div>
          <div style={{ fontWeight: 600 }}>{r.amount}</div>
          <div>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                background:
                  r.status === 'Active'
                    ? 'rgba(0,0,0,0.06)'
                    : r.status === 'Pending'
                      ? 'rgba(0,0,0,0.04)'
                      : 'transparent',
                color: 'rgba(10,10,10,0.7)',
                border: r.status === 'Closed' ? '1px solid rgba(0,0,0,0.1)' : 'none',
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

export function PearlDashboard({ config }) {
  const niche = getNiche(config.template)
  return (
    <div
      style={{
        background: '#f5f5f0',
        minHeight: '100vh',
        color: '#0a0a0a',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        display: 'flex',
      }}
    >
      <ResponsiveBase />
      <PearlGlobalCss />
      <PearlDashSidebar config={config} niche={niche} />
      <div className="pearl-dash-main" style={{ flex: 1, minWidth: 0 }}>
        <PearlDashTopbar config={config} />
        <div style={{ padding: 28 }}>
          <div
            className="pearl-headline"
            style={{ fontSize: 32, fontWeight: 600, marginBottom: 4 }}
          >
            Welcome back{config.client_name ? `, ${config.client_name}` : ''}.
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(10,10,10,0.55)',
              marginBottom: 28,
            }}
          >
            Here’s what’s happening with your {niche.label.toLowerCase()} business today.
          </div>
          <div
            className="pearl-dash-stats"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <PearlStat icon={Users} label={`Total ${niche.dashSections[0] || 'records'}`} value="248" change="+12 this week" />
            <PearlStat icon={Calendar} label="This week" value="64" change="+8.2%" />
            <PearlStat icon={DollarSign} label="Revenue (MTD)" value="$24.8k" change="+18.4%" />
            <PearlStat icon={TrendingUp} label="Conversion" value="38%" change="+2.1%" />
          </div>
          <div
            className="pearl-dash-twocol"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <PearlChart />
            <PearlActivity niche={niche} />
          </div>
          <PearlTable niche={niche} />
        </div>
      </div>
    </div>
  )
}

export const PEARL_RENDERERS = {
  gym: { Website: PearlWebsite, Dashboard: PearlDashboard },
  plumber: { Website: PearlWebsite, Dashboard: PearlDashboard },
  realestate: { Website: PearlWebsite, Dashboard: PearlDashboard },
  medspa: { Website: PearlWebsite, Dashboard: PearlDashboard },
  hvac: { Website: PearlWebsite, Dashboard: PearlDashboard },
  roofing: { Website: PearlWebsite, Dashboard: PearlDashboard },
}

export default PEARL_RENDERERS
