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
  Wrench,
  Home,
  Sparkles,
  Wind,
  Hammer,
  Briefcase,
  FileText,
  Receipt,
  Search,
  Bed,
  Bath,
  Square,
  Award,
  ShieldCheck,
  Snowflake,
  Flame,
  Building2,
  ClipboardList,
} from 'lucide-react'
import db from '@/lib/db'
import { EMBER_RENDERERS } from '../demos/themes/Ember'
import { PEARL_RENDERERS } from '../demos/themes/Pearl'
import { TITAN_RENDERERS } from '../demos/themes/Titan'
import { PULSE_RENDERERS } from '../demos/themes/Pulse'

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

/* ============== Shared template helpers ============== */

function GenericNav({ Icon, businessName, accent, ctaText }) {
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
        <Icon size={18} color={accent} strokeWidth={2.2} />
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
        {ctaText}
      </button>
    </header>
  )
}

function GenericFooter({ config }) {
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
            {config.tagline}
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
      </div>
    </footer>
  )
}

function TrustRow({ items }) {
  return (
    <FadeIn>
      <section style={{ padding: '24px 24px 60px' }}>
        <div
          className="demo-glass"
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
          }}
        >
          {items.map((it, i) => (
            <div
              key={it}
              style={{
                textAlign: 'center',
                padding: '0 16px',
                borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {it}
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  )
}

function GenericServices({ services, accent, label = 'Services', heading = 'What we do.', Icon = Activity }) {
  if (!services || services.length === 0) return null
  return (
    <section style={{ padding: '60px 24px' }}>
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
            {label}
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {heading}
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
          {services.map((s, i) => (
            <FadeIn key={i} delay={i * 0.06}>
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
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {s.name}
                </div>
                {s.price && (
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      borderTop: '0.5px solid rgba(255,255,255,0.06)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#fff',
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

function GenericReviews({ items, label = 'Reviews', heading = 'What clients say.' }) {
  return (
    <section style={{ padding: '60px 24px', background: 'rgba(255,255,255,0.02)' }}>
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
            {label}
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {heading}
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
            <FadeIn key={i} delay={i * 0.08}>
              <div
                className="demo-glass"
                style={{ borderRadius: 16, padding: '1.75rem', height: '100%' }}
              >
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
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

function GenericContact({ accent, heading, subhead, cta, fields = ['name', 'phone'] }) {
  const [submitted, setSubmitted] = useState(false)
  function onSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }
  const inputCss = {
    background: 'rgba(255,255,255,0.05)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: '#fff',
    padding: '12px 16px',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
  }
  return (
    <section style={{ padding: '60px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <FadeIn>
          <h2
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {heading}
          </h2>
          {subhead && (
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
              {subhead}
            </p>
          )}
        </FadeIn>
        <FadeIn delay={0.1}>
          {submitted ? (
            <div
              className="demo-glass"
              style={{ borderRadius: 16, padding: '2.5rem', marginTop: 32, textAlign: 'center' }}
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
              <div style={{ fontSize: 20, fontWeight: 700 }}>Got it.</div>
              <p style={{ color: 'rgba(255,255,255,0.55)', marginTop: 8, fontSize: 14 }}>
                We'll be in touch shortly.
              </p>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="demo-glass"
              style={{
                borderRadius: 16,
                padding: '2rem',
                marginTop: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {fields.includes('name') && (
                <input placeholder="Full name" required style={inputCss} />
              )}
              {fields.includes('email') && (
                <input type="email" placeholder="Email" style={inputCss} />
              )}
              {fields.includes('phone') && (
                <input type="tel" placeholder="Phone number" required style={inputCss} />
              )}
              {fields.includes('address') && (
                <input placeholder="Property address" style={inputCss} />
              )}
              {fields.includes('select') && (
                <select style={{ ...inputCss, cursor: 'pointer' }}>
                  <option>I'm looking to buy</option>
                  <option>I'm looking to sell</option>
                  <option>Just browsing</option>
                </select>
              )}
              {fields.includes('treatment') && (
                <select style={{ ...inputCss, cursor: 'pointer' }}>
                  <option>Botox & Fillers</option>
                  <option>Laser Treatments</option>
                  <option>Body Contouring</option>
                  <option>Facials</option>
                  <option>Not sure yet</option>
                </select>
              )}
              {fields.includes('time') && (
                <select style={{ ...inputCss, cursor: 'pointer' }}>
                  <option>Best time to call: Morning</option>
                  <option>Best time to call: Afternoon</option>
                  <option>Best time to call: Evening</option>
                </select>
              )}
              {fields.includes('message') && (
                <textarea
                  placeholder="Tell us about the issue or job"
                  rows={3}
                  style={{ ...inputCss, resize: 'vertical' }}
                />
              )}
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
                {cta}
              </button>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  )
}

function GenericDashboard({ Icon, businessName, accent, sidebarItems, stats, sections, watermarkText = 'DEMO PREVIEW' }) {
  const cardCss = {
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
            <Icon size={18} color={accent} strokeWidth={2.2} />
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>
              {businessName}
            </span>
          </div>
          {sidebarItems.map((item) => {
            const ItemIcon = item.icon
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
                <ItemIcon size={14} strokeWidth={item.active ? 2.2 : 1.8} />
                {item.label}
              </div>
            )
          })}
        </aside>
        <main style={{ padding: '24px 28px 80px', overflowX: 'hidden' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {businessName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              Operations overview
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
              const SIcon = s.icon
              return (
                <div key={s.label} style={cardCss}>
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
                    {SIcon && <SIcon size={14} color="rgba(255,255,255,0.35)" />}
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
                  {s.trend && (
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
                      {s.trend}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {sections.map((sec, i) => (
            <div key={i} style={{ ...cardCss, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{sec.title}</div>
              {sec.render({ accent, cardCss })}
            </div>
          ))}
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
        {watermarkText}
      </div>
    </div>
  )
}

function MiniTable({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {headers.map((h) => (
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
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    fontSize: 13,
                    padding: '12px 10px',
                    borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                    color: j === 0 ? '#fff' : 'rgba(255,255,255,0.65)',
                    fontWeight: j === 0 ? 600 : 400,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ============== PLUMBER ============== */

function PlumberWebsite({ config, accent }) {
  return (
    <div className="demo-root">
      <GenericNav Icon={Wrench} businessName={config.business_name} accent={accent} ctaText="Call Now" />
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
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
            filter: 'blur(80px)',
            top: '-15%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'demoOrb 16s ease-in-out infinite',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 880 }}>
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
              background: 'rgba(255,80,80,0.1)',
              border: '0.5px solid rgba(255,80,80,0.3)',
              fontSize: 12,
              color: 'rgba(255,200,200,0.95)',
              letterSpacing: '0.04em',
              marginBottom: 28,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ff7777',
                boxShadow: '0 0 8px #ff7777',
                animation: 'demoOrb 2s ease-in-out infinite',
              }}
            />
            24/7 EMERGENCY SERVICE AVAILABLE
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
            }}
          >
            Fast. Reliable. Done Right.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              marginTop: 24,
              maxWidth: 620,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Licensed plumbers serving {config.location || 'your area'}. Emergency service, repairs, and installs — done right the first time.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}
          >
            <a
              href={config.phone ? `tel:${config.phone}` : '#'}
              style={{
                background: '#ffffff',
                color: '#000',
                borderRadius: 999,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Phone size={16} />
              {config.phone || 'Call Now'}
            </a>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Request Service
            </button>
          </motion.div>
        </div>
      </section>
      <TrustRow items={['Licensed & Insured', 'Same Day Service', 'Free Estimates', '5★ Rated']} />
      <GenericServices services={config.services} accent={accent} Icon={Wrench} heading="Services we offer." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Why choose us.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginTop: 36,
            }}
          >
            {[
              { title: 'Fast Response', text: 'Same-day appointments and 24/7 emergency calls.' },
              { title: 'Experienced Team', text: 'Licensed pros with decades of combined experience.' },
              { title: 'Guaranteed Work', text: 'Every job comes with our quality guarantee.' },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <div className="demo-glass" style={{ borderRadius: 16, padding: '1.5rem', height: '100%' }}>
                  <ShieldCheck size={20} color={accent} />
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 14 }}>{p.title}</div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>
                    {p.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <GenericReviews
        items={[
          { quote: 'Showed up in 30 minutes for a burst pipe. Saved my floor.', name: 'Linda K.', role: 'Homeowner' },
          { quote: 'Honest pricing, clean work. Will use again for sure.', name: 'Mike R.', role: 'Apartment Owner' },
          { quote: 'Fixed a leak three other plumbers couldn\'t find. Pros.', name: 'Anna F.', role: 'Restaurant Owner' },
        ]}
      />
      <GenericContact
        accent={accent}
        heading="Need a plumber today?"
        subhead="Tell us about the problem — we'll call back within 30 minutes."
        cta="Request Service"
        fields={['name', 'phone', 'message']}
      />
      <GenericFooter config={config} />
    </div>
  )
}

function PlumberDashboard({ config, accent }) {
  return (
    <GenericDashboard
      Icon={Wrench}
      businessName={config.business_name}
      accent={accent}
      sidebarItems={[
        { label: 'Dashboard', icon: LayoutDashboard, active: true },
        { label: 'Jobs', icon: Briefcase },
        { label: 'Customers', icon: UsersIcon },
        { label: 'Invoices', icon: Receipt },
        { label: 'Schedule', icon: Calendar },
        { label: 'Settings', icon: Settings },
      ]}
      stats={[
        { label: 'Jobs This Month', value: '34', icon: Briefcase, trend: '+8 vs last' },
        { label: 'Revenue', value: '$8,240', icon: DollarSign, trend: '+12%' },
        { label: 'Pending', value: '12', icon: Clock },
        { label: 'Satisfaction', value: '98%', icon: Heart, trend: '+1%' },
      ]}
      sections={[
        {
          title: 'Recent Jobs',
          render: () => (
            <MiniTable
              headers={['Customer', 'Service', 'Status', 'Amount']}
              rows={[
                ['Linda Kemper', 'Burst pipe repair', 'In progress', '$340'],
                ['Mike Rivera', 'Water heater install', 'Scheduled', '$1,200'],
                ['Anna Foster', 'Drain cleaning', 'Completed', '$185'],
                ['James Chen', 'Bathroom remodel', 'Quoted', '$3,800'],
                ['Sarah Diaz', 'Faucet replacement', 'Completed', '$220'],
              ]}
            />
          ),
        },
        {
          title: "Today's Schedule",
          render: () => (
            <MiniTable
              headers={['Time', 'Customer', 'Job', 'Tech']}
              rows={[
                ['9:00 AM', 'Linda Kemper', 'Pipe repair', 'Diego'],
                ['11:30 AM', 'Mike Rivera', 'Water heater', 'Carlos'],
                ['2:00 PM', 'James Chen', 'Inspection', 'Diego'],
              ]}
            />
          ),
        },
      ]}
    />
  )
}

/* ============== REAL ESTATE ============== */

function RealEstateWebsite({ config, accent }) {
  const properties = [
    { price: '$350,000', beds: 3, baths: 2, sqft: 1840, location: 'Oranjestad', tag: 'NEW' },
    { price: '$520,000', beds: 4, baths: 3, sqft: 2620, location: 'Palm Beach' },
    { price: '$890,000', beds: 5, baths: 4, sqft: 3950, location: 'Noord', tag: 'LUXURY' },
  ]
  return (
    <div className="demo-root">
      <GenericNav Icon={Home} businessName={config.business_name} accent={accent} ctaText="Find Your Home" />
      <section
        style={{
          minHeight: '85vh',
          padding: '120px 24px 60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 880 }}>
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              fontSize: 'clamp(38px, 7vw, 72px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            Find Your Dream Property in {config.location || 'Aruba'}.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              marginTop: 22,
              maxWidth: 560,
              margin: '22px auto 0',
            }}
          >
            Curated listings, expert agents, and honest guidance from search to close.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="demo-glass"
            style={{
              marginTop: 36,
              borderRadius: 16,
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) auto',
              gap: 8,
              maxWidth: 720,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <input
              placeholder="Location"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <select
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '12px 14px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option>Any property</option>
              <option>House</option>
              <option>Condo</option>
              <option>Land</option>
            </select>
            <button
              type="button"
              style={{
                background: '#fff',
                color: '#000',
                borderRadius: 10,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Search size={14} />
              Search
            </button>
          </motion.div>
        </div>
      </section>
      <section style={{ padding: '60px 24px' }}>
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
              Featured Listings
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Hand-picked homes.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 18,
              marginTop: 40,
            }}
          >
            {properties.map((p, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="demo-glass" style={{ borderRadius: 16, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: 180,
                      background: `linear-gradient(135deg, ${accent}33 0%, rgba(20,20,28,0.9) 100%)`,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 14,
                    }}
                  >
                    {p.tag && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          background: '#fff',
                          color: '#000',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          letterSpacing: '0.06em',
                        }}
                      >
                        {p.tag}
                      </span>
                    )}
                    <Building2 size={56} color="rgba(255,255,255,0.18)" strokeWidth={1.2} />
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{p.price}</div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 14,
                        marginTop: 10,
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Bed size={13} />
                        {p.beds} Bd
                      </span>
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Bath size={13} />
                        {p.baths} Ba
                      </span>
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <Square size={13} />
                        {p.sqft.toLocaleString()} sqft
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 8 }}>
                      <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {p.location}
                    </div>
                    <button
                      type="button"
                      style={{
                        marginTop: 14,
                        width: '100%',
                        background: 'transparent',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: 999,
                        padding: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <GenericServices services={config.services} accent={accent} Icon={Briefcase} label="Services" heading="How we work with you." />
      <TrustRow items={['150+ Properties Sold', '12 Years Experience', '98% Satisfaction', '$50M+ in Sales']} />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Meet your agents.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginTop: 36,
            }}
          >
            {[
              { name: 'Sofia Mendez', spec: 'Luxury Homes' },
              { name: 'James Foster', spec: 'Investment Properties' },
              { name: 'Isabella Cruz', spec: 'First-Time Buyers' },
            ].map((a, i) => (
              <FadeIn key={a.name} delay={i * 0.08}>
                <div className="demo-glass" style={{ borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: `${accent}22`,
                      color: accent,
                      margin: '0 auto 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    {a.name.split(' ').map((p) => p[0]).join('')}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>{a.spec}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <GenericReviews
        items={[
          { quote: 'Sold our home in 3 weeks above asking. Pros.', name: 'Daniel & Eva', role: 'Sellers · Palm Beach' },
          { quote: 'They guided us through everything as first-time buyers.', name: 'Marco S.', role: 'Buyer · Noord' },
          { quote: 'Best agent I\'ve worked with in 20 years of investing.', name: 'Helen R.', role: 'Investor' },
        ]}
      />
      <GenericContact
        accent={accent}
        heading="Ready to buy or sell?"
        subhead="Tell us what you're looking for. No pressure, ever."
        cta="Get Started"
        fields={['name', 'email', 'phone', 'select']}
      />
      <GenericFooter config={config} />
    </div>
  )
}

function RealEstateDashboard({ config, accent }) {
  return (
    <GenericDashboard
      Icon={Home}
      businessName={config.business_name}
      accent={accent}
      sidebarItems={[
        { label: 'Dashboard', icon: LayoutDashboard, active: true },
        { label: 'Listings', icon: Building2 },
        { label: 'Clients', icon: UsersIcon },
        { label: 'Leads', icon: Activity },
        { label: 'Showings', icon: Calendar },
        { label: 'Analytics', icon: TrendingUp },
      ]}
      stats={[
        { label: 'Active Listings', value: '47', icon: Building2, trend: '+5 this week' },
        { label: 'Pipeline', value: '$2.4M', icon: DollarSign, trend: '+18%' },
        { label: 'Leads', value: '23', icon: Activity },
        { label: 'Showings', value: '8', icon: Calendar, trend: 'this week' },
      ]}
      sections={[
        {
          title: 'Active Listings',
          render: () => (
            <MiniTable
              headers={['Address', 'Price', 'Status', 'Days on Market']}
              rows={[
                ['142 Palm Ridge Dr', '$520,000', 'Active', '12'],
                ['89 Sunset Bay', '$890,000', 'Pending', '24'],
                ['33 Ocean View', '$350,000', 'Active', '4'],
                ['77 Coral Terrace', '$715,000', 'Active', '38'],
                ['12 Bayside Loop', '$1,250,000', 'Open House', '7'],
              ]}
            />
          ),
        },
        {
          title: 'Lead Pipeline',
          render: () => (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              {[
                { stage: 'New Leads', count: 9 },
                { stage: 'Contacted', count: 7 },
                { stage: 'Showing Scheduled', count: 4 },
                { stage: 'Offer Made', count: 3 },
              ].map((s) => (
                <div
                  key={s.stage}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {s.stage}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{s.count}</div>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}

/* ============== MED SPA ============== */

function MedSpaWebsite({ config, accent }) {
  return (
    <div className="demo-root">
      <GenericNav Icon={Sparkles} businessName={config.business_name} accent={accent} ctaText="Book Appointment" />
      <section
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 30%, ${accent}1c 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(255,200,180,0.04) 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 880, position: 'relative' }}>
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: EASE }}
            style={{
              fontSize: 'clamp(40px, 8vw, 84px)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.02,
            }}
          >
            Reveal Your Best Self.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              marginTop: 24,
              maxWidth: 560,
              margin: '24px auto 0',
            }}
          >
            Personalized treatments by board-certified providers. Subtle, beautiful, transformative results.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}
          >
            <button
              type="button"
              style={{
                background: '#ffffff',
                color: '#000',
                borderRadius: 999,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Book Free Consultation
            </button>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              View Treatments
            </button>
          </motion.div>
        </div>
      </section>
      <TrustRow items={['500+ Happy Clients', 'Board Certified', 'Premium Products', '5★ Reviews']} />
      <GenericServices services={config.services} accent={accent} Icon={Sparkles} label="Treatments" heading="Tailored to you." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Real results.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 36,
              maxWidth: 880,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {['Before', 'After'].map((label) => (
              <div
                key={label}
                className="demo-glass"
                style={{
                  borderRadius: 16,
                  height: 280,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 18,
                  position: 'relative',
                  background: `linear-gradient(135deg, ${accent}22 0%, rgba(20,20,28,0.95) 100%)`,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    color: '#fff',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '4px 12px',
                    borderRadius: 999,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Meet our providers.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginTop: 36,
            }}
          >
            {[
              { name: 'Dr. Sara Vance', cred: 'MD · Aesthetics' },
              { name: 'Camila Reyes', cred: 'RN · Injector' },
              { name: 'Olivia Park', cred: 'Esthetician' },
            ].map((a, i) => (
              <FadeIn key={a.name} delay={i * 0.08}>
                <div className="demo-glass" style={{ borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      background: `${accent}22`,
                      color: accent,
                      margin: '0 auto 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    {a.name.split(' ').map((p) => p[0]).join('')}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{a.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 }}>{a.cred}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <GenericReviews
        items={[
          { quote: 'I finally feel like myself again. Subtle, perfect work.', name: 'Maya L.', role: 'Botox · 2 years' },
          { quote: 'Glowing skin in 2 sessions. The team is amazing.', name: 'Rachel D.', role: 'Laser · 6 months' },
          { quote: 'They listened to what I wanted and delivered exactly that.', name: 'Sofia G.', role: 'Body Contouring' },
        ]}
      />
      <GenericContact
        accent={accent}
        heading="Ready to start your journey?"
        subhead="Free consultation, zero pressure. We'll create a plan tailored to you."
        cta="Book Consultation"
        fields={['name', 'email', 'phone', 'treatment']}
      />
      <GenericFooter config={config} />
    </div>
  )
}

function MedSpaDashboard({ config, accent }) {
  return (
    <GenericDashboard
      Icon={Sparkles}
      businessName={config.business_name}
      accent={accent}
      sidebarItems={[
        { label: 'Dashboard', icon: LayoutDashboard, active: true },
        { label: 'Appointments', icon: Calendar },
        { label: 'Clients', icon: UsersIcon },
        { label: 'Treatments', icon: Activity },
        { label: 'Revenue', icon: DollarSign },
        { label: 'Settings', icon: Settings },
      ]}
      stats={[
        { label: 'Appointments', value: '89', icon: Calendar, trend: '+14%' },
        { label: 'Revenue', value: '$18,500', icon: DollarSign, trend: '+9%' },
        { label: 'Clients', value: '234', icon: UsersIcon },
        { label: 'Rating', value: '4.9★', icon: Star },
      ]}
      sections={[
        {
          title: "Today's Appointments",
          render: () => (
            <MiniTable
              headers={['Client', 'Treatment', 'Time', 'Provider']}
              rows={[
                ['Maya Lopez', 'Botox refresh', '10:00 AM', 'Camila'],
                ['Rachel Diaz', 'Laser session', '11:30 AM', 'Dr. Vance'],
                ['Sofia Greene', 'Hydrafacial', '1:00 PM', 'Olivia'],
                ['Lina Mora', 'Filler consult', '2:30 PM', 'Dr. Vance'],
                ['Eve Cardenas', 'Body contouring', '4:00 PM', 'Camila'],
              ]}
            />
          ),
        },
        {
          title: 'Weekly Revenue',
          render: ({ accent: a }) => (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160, paddingTop: 8 }}>
              {[60, 78, 52, 88, 70, 92].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${h}%`,
                      background: `linear-gradient(180deg, ${a} 0%, ${a}55 100%)`,
                      borderRadius: 6,
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>W{i + 1}</div>
                </div>
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}

/* ============== HVAC ============== */

function HvacWebsite({ config, accent }) {
  return (
    <div className="demo-root">
      <GenericNav Icon={Wind} businessName={config.business_name} accent={accent} ctaText="Get Free Quote" />
      <section
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 60px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 880 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
            <Snowflake size={11} color={accent} />
            <span style={{ marginLeft: 4 }}>24/7 EMERGENCY SERVICE</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            style={{
              fontSize: 'clamp(38px, 7vw, 76px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            Keep Your Home Comfortable Year-Round.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              marginTop: 22,
              maxWidth: 580,
              margin: '22px auto 0',
            }}
          >
            Cooling, heating, and maintenance from licensed pros. Free estimates and emergency service when you need it.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}
          >
            <button
              type="button"
              style={{
                background: '#fff',
                color: '#000',
                borderRadius: 999,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Schedule Service
            </button>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Get Free Quote
            </button>
          </motion.div>
        </div>
      </section>
      <TrustRow items={['Licensed & Certified', '24/7 Emergency', 'Free Estimates', '10 Year Warranty']} />
      <GenericServices services={config.services} accent={accent} Icon={Wind} heading="Full-service HVAC." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              How it works.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginTop: 36,
            }}
          >
            {[
              { num: '01', title: 'Call Us', text: 'Tell us what\'s wrong over the phone or online.' },
              { num: '02', title: 'We Diagnose', text: 'Same-day diagnosis with a clear, upfront estimate.' },
              { num: '03', title: 'Problem Solved', text: 'Most repairs done in one visit. Guaranteed.' },
            ].map((s, i) => (
              <FadeIn key={s.num} delay={i * 0.08}>
                <div className="demo-glass" style={{ borderRadius: 16, padding: '1.75rem' }}>
                  <div style={{ fontSize: 38, fontWeight: 800, color: 'rgba(255,255,255,0.12)', letterSpacing: '-0.04em' }}>
                    {s.num}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 12 }}>{s.title}</div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 8 }}>{s.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              Brands We Service
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {['Carrier', 'Trane', 'Lennox', 'Rheem', 'Goodman', 'York', 'Daikin', 'Mitsubishi'].map((b) => (
                <span
                  key={b}
                  style={{
                    padding: '8px 16px',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 500,
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
      <GenericReviews
        items={[
          { quote: 'Replaced our 15-year-old AC in a day. Cool and quiet now.', name: 'Tom B.', role: 'Homeowner' },
          { quote: 'Tech showed up on time, fair price, no upsell games.', name: 'Priya M.', role: 'Office Manager' },
          { quote: 'They saved us during a heatwave. Lifesavers.', name: 'Jorge L.', role: 'Restaurant Owner' },
        ]}
      />
      <GenericContact
        accent={accent}
        heading="Need HVAC service?"
        subhead="Tell us what's going on. We'll be in touch fast."
        cta="Request Service"
        fields={['name', 'phone', 'message', 'time']}
      />
      <GenericFooter config={config} />
    </div>
  )
}

function HvacDashboard({ config, accent }) {
  return (
    <GenericDashboard
      Icon={Wind}
      businessName={config.business_name}
      accent={accent}
      sidebarItems={[
        { label: 'Dashboard', icon: LayoutDashboard, active: true },
        { label: 'Service Calls', icon: Briefcase },
        { label: 'Customers', icon: UsersIcon },
        { label: 'Equipment', icon: ClipboardList },
        { label: 'Invoices', icon: Receipt },
        { label: 'Schedule', icon: Calendar },
      ]}
      stats={[
        { label: 'Service Calls', value: '52', icon: Briefcase, trend: '+11%' },
        { label: 'Revenue', value: '$14,800', icon: DollarSign, trend: '+7%' },
        { label: 'Scheduled', value: '18', icon: Calendar },
        { label: 'Customers', value: '127', icon: UsersIcon },
      ]}
      sections={[
        {
          title: 'Recent Service Calls',
          render: () => (
            <MiniTable
              headers={['Customer', 'Service', 'Tech', 'Status']}
              rows={[
                ['Tom Bauer', 'AC unit replacement', 'Marcus', 'In progress'],
                ['Priya Mehta', 'Maintenance check', 'Liam', 'Completed'],
                ['Jorge Luna', 'Emergency cooling', 'Marcus', 'Completed'],
                ['Hana Park', 'Furnace tune-up', 'Owen', 'Scheduled'],
                ['Carl Reeve', 'Thermostat install', 'Liam', 'Completed'],
              ]}
            />
          ),
        },
        {
          title: "Today's Schedule",
          render: () => (
            <MiniTable
              headers={['Time', 'Customer', 'Service', 'Tech']}
              rows={[
                ['8:30 AM', 'Tom Bauer', 'AC install', 'Marcus'],
                ['10:00 AM', 'Hana Park', 'Furnace tune-up', 'Owen'],
                ['1:00 PM', 'Eve Castro', 'AC repair', 'Liam'],
                ['3:30 PM', 'Diego Ruiz', 'Inspection', 'Marcus'],
              ]}
            />
          ),
        },
      ]}
    />
  )
}

/* ============== ROOFING ============== */

function RoofingWebsite({ config, accent }) {
  return (
    <div className="demo-root">
      <GenericNav Icon={Hammer} businessName={config.business_name} accent={accent} ctaText="Get Free Inspection" />
      <section
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 60px',
          position: 'relative',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 0%, ${accent}22 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ maxWidth: 880, position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              display: 'inline-flex',
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
            <Award size={11} color={accent} />
            <span>FREE ROOF INSPECTION</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            style={{
              fontSize: 'clamp(38px, 7.5vw, 76px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            Protect Your Home From the Top Down.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 'clamp(15px, 2vw, 18px)',
              marginTop: 22,
              maxWidth: 580,
              margin: '22px auto 0',
            }}
          >
            New roofs, repairs, and inspections done by experienced crews. Built to last, backed by warranty.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 36 }}
          >
            <button
              type="button"
              style={{
                background: '#fff',
                color: '#000',
                borderRadius: 999,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Schedule Inspection
            </button>
            <button
              type="button"
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999,
                padding: '14px 30px',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              View Our Work
            </button>
          </motion.div>
        </div>
      </section>
      <TrustRow items={['20+ Years Experience', 'Licensed & Insured', '5★ Rated', 'Financing Available']} />
      <GenericServices services={config.services} accent={accent} Icon={Hammer} heading="Roofing services." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Our process.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginTop: 36,
            }}
          >
            {[
              { num: '01', title: 'Free Inspection', text: 'Detailed assessment of your roof\'s condition.' },
              { num: '02', title: 'Custom Quote', text: 'Transparent pricing tailored to your home.' },
              { num: '03', title: 'Expert Installation', text: 'Skilled crews using premium materials.' },
              { num: '04', title: 'Final Walkthrough', text: 'We don\'t leave until you\'re happy.' },
            ].map((s, i) => (
              <FadeIn key={s.num} delay={i * 0.08}>
                <div className="demo-glass" style={{ borderRadius: 16, padding: '1.5rem' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.12)', letterSpacing: '-0.04em' }}>
                    {s.num}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>{s.title}</div>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 8 }}>{s.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2 style={{ fontSize: 'clamp(24px, 3.6vw, 34px)', fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>
              Recent projects.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginTop: 32,
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <FadeIn key={n} delay={n * 0.06}>
                <div
                  className="demo-glass"
                  style={{
                    borderRadius: 16,
                    aspectRatio: '4 / 3',
                    background: `linear-gradient(135deg, ${accent}33 0%, rgba(20,20,28,0.95) 100%)`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 14,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  Completed Project {n}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <FadeIn>
        <section style={{ padding: '60px 24px' }}>
          <div
            className="demo-glass"
            style={{
              maxWidth: 880,
              margin: '0 auto',
              borderRadius: 20,
              padding: '2.5rem',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Don't let cost stop you.
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 10, lineHeight: 1.6 }}>
              Flexible payment plans available. Roof your home now, pay over time.
            </p>
            <button
              type="button"
              style={{
                marginTop: 22,
                background: '#fff',
                color: '#000',
                borderRadius: 999,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Learn More
            </button>
          </div>
        </section>
      </FadeIn>
      <GenericReviews
        items={[
          { quote: 'Brand new roof in 3 days. Crew was professional and clean.', name: 'Mark T.', role: 'Homeowner' },
          { quote: 'Caught hail damage I didn\'t even know was there. Saved me thousands.', name: 'Lina P.', role: 'Homeowner' },
          { quote: 'Honest estimate, kept their word, did the job right. Highly recommend.', name: 'Vince A.', role: 'Property Manager' },
        ]}
      />
      <GenericContact
        accent={accent}
        heading="Get your free inspection today."
        subhead="Tell us about your roof. We'll come take a look at no cost."
        cta="Request Inspection"
        fields={['name', 'phone', 'address', 'message']}
      />
      <GenericFooter config={config} />
    </div>
  )
}

function RoofingDashboard({ config, accent }) {
  return (
    <GenericDashboard
      Icon={Hammer}
      businessName={config.business_name}
      accent={accent}
      sidebarItems={[
        { label: 'Dashboard', icon: LayoutDashboard, active: true },
        { label: 'Projects', icon: Briefcase },
        { label: 'Customers', icon: UsersIcon },
        { label: 'Estimates', icon: FileText },
        { label: 'Invoices', icon: Receipt },
        { label: 'Schedule', icon: Calendar },
      ]}
      stats={[
        { label: 'Active Projects', value: '28', icon: Briefcase, trend: '+4' },
        { label: 'Revenue', value: '$127,400', icon: DollarSign, trend: '+15%' },
        { label: 'Pending Estimates', value: '15', icon: FileText },
        { label: 'Satisfaction', value: '94%', icon: Heart, trend: '+2%' },
      ]}
      sections={[
        {
          title: 'Active Projects',
          render: () => (
            <MiniTable
              headers={['Address', 'Type', 'Stage', 'Value']}
              rows={[
                ['142 Coral Bay Dr', 'Full reroof', 'Installing', '$18,400'],
                ['89 Sunset Ln', 'Repair', 'Quoted', '$2,900'],
                ['33 Palm Ridge', 'Inspection', 'Walkthrough', '$0'],
                ['77 Oceanview Tr', 'Gutter install', 'Scheduled', '$3,800'],
                ['12 Bayside Loop', 'Full reroof', 'Materials ordered', '$22,500'],
              ]}
            />
          ),
        },
        {
          title: 'Pending Estimates',
          render: () => (
            <MiniTable
              headers={['Customer', 'Job', 'Amount', 'Status']}
              rows={[
                ['Mark Tate', 'Reroof + skylights', '$24,800', 'Awaiting decision'],
                ['Lina Park', 'Hail damage repair', '$5,200', 'Approved'],
                ['Vince Aragon', 'Tile replacement', '$8,750', 'Sent'],
                ['Eli Cortez', 'Inspection report', '$0', 'Sent'],
                ['Naomi Reed', 'Gutter install', '$3,400', 'Awaiting decision'],
              ]}
            />
          ),
        },
      ]}
    />
  )
}

/* ============== Template router ============== */

const TEMPLATE_RENDERERS = {
  gym: { Website: WebsitePreview, Dashboard: DashboardPreview },
  plumber: { Website: PlumberWebsite, Dashboard: PlumberDashboard },
  realestate: { Website: RealEstateWebsite, Dashboard: RealEstateDashboard },
  medspa: { Website: MedSpaWebsite, Dashboard: MedSpaDashboard },
  hvac: { Website: HvacWebsite, Dashboard: HvacDashboard },
  roofing: { Website: RoofingWebsite, Dashboard: RoofingDashboard },
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
        const data = await db.query('SELECT * FROM demos WHERE slug = $1 LIMIT 1', [slug])
        if (cancelled) return
        const rawDemo = data?.[0] || data?.rows?.[0]
        if (!rawDemo) {
          setError('Demo not found.')
          return
        }
        let parsedConfig = rawDemo.config
        if (typeof parsedConfig === 'string') {
          try {
            parsedConfig = JSON.parse(parsedConfig)
          } catch {
            parsedConfig = {}
          }
        }
        const row = { ...rawDemo, config: parsedConfig || {} }
        console.log(
          'Demo loaded:',
          row.business_name,
          'Theme:',
          parsedConfig?.theme,
          'Full config:',
          parsedConfig,
        )
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
    cfg = cfg || {}
    return {
      ...cfg,
      business_name: cfg.business_name || demo.business_name || 'Your Gym',
      tagline: cfg.tagline || 'Train hard. Look great. Feel unstoppable.',
      primary_color: cfg.primary_color || '#6378ff',
      phone: cfg.phone || null,
      email: cfg.email || null,
      location: cfg.location || null,
      services: Array.isArray(cfg.services) ? cfg.services : [],
      theme: cfg.theme || cfg.style || 'eclipse',
      template: cfg.template || demo.template || 'gym',
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

      {(() => {
        const themeRaw = String(config?.theme || config?.style || 'eclipse')
          .toLowerCase()
          .trim()
        const themeKey =
          themeRaw === 'premium' ? 'ember' : themeRaw === 'classic' ? 'eclipse' : themeRaw
        const validThemes = ['eclipse', 'ember', 'pearl', 'titan', 'pulse']
        const finalTheme = validThemes.includes(themeKey) ? themeKey : 'eclipse'
        const tplKey = String(demo?.template || 'gym')
          .toLowerCase()
          .replace(/[^a-z]/g, '')

        console.log('Theme routing:', {
          raw: themeRaw,
          key: themeKey,
          final: finalTheme,
          template: tplKey,
          config,
        })

        const THEME_MAP = {
          eclipse: TEMPLATE_RENDERERS,
          ember: EMBER_RENDERERS,
          pearl: PEARL_RENDERERS,
          titan: TITAN_RENDERERS,
          pulse: PULSE_RENDERERS,
        }
        const rendererMap = THEME_MAP[finalTheme] || THEME_MAP.eclipse
        const renderer = rendererMap[tplKey] || rendererMap.gym
        const Component = tab === 'website' ? renderer.Website : renderer.Dashboard

        return (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 28,
                background: 'rgba(0,0,0,0.85)',
                color: '#ffffff',
                fontSize: 11,
                textAlign: 'center',
                lineHeight: '28px',
                zIndex: 9999,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                letterSpacing: '0.04em',
                pointerEvents: 'none',
              }}
            >
              Theme: <b style={{ color: '#9be7ff' }}>{finalTheme}</b> · Template:{' '}
              <b style={{ color: '#9be7ff' }}>{tplKey}</b> · Config theme:{' '}
              <b style={{ color: '#9be7ff' }}>{String(config?.theme ?? '—')}</b>
            </div>
            <Component config={config} accent={accent} />
          </>
        )
      })()}

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
