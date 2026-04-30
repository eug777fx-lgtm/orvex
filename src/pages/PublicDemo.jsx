import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Star,
  MapPin,
  Phone,
  Mail,
  Dumbbell,
  Calendar,
  Clock,
  TrendingUp,
  Users as UsersIcon,
  DollarSign,
  Settings,
  LayoutDashboard,
  CalendarRange,
  Activity,
  Heart,
} from 'lucide-react'
import db from '@/lib/db'

const EASE = [0.16, 1, 0.3, 1]

/* ---------- shared bits ---------- */

function GlobalDemoStyles({ accent }) {
  return (
    <style>{`
      .demo-root {
        background: #08080a;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        min-height: 100vh;
      }
      .demo-accent { color: ${accent}; }
      .demo-accent-bg { background: ${accent}; }
      .demo-glass {
        background: rgba(17,17,20,0.7);
        border: 0.5px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(14px) saturate(160%);
        -webkit-backdrop-filter: blur(14px) saturate(160%);
      }
      @keyframes demoOrb {
        0%, 100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(40px,-30px) scale(1.05); }
      }
    `}</style>
  )
}

function FadeIn({ children, delay = 0, y = 24 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/* ============== WEBSITE PREVIEW ============== */

function WebsiteNav({ businessName, accent }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 64,
        background: 'rgba(8,8,10,0.7)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Dumbbell size={18} color={accent} strokeWidth={2.2} />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
          {businessName}
        </span>
      </div>
      <button
        type="button"
        style={{
          background: '#ffffff',
          color: '#000000',
          borderRadius: 999,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Book Free Trial
      </button>
    </header>
  )
}

function WebsiteHero({ config, accent }) {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 70% 50% at 30% 20%, ${accent}22 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 70% 80%, rgba(255,255,255,0.04) 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}25 0%, transparent 70%)`,
          filter: 'blur(80px)',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'demoOrb 16s ease-in-out infinite',
        }}
      />
      <div style={{ position: 'relative', maxWidth: 880, zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.04em',
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
          NOW ACCEPTING NEW MEMBERS
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          style={{
            fontSize: 'clamp(40px, 8vw, 84px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            margin: 0,
          }}
        >
          {config.tagline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 'clamp(15px, 2vw, 18px)',
            marginTop: 24,
            maxWidth: 560,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          State-of-the-art equipment, expert coaches, and a community that pushes you to be your best. Welcome to {config.business_name}.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 36,
          }}
        >
          <button
            type="button"
            style={{
              background: '#ffffff',
              color: '#000',
              borderRadius: 999,
              padding: '14px 30px',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Start Free Trial
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 999,
              padding: '14px 30px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            View Classes
          </button>
        </motion.div>
      </div>
    </section>
  )
}

function StatsBar() {
  const stats = [
    { value: '500+', label: 'Members' },
    { value: '20+', label: 'Weekly Classes' },
    { value: '5★', label: 'Average Rating' },
  ]
  return (
    <FadeIn>
      <section style={{ padding: '20px 24px 60px' }}>
        <div
          className="demo-glass"
          style={{
            maxWidth: 880,
            margin: '0 auto',
            borderRadius: 16,
            padding: '28px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                textAlign: 'center',
                padding: '0 20px',
                borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 4,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  )
}

function ServicesSection({ services, accent }) {
  if (!services || services.length === 0) return null
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <FadeIn>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            Services
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            Train your way.
          </h2>
        </FadeIn>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginTop: 44,
          }}
        >
          {services.map((s, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div
                className="demo-glass"
                style={{
                  borderRadius: 16,
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `${accent}1a`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accent,
                  }}
                >
                  <Activity size={16} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {s.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6 }}>
                  Train at your pace with full equipment access and expert support.
                </div>
                {s.price && (
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      borderTop: '0.5px solid rgba(255,255,255,0.06)',
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {s.price}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ accent }) {
  const tiers = [
    {
      name: 'Starter',
      price: '$49',
      period: '/month',
      features: ['Open gym access', 'Locker room access', '2 group classes / month'],
    },
    {
      name: 'Pro',
      price: '$89',
      period: '/month',
      featured: true,
      features: [
        'Unlimited gym access',
        'Unlimited group classes',
        '1 personal training session',
        'Nutrition guidance',
      ],
    },
    {
      name: 'Elite',
      price: '$149',
      period: '/month',
      features: [
        'Everything in Pro',
        '4 personal training sessions',
        'Custom workout plan',
        'Priority booking',
      ],
    },
  ]
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <FadeIn>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            Pricing
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            Plans for every goal.
          </h2>
        </FadeIn>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 44,
          }}
        >
          {tiers.map((tier, i) => (
            <FadeIn key={tier.name} delay={i * 0.08}>
              <div
                className="demo-glass"
                style={{
                  borderRadius: 16,
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  height: '100%',
                  border: tier.featured
                    ? `1px solid ${accent}`
                    : '0.5px solid rgba(255,255,255,0.1)',
                  boxShadow: tier.featured ? `0 0 0 0.5px ${accent}55, 0 30px 60px ${accent}15` : 'none',
                  position: 'relative',
                }}
              >
                {tier.featured && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -10,
                      right: 20,
                      background: accent,
                      color: '#000',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 999,
                      letterSpacing: '0.05em',
                    }}
                  >
                    MOST POPULAR
                  </span>
                )}
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  {tier.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.02em' }}>
                    {tier.price}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    {tier.period}
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: 14,
                        color: 'rgba(255,255,255,0.75)',
                      }}
                    >
                      <Check size={14} color={accent} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 3 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  style={{
                    background: tier.featured ? '#ffffff' : 'transparent',
                    color: tier.featured ? '#000' : '#fff',
                    border: tier.featured ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 999,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Get Started
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const items = [
    {
      quote: "Lost 20 lbs in 4 months. The coaches actually care.",
      name: 'Maria S.',
      role: 'Member · 2 years',
    },
    {
      quote: "Best gym I've ever been to. The community is unreal.",
      name: 'Carlos R.',
      role: 'Member · 1 year',
    },
    {
      quote: "Classes are fun, equipment is top-notch. 10/10.",
      name: 'Jenna F.',
      role: 'Member · 6 months',
    },
  ]
  return (
    <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            Loved by our members.
          </h2>
        </FadeIn>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginTop: 36,
          }}
        >
          {items.map((t, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div
                className="demo-glass"
                style={{ borderRadius: 16, padding: '1.75rem', height: '100%' }}
              >
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      fill="currentColor"
                      strokeWidth={0}
                      style={{ display: 'inline-block', marginRight: 1 }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 15, color: '#fff', lineHeight: 1.6, marginTop: 14 }}>
                  "{t.quote}"
                </p>
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
                    {t.role}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactForm({ accent, config }) {
  const [submitted, setSubmitted] = useState(false)
  function onSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <FadeIn>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            Get Started
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            Book your free trial.
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              marginTop: 14,
              maxWidth: 520,
              marginLeft: 'auto',
              marginRight: 'auto',
              fontSize: 15,
            }}
          >
            One week, no commitment. Come check us out.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          {submitted ? (
            <div
              className="demo-glass"
              style={{
                borderRadius: 16,
                padding: '2.5rem',
                marginTop: 36,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: `${accent}22`,
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accent,
                }}
              >
                <Check size={24} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>You're in.</div>
              <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: 8, fontSize: 14 }}>
                We'll text you within an hour to set up your free trial.
              </p>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="demo-glass"
              style={{
                borderRadius: 16,
                padding: '2rem',
                marginTop: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <input
                placeholder="Full name"
                required
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  padding: '12px 16px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <input
                placeholder="Phone number"
                type="tel"
                required
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  padding: '12px 16px',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#fff',
                  color: '#000',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Claim My Free Week
              </button>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  )
}

function WebsiteFooter({ config }) {
  return (
    <footer
      style={{
        padding: '40px 24px 60px',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,8,10,0.4)',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
            {config.business_name}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 8 }}>
            Your community gym. Train hard, train smart, get results.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
          {config.location && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <MapPin size={13} color="rgba(255,255,255,0.45)" />
              {config.location}
            </div>
          )}
          {config.phone && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Phone size={13} color="rgba(255,255,255,0.45)" />
              {config.phone}
            </div>
          )}
          {config.email && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Mail size={13} color="rgba(255,255,255,0.45)" />
              {config.email}
            </div>
          )}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Clock size={13} />
            Mon–Sat 5am – 11pm
          </div>
          <div style={{ marginTop: 6 }}>Sun · 7am – 9pm</div>
        </div>
      </div>
    </footer>
  )
}

function WebsitePreview({ config, accent }) {
  return (
    <div className="demo-root">
      <WebsiteNav businessName={config.business_name} accent={accent} />
      <WebsiteHero config={config} accent={accent} />
      <StatsBar />
      <ServicesSection services={config.services} accent={accent} />
      <PricingSection accent={accent} />
      <TestimonialsSection />
      <ContactForm accent={accent} config={config} />
      <WebsiteFooter config={config} />
    </div>
  )
}

/* ============== DASHBOARD PREVIEW ============== */

function DashboardPreview({ config, accent }) {
  const sidebarItems = [
    { label: 'Dashboard', icon: LayoutDashboard, active: true },
    { label: 'Members', icon: UsersIcon },
    { label: 'Classes', icon: CalendarRange },
    { label: 'Bookings', icon: Calendar },
    { label: 'Revenue', icon: DollarSign },
    { label: 'Settings', icon: Settings },
  ]
  const stats = [
    { label: 'Members', value: '247', trend: '+12%', icon: UsersIcon },
    { label: 'Revenue', value: '$12,450', trend: '+8%', icon: DollarSign },
    { label: 'Classes', value: '18', trend: '+3', icon: CalendarRange },
    { label: 'Retention', value: '94%', trend: '+2%', icon: Heart },
  ]
  const members = [
    { name: 'Maria Santos', plan: 'Pro · 2yr', joined: '2 hours ago' },
    { name: 'Carlos Rivera', plan: 'Elite · 6mo', joined: 'Yesterday' },
    { name: 'Jenna Foster', plan: 'Starter', joined: '2 days ago' },
    { name: 'Marco Bautista', plan: 'Pro · 1yr', joined: '3 days ago' },
    { name: 'Ana Martinez', plan: 'Pro · 4mo', joined: '5 days ago' },
  ]
  const classes = [
    { name: 'HIIT Fundamentals', coach: 'Coach Lopez', time: 'Today 6:00 PM', booked: '14 / 20' },
    { name: 'Yoga Flow', coach: 'Coach Williams', time: 'Today 7:30 PM', booked: '12 / 15' },
    { name: 'Strength & Power', coach: 'Coach Diaz', time: 'Tomorrow 6:00 AM', booked: '9 / 15' },
    { name: 'Boxing 101', coach: 'Coach Kane', time: 'Tomorrow 7:00 PM', booked: '17 / 20' },
    { name: 'Open Gym Spin', coach: 'Coach Patel', time: 'Wed 6:00 AM', booked: '8 / 18' },
  ]
  const chartBars = [62, 78, 55, 90]
  const chartWeeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4']

  const cardStyle = {
    background: 'rgba(17,17,20,0.7)',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 18,
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
  }

  return (
    <div className="demo-root" style={{ position: 'relative', minHeight: '100vh' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(99,102,241,0.05) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 90%, rgba(45,90,180,0.04) 0%, transparent 55%)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          minHeight: '100vh',
        }}
      >
        <aside
          style={{
            background: 'rgba(8,8,10,0.6)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRight: '0.5px solid rgba(255,255,255,0.06)',
            padding: '20px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 24,
              padding: '0 8px',
            }}
          >
            <Dumbbell size={18} color={accent} strokeWidth={2.2} />
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
              {config.business_name}
            </span>
          </div>
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: item.active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: item.active ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: item.active ? 600 : 500,
                  marginBottom: 2,
                }}
              >
                <Icon size={14} strokeWidth={item.active ? 2.2 : 1.8} />
                {item.label}
              </div>
            )
          })}
        </aside>

        <main style={{ padding: '24px 28px 80px', overflowX: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Good morning, Marco
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.5)',
                  marginTop: 4,
                }}
              >
                Here's how {config.business_name} is doing today.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 22,
            }}
          >
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </div>
                    <Icon size={14} color="rgba(255,255,255,0.35)" />
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      marginTop: 12,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: accent,
                      marginTop: 6,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <TrendingUp size={11} />
                    {s.trend} this week
                  </div>
                </div>
              )
            })}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 18,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>Revenue</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Last 4 weeks</div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 18,
                  height: 180,
                  paddingTop: 8,
                }}
              >
                {chartBars.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${h}%`,
                        background: `linear-gradient(180deg, ${accent} 0%, ${accent}55 100%)`,
                        borderRadius: 6,
                      }}
                    />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                      {chartWeeks[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Recent Members
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map((m) => (
                  <div
                    key={m.name}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {m.name.split(' ').map((p) => p[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                        {m.plan} · {m.joined}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
              Upcoming Classes
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Class', 'Coach', 'Time', 'Booked'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          padding: '8px 10px',
                          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.name}>
                      <td
                        style={{
                          fontSize: 13,
                          padding: '12px 10px',
                          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      >
                        {c.name}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          padding: '12px 10px',
                          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        {c.coach}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          padding: '12px 10px',
                          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                          color: 'rgba(255,255,255,0.65)',
                        }}
                      >
                        {c.time}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          padding: '12px 10px',
                          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      >
                        {c.booked}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 56,
          right: 24,
          fontSize: 11,
          color: 'rgba(255,255,255,0.06)',
          letterSpacing: '0.3em',
          fontWeight: 800,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        DEMO PREVIEW
      </div>
    </div>
  )
}

/* ============== ROOT ============== */

export default function PublicDemo() {
  const { slug } = useParams()
  const [demo, setDemo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('website')
  const incrementedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!db || !slug) return
      try {
        const rows = await db.query('SELECT * FROM demos WHERE slug = $1 LIMIT 1', [slug])
        if (cancelled) return
        const row = rows?.[0]
        if (!row) {
          setError('Demo not found.')
          return
        }
        setDemo(row)
        if (!incrementedRef.current) {
          incrementedRef.current = true
          db.query(
            `UPDATE demos
             SET view_count = COALESCE(view_count, 0) + 1,
                 last_viewed_at = now(),
                 status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END
             WHERE id = $1`,
            [row.id],
          ).catch((err) => console.warn('view_count update failed', err))
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setError(err?.message || 'Failed to load demo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const config = useMemo(() => {
    if (!demo) return null
    let cfg = demo.config
    if (typeof cfg === 'string') {
      try {
        cfg = JSON.parse(cfg)
      } catch {
        cfg = {}
      }
    }
    return {
      business_name: cfg?.business_name || demo.business_name || 'Your Gym',
      tagline: cfg?.tagline || 'Train hard. Look great. Feel unstoppable.',
      primary_color: cfg?.primary_color || '#6378ff',
      phone: cfg?.phone || null,
      email: cfg?.email || null,
      location: cfg?.location || null,
      services: Array.isArray(cfg?.services) ? cfg.services : [],
    }
  }, [demo])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08080a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        Loading demo...
      </div>
    )
  }

  if (error || !demo) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#08080a',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Demo not found.</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: 14 }}>
            This link may have expired or been removed.
          </div>
        </div>
      </div>
    )
  }

  const accent = config.primary_color

  return (
    <>
      <GlobalDemoStyles accent={accent} />
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'rgba(8,8,10,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 999,
          padding: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {[
          { value: 'website', label: 'Website Preview' },
          { value: 'dashboard', label: 'Dashboard Preview' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: tab === t.value ? '#ffffff' : 'transparent',
              color: tab === t.value ? '#000000' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'website' ? (
        <WebsitePreview config={config} accent={accent} />
      ) : (
        <DashboardPreview config={config} accent={accent} />
      )}

      <div
        style={{
          padding: '14px 16px',
          background: 'rgba(8,8,10,0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        Built with <span style={{ color: '#ff6b8b' }}>♥</span> by{' '}
        <span style={{ color: '#ffffff', fontWeight: 600 }}>COS Studios</span> · Want this for your business?{' '}
        <a
          href="https://wa.me/2971234567"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Get yours →
        </a>
      </div>
    </>
  )
}
