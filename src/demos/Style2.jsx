import { useRef, useState } from 'react'
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
  Building2,
  ClipboardList,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import Background2 from './styles/Background2'
import GlassCard2 from './styles/GlassCard2'

const EASE = [0.16, 1, 0.3, 1]
const AMBER = 'rgba(255,160,60,0.9)'
const AMBER_BG = 'rgba(255,140,50,0.12)'
const AMBER_BG_STRONG = 'rgba(255,140,50,0.25)'
const AMBER_BORDER = 'rgba(255,140,50,0.4)'
const TEXT_MUTED = 'rgba(255,255,255,0.55)'

/* ---------- Global keyframes ---------- */

function Style2GlobalCss() {
  return (
    <style>{`
      .s2-root {
        background: #0d0a08;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        min-height: 100vh;
      }
      .s2-amber-btn {
        background: ${AMBER_BG};
        color: ${AMBER};
        border: 1px solid ${AMBER_BORDER};
        border-radius: 999px;
        padding: 14px 30px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .s2-amber-btn:hover { background: ${AMBER_BG_STRONG}; }
      .s2-ghost-btn {
        background: transparent;
        color: #ffffff;
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 999px;
        padding: 14px 30px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      @keyframes warmFloat1 {
        0%,100% { transform: translate(0,0) scale(1); }
        30% { transform: translate(-20px,30px) scale(1.03); }
        60% { transform: translate(10px,-20px) scale(0.97); }
      }
      @keyframes warmFloat2 {
        0%,100% { transform: translate(0,0); }
        40% { transform: translate(30px,-25px); }
        70% { transform: translate(-15px,15px); }
      }
      @keyframes warmFloat3 {
        0%,100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(20px,30px) scale(1.02); }
      }
      @keyframes widgetFloat {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes amberPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(255,140,50,0.5); }
        100% { box-shadow: 0 0 0 10px rgba(255,140,50,0); }
      }
    `}</style>
  )
}

/* ---------- Shared helpers ---------- */

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

function S2Nav({ Icon, businessName, ctaText }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 64,
        background: 'rgba(13,10,8,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '0.5px solid rgba(255,140,50,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={18} color={AMBER} strokeWidth={2.2} />
        <span
          style={{
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '-0.01em',
            color: '#fff',
          }}
        >
          {businessName}
        </span>
      </div>
      <button
        type="button"
        style={{
          background: AMBER_BG,
          color: AMBER,
          border: `1px solid ${AMBER_BORDER}`,
          borderRadius: 999,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = AMBER_BG_STRONG)}
        onMouseLeave={(e) => (e.currentTarget.style.background = AMBER_BG)}
      >
        {ctaText}
      </button>
    </header>
  )
}

function HeroWidget({ children, top, right, bottom, left, delay = 0, width = 200 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      style={{
        position: 'absolute',
        top,
        right,
        bottom,
        left,
        width,
        background: 'rgba(25,18,10,0.9)',
        border: '0.5px solid rgba(255,140,50,0.2)',
        borderRadius: 12,
        padding: '12px 16px',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        animation: `widgetFloat ${5 + delay * 2}s ease-in-out infinite`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,140,50,0.08)',
        zIndex: 2,
      }}
    >
      {children}
    </motion.div>
  )
}

function S2Hero({ businessName, headline, subhead, primaryCta, secondaryCta, widgets }) {
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
      {widgets}
      <div style={{ position: 'relative', maxWidth: 880, zIndex: 3 }}>
        <motion.h1
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{
            fontSize: 'clamp(40px, 8vw, 84px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            textShadow: '0 0 40px rgba(255,140,50,0.18)',
          }}
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            color: TEXT_MUTED,
            fontSize: 'clamp(15px, 2vw, 18px)',
            marginTop: 24,
            maxWidth: 600,
            margin: '24px auto 0',
            lineHeight: 1.6,
          }}
        >
          {subhead}
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
          <button type="button" className="s2-amber-btn">
            {primaryCta}
            <ArrowRight size={16} />
          </button>
          {secondaryCta && (
            <button type="button" className="s2-ghost-btn">
              {secondaryCta}
            </button>
          )}
        </motion.div>
      </div>
    </section>
  )
}

function S2TrustRow({ items }) {
  return (
    <FadeIn>
      <section style={{ padding: '24px 24px 60px', background: '#0f0c09' }}>
        <div
          style={{
            maxWidth: 1080,
            margin: '0 auto',
            background: 'rgba(30,22,14,0.85)',
            border: '0.5px solid rgba(255,140,50,0.15)',
            borderRadius: 16,
            padding: '20px 24px',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
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
                borderLeft: i === 0 ? 'none' : '1px solid rgba(255,140,50,0.08)',
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

function S2Services({ services, Icon = Activity, label = 'Services', heading = 'What we do.' }) {
  if (!services || services.length === 0) return null
  return (
    <section style={{ padding: '60px 24px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <FadeIn>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: AMBER,
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
              <GlassCard2
                style={{
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
                    background: 'rgba(255,140,50,0.12)',
                    border: '0.5px solid rgba(255,140,50,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: AMBER,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.name}
                </div>
                {s.price && (
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      borderTop: '0.5px solid rgba(255,140,50,0.06)',
                      fontSize: 16,
                      fontWeight: 700,
                      color: AMBER,
                    }}
                  >
                    {s.price}
                  </div>
                )}
              </GlassCard2>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function S2Reviews({ items, label = 'Reviews', heading = 'What clients say.' }) {
  return (
    <section style={{ padding: '60px 24px', background: '#0f0c09' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <FadeIn>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.15em',
              color: AMBER,
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
              <GlassCard2 style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -22,
                    right: 6,
                    fontSize: 96,
                    fontWeight: 900,
                    color: 'rgba(255,140,50,0.06)',
                    lineHeight: 1,
                    pointerEvents: 'none',
                  }}
                >
                  "
                </div>
                <div style={{ color: AMBER, fontSize: 13, position: 'relative' }}>
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
                <p
                  style={{
                    fontSize: 15,
                    color: '#fff',
                    lineHeight: 1.6,
                    marginTop: 14,
                    position: 'relative',
                  }}
                >
                  "{t.quote}"
                </p>
                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '0.5px solid rgba(255,140,50,0.08)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div
                    style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}
                  >
                    {t.role}
                  </div>
                </div>
              </GlassCard2>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function S2Contact({ heading, subhead, cta, fields = ['name', 'phone'] }) {
  const [submitted, setSubmitted] = useState(false)
  function onSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }
  const inputCss = {
    background: 'rgba(15,12,9,0.7)',
    border: '0.5px solid rgba(255,140,50,0.18)',
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
                color: TEXT_MUTED,
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
            <GlassCard2 style={{ marginTop: 32, padding: '2.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(255,140,50,0.18)',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: AMBER,
                }}
              >
                <Check size={24} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Got it.</div>
              <p style={{ color: TEXT_MUTED, marginTop: 8, fontSize: 14 }}>
                We'll be in touch shortly.
              </p>
            </GlassCard2>
          ) : (
            <GlassCard2 style={{ marginTop: 32, padding: '2rem' }} hoverEffect={false}>
              <form
                onSubmit={onSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
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
                    <option>Best time: Morning</option>
                    <option>Best time: Afternoon</option>
                    <option>Best time: Evening</option>
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
                    background: AMBER_BG_STRONG,
                    color: '#fff',
                    border: `1px solid ${AMBER_BORDER}`,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {cta}
                </button>
              </form>
            </GlassCard2>
          )}
        </FadeIn>
      </div>
    </section>
  )
}

function S2Footer({ config }) {
  return (
    <footer
      style={{
        position: 'relative',
        padding: '40px 24px 60px',
        background: 'rgba(8,6,4,0.95)',
        borderTop: '0.5px solid rgba(255,140,50,0.1)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background:
            'linear-gradient(180deg, rgba(255,140,50,0.04) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 13,
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          {config.location && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <MapPin size={13} color={AMBER} />
              {config.location}
            </div>
          )}
          {config.phone && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Phone size={13} color={AMBER} />
              {config.phone}
            </div>
          )}
          {config.email && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Mail size={13} color={AMBER} />
              {config.email}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

/* ---------- Dashboard helpers ---------- */

function S2MiniTable({ headers, rows }) {
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
                  color: AMBER,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '8px 10px',
                  borderBottom: '0.5px solid rgba(255,140,50,0.08)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,140,50,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{ transition: 'background 0.15s ease' }}
            >
              {r.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    fontSize: 13,
                    padding: '12px 10px',
                    borderBottom: '0.5px solid rgba(255,140,50,0.04)',
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

function S2Dashboard({ Icon, businessName, sidebarItems, stats, sections }) {
  const cardCss = {
    background: 'rgba(30,22,14,0.85)',
    border: '0.5px solid rgba(255,140,50,0.12)',
    borderRadius: 14,
    padding: 18,
    backdropFilter: 'blur(14px) saturate(160%)',
    WebkitBackdropFilter: 'blur(14px) saturate(160%)',
  }
  return (
    <div className="s2-root" style={{ position: 'relative', minHeight: '100vh' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 80% 50% at 80% 10%, rgba(220,100,30,0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 90%, rgba(180,60,10,0.05) 0%, transparent 55%)',
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
            background: 'rgba(18,12,6,0.95)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRight: '0.5px solid rgba(255,140,50,0.1)',
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
            <Icon size={18} color={AMBER} strokeWidth={2.2} />
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
                  background: item.active ? 'rgba(255,140,50,0.12)' : 'transparent',
                  color: item.active ? AMBER : 'rgba(255,255,255,0.5)',
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
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 4,
              }}
            >
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
                    {SIcon && <SIcon size={14} color={AMBER} />}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      marginTop: 12,
                      color: AMBER,
                    }}
                  >
                    {s.value}
                  </div>
                  {s.trend && (
                    <div
                      style={{
                        fontSize: 11,
                        color: AMBER,
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
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                {sec.title}
              </div>
              {sec.render({ cardCss })}
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
          color: 'rgba(255,140,50,0.06)',
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

/* ---------- Widget content per template ---------- */

const WIDGET_LABEL = {
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: AMBER,
  fontWeight: 600,
}

const WIDGET_VALUE = {
  fontSize: 22,
  fontWeight: 800,
  color: '#fff',
  marginTop: 4,
  letterSpacing: '-0.01em',
}

function WidgetTitle({ children }) {
  return <div style={WIDGET_LABEL}>{children}</div>
}

function MiniChartBars({ values = [60, 75, 50, 85] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        height: 28,
        marginTop: 10,
      }}
    >
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${v}%`,
            background: 'linear-gradient(180deg, rgba(255,140,50,0.85), rgba(255,140,50,0.3))',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}

const WIDGET_BUILDERS = {
  gym: () => [
    <HeroWidget key="w1" top="14%" right="6%" delay={0.2}>
      <WidgetTitle>Today's Classes</WidgetTitle>
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>HIIT</span>
          <span style={{ color: AMBER }}>6:00 PM</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span>Yoga Flow</span>
          <span style={{ color: AMBER }}>7:30 PM</span>
        </div>
      </div>
    </HeroWidget>,
    <HeroWidget key="w2" bottom="16%" left="5%" delay={0.4} width={170}>
      <WidgetTitle>New Members</WidgetTitle>
      <div style={WIDGET_VALUE}>12</div>
      <MiniChartBars values={[40, 60, 80, 95, 70]} />
    </HeroWidget>,
    <HeroWidget key="w3" top="42%" right="3%" delay={0.6} width={150}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Star size={14} fill={AMBER} stroke={AMBER} />
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>4.9</span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
        128 reviews
      </div>
    </HeroWidget>,
  ],
  plumber: () => [
    <HeroWidget key="w1" top="14%" right="5%" delay={0.2}>
      <WidgetTitle>Service Call</WidgetTitle>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>Linda Kemper</div>
      <div
        style={{
          marginTop: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 999,
          background: 'rgba(255,140,50,0.12)',
          fontSize: 11,
          color: AMBER,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: AMBER,
            animation: 'amberPulse 2s ease-in-out infinite',
          }}
        />
        En route
      </div>
    </HeroWidget>,
    <HeroWidget key="w2" bottom="18%" left="6%" delay={0.4} width={160}>
      <WidgetTitle>Today's Jobs</WidgetTitle>
      <div style={WIDGET_VALUE}>7</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <CheckCircle2
            key={i}
            size={11}
            color={i < 3 ? AMBER : 'rgba(255,255,255,0.2)'}
          />
        ))}
      </div>
    </HeroWidget>,
    <HeroWidget key="w3" top="44%" right="3%" delay={0.6} width={140}>
      <WidgetTitle>Revenue Today</WidgetTitle>
      <div style={WIDGET_VALUE}>$840</div>
    </HeroWidget>,
  ],
  realestate: () => [
    <HeroWidget key="w1" top="14%" right="5%" delay={0.2}>
      <WidgetTitle>New Listing</WidgetTitle>
      <div style={WIDGET_VALUE}>$425,000</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
        3 bd · 2 ba · Noord
      </div>
    </HeroWidget>,
    <HeroWidget key="w2" bottom="16%" left="5%" delay={0.4} width={170}>
      <WidgetTitle>Showings Today</WidgetTitle>
      <div style={WIDGET_VALUE}>3</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <Calendar size={12} color={AMBER} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>10am · 2pm · 5pm</span>
      </div>
    </HeroWidget>,
    <HeroWidget key="w3" top="44%" right="3%" delay={0.6} width={170}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 999,
          background: 'rgba(255,140,50,0.14)',
          fontSize: 11,
          color: AMBER,
          fontWeight: 600,
        }}
      >
        <Check size={11} strokeWidth={3} />
        Offer accepted
      </div>
      <div style={{ fontSize: 12, marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>
        142 Palm Ridge
      </div>
    </HeroWidget>,
  ],
  medspa: () => [
    <HeroWidget key="w1" top="14%" right="5%" delay={0.2}>
      <WidgetTitle>Next Appointment</WidgetTitle>
      <div style={{ ...WIDGET_VALUE, fontSize: 18 }}>2:30 PM</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
        Botox refresh
      </div>
    </HeroWidget>,
    <HeroWidget key="w2" bottom="18%" left="5%" delay={0.4} width={150}>
      <WidgetTitle>Booked Today</WidgetTitle>
      <div style={WIDGET_VALUE}>8</div>
    </HeroWidget>,
    <HeroWidget key="w3" top="44%" right="3%" delay={0.6} width={150}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Star size={14} fill={AMBER} stroke={AMBER} />
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>5.0</span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
        Perfect rating
      </div>
    </HeroWidget>,
  ],
  hvac: () => [
    <HeroWidget key="w1" top="14%" right="5%" delay={0.2}>
      <WidgetTitle>Emergency Call</WidgetTitle>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600 }}>89 Sunset Bay</div>
      <div
        style={{
          marginTop: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 999,
          background: 'rgba(255,140,50,0.14)',
          fontSize: 11,
          color: AMBER,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: AMBER,
            animation: 'amberPulse 2s ease-in-out infinite',
          }}
        />
        Dispatched
      </div>
    </HeroWidget>,
    <HeroWidget key="w2" bottom="18%" left="6%" delay={0.4} width={170}>
      <WidgetTitle>AC Units Serviced</WidgetTitle>
      <div style={WIDGET_VALUE}>14</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
        this week
      </div>
    </HeroWidget>,
    <HeroWidget key="w3" top="44%" right="3%" delay={0.6} width={150}>
      <WidgetTitle>Revenue Today</WidgetTitle>
      <div style={WIDGET_VALUE}>$1,240</div>
    </HeroWidget>,
  ],
  roofing: () => [
    <HeroWidget key="w1" top="14%" right="5%" delay={0.2}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 999,
          background: 'rgba(255,140,50,0.14)',
          fontSize: 11,
          color: AMBER,
          fontWeight: 600,
        }}
      >
        <Check size={11} strokeWidth={3} />
        Project complete
      </div>
      <div style={{ fontSize: 13, marginTop: 8, fontWeight: 600 }}>142 Coral Bay Dr</div>
    </HeroWidget>,
    <HeroWidget key="w2" bottom="18%" left="6%" delay={0.4} width={160}>
      <WidgetTitle>Active Projects</WidgetTitle>
      <div style={WIDGET_VALUE}>6</div>
      <MiniChartBars values={[55, 70, 90, 65]} />
    </HeroWidget>,
    <HeroWidget key="w3" top="44%" right="3%" delay={0.6} width={160}>
      <WidgetTitle>This Month</WidgetTitle>
      <div style={WIDGET_VALUE}>$28,500</div>
    </HeroWidget>,
  ],
}

/* ---------- Template wrappers ---------- */

function S2Shell({ businessName, children }) {
  return (
    <div className="s2-root">
      <Style2GlobalCss />
      <Background2 businessName={businessName} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

/* GYM */

export function S2Gym({ config }) {
  return (
    <S2Shell businessName={config.business_name}>
      <S2Nav Icon={Dumbbell} businessName={config.business_name} ctaText="Book Free Trial" />
      <S2Hero
        businessName={config.business_name}
        headline={config.tagline || 'Train hard. Look great. Feel unstoppable.'}
        subhead={`State-of-the-art equipment, expert coaches, and a community that pushes you. Welcome to ${config.business_name}.`}
        primaryCta="Start Free Trial"
        secondaryCta="View Classes"
        widgets={WIDGET_BUILDERS.gym()}
      />
      <S2TrustRow items={['500+ Members', '20+ Classes', '5★ Rated', 'Open 7 Days']} />
      <S2Services services={config.services} Icon={Activity} label="Services" heading="Train your way." />
      <S2Reviews
        items={[
          { quote: 'Lost 20 lbs in 4 months. The coaches actually care.', name: 'Maria S.', role: 'Member · 2 years' },
          { quote: "Best gym I've ever been to. The community is unreal.", name: 'Carlos R.', role: 'Member · 1 year' },
          { quote: 'Classes are fun, equipment is top-notch. 10/10.', name: 'Jenna F.', role: 'Member · 6 months' },
        ]}
      />
      <S2Contact
        heading="Book your free trial."
        subhead="One week, no commitment. Come see why our members love it here."
        cta="Claim My Free Week"
        fields={['name', 'phone']}
      />
      <S2Footer config={config} />
    </S2Shell>
  )
}

export function S2GymDashboard({ config }) {
  return (
    <S2Dashboard
      Icon={Dumbbell}
      businessName={config.business_name}
      sidebarItems={[
        { label: 'Dashboard', icon: LayoutDashboard, active: true },
        { label: 'Members', icon: UsersIcon },
        { label: 'Classes', icon: CalendarRange },
        { label: 'Bookings', icon: Calendar },
        { label: 'Revenue', icon: DollarSign },
        { label: 'Settings', icon: Settings },
      ]}
      stats={[
        { label: 'Members', value: '247', icon: UsersIcon, trend: '+12%' },
        { label: 'Revenue', value: '$12,450', icon: DollarSign, trend: '+8%' },
        { label: 'Classes', value: '18', icon: CalendarRange, trend: '+3' },
        { label: 'Retention', value: '94%', icon: Heart, trend: '+2%' },
      ]}
      sections={[
        {
          title: 'Recent Members',
          render: () => (
            <S2MiniTable
              headers={['Name', 'Plan', 'Joined']}
              rows={[
                ['Maria Santos', 'Pro · 2yr', '2 hours ago'],
                ['Carlos Rivera', 'Elite · 6mo', 'Yesterday'],
                ['Jenna Foster', 'Starter', '2 days ago'],
                ['Marco Bautista', 'Pro · 1yr', '3 days ago'],
                ['Ana Martinez', 'Pro · 4mo', '5 days ago'],
              ]}
            />
          ),
        },
        {
          title: 'Upcoming Classes',
          render: () => (
            <S2MiniTable
              headers={['Class', 'Coach', 'Time', 'Booked']}
              rows={[
                ['HIIT Fundamentals', 'Coach Lopez', 'Today 6:00 PM', '14 / 20'],
                ['Yoga Flow', 'Coach Williams', 'Today 7:30 PM', '12 / 15'],
                ['Strength & Power', 'Coach Diaz', 'Tomorrow 6:00 AM', '9 / 15'],
                ['Boxing 101', 'Coach Kane', 'Tomorrow 7:00 PM', '17 / 20'],
                ['Open Gym Spin', 'Coach Patel', 'Wed 6:00 AM', '8 / 18'],
              ]}
            />
          ),
        },
      ]}
    />
  )
}

/* PLUMBER */

export function S2Plumber({ config }) {
  return (
    <S2Shell businessName={config.business_name}>
      <S2Nav Icon={Wrench} businessName={config.business_name} ctaText="Call Now" />
      <S2Hero
        businessName={config.business_name}
        headline="Fast. Reliable. Done Right."
        subhead={`Licensed plumbers serving ${config.location || 'your area'}. Emergency service, repairs, and installs — done right the first time.`}
        primaryCta={config.phone || 'Call Now'}
        secondaryCta="Request Service"
        widgets={WIDGET_BUILDERS.plumber()}
      />
      <S2TrustRow items={['Licensed & Insured', 'Same Day Service', 'Free Estimates', '5★ Rated']} />
      <S2Services services={config.services} Icon={Wrench} label="Services" heading="Services we offer." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2
              style={{
                fontSize: 'clamp(26px, 4vw, 38px)',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
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
              { Icon: Zap, title: 'Fast Response', text: 'Same-day appointments and 24/7 emergency calls.' },
              { Icon: Award, title: 'Experienced Team', text: 'Licensed pros with decades of combined experience.' },
              { Icon: ShieldCheck, title: 'Guaranteed Work', text: 'Every job comes with our quality guarantee.' },
            ].map((p, i) => (
              <FadeIn key={p.title} delay={i * 0.08}>
                <GlassCard2 style={{ height: '100%' }}>
                  <p.Icon size={20} color={AMBER} />
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 14 }}>{p.title}</div>
                  <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>
                    {p.text}
                  </p>
                </GlassCard2>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <S2Reviews
        items={[
          { quote: 'Showed up in 30 minutes for a burst pipe. Saved my floor.', name: 'Linda K.', role: 'Homeowner' },
          { quote: 'Honest pricing, clean work. Will use again for sure.', name: 'Mike R.', role: 'Apartment Owner' },
          { quote: "Fixed a leak three other plumbers couldn't find. Pros.", name: 'Anna F.', role: 'Restaurant Owner' },
        ]}
      />
      <S2Contact
        heading="Need a plumber today?"
        subhead="Tell us about the problem — we'll call back within 30 minutes."
        cta="Request Service"
        fields={['name', 'phone', 'message']}
      />
      <S2Footer config={config} />
    </S2Shell>
  )
}

export function S2PlumberDashboard({ config }) {
  return (
    <S2Dashboard
      Icon={Wrench}
      businessName={config.business_name}
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
            <S2MiniTable
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
            <S2MiniTable
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

/* REAL ESTATE */

export function S2RealEstate({ config }) {
  const properties = [
    { price: '$350,000', beds: 3, baths: 2, sqft: 1840, location: 'Oranjestad', tag: 'NEW' },
    { price: '$520,000', beds: 4, baths: 3, sqft: 2620, location: 'Palm Beach' },
    { price: '$890,000', beds: 5, baths: 4, sqft: 3950, location: 'Noord', tag: 'LUXURY' },
  ]
  return (
    <S2Shell businessName={config.business_name}>
      <S2Nav Icon={Home} businessName={config.business_name} ctaText="Find Your Home" />
      <S2Hero
        businessName={config.business_name}
        headline={`Find Your Dream Property in ${config.location || 'Aruba'}.`}
        subhead="Curated listings, expert agents, and honest guidance from search to close."
        primaryCta="Search Properties"
        secondaryCta="Browse Listings"
        widgets={WIDGET_BUILDERS.realestate()}
      />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                color: AMBER,
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              Featured Listings
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px, 4.5vw, 44px)',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
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
                <GlassCard2 style={{ padding: 0, overflow: 'hidden' }} hoverEffect={false}>
                  <div
                    style={{
                      height: 180,
                      background:
                        'linear-gradient(135deg, rgba(255,140,50,0.18) 0%, rgba(20,15,8,0.95) 100%)',
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
                          background: AMBER,
                          color: '#0d0a08',
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
                    <Building2 size={56} color="rgba(255,140,50,0.25)" strokeWidth={1.2} />
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: AMBER }}>
                      {p.price}
                    </div>
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
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        fontSize: 13,
                        marginTop: 8,
                      }}
                    >
                      <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {p.location}
                    </div>
                  </div>
                </GlassCard2>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <S2Services services={config.services} Icon={Briefcase} label="Services" heading="How we work with you." />
      <S2TrustRow items={['150+ Properties Sold', '12 Years', '98% Satisfaction', '$50M+ in Sales']} />
      <S2Reviews
        items={[
          { quote: 'Sold our home in 3 weeks above asking. Pros.', name: 'Daniel & Eva', role: 'Sellers · Palm Beach' },
          { quote: 'They guided us through everything as first-time buyers.', name: 'Marco S.', role: 'Buyer · Noord' },
          { quote: "Best agent I've worked with in 20 years of investing.", name: 'Helen R.', role: 'Investor' },
        ]}
      />
      <S2Contact
        heading="Ready to buy or sell?"
        subhead="Tell us what you're looking for. No pressure, ever."
        cta="Get Started"
        fields={['name', 'email', 'phone', 'select']}
      />
      <S2Footer config={config} />
    </S2Shell>
  )
}

export function S2RealEstateDashboard({ config }) {
  return (
    <S2Dashboard
      Icon={Home}
      businessName={config.business_name}
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
            <S2MiniTable
              headers={['Address', 'Price', 'Status', 'Days']}
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
                    background: 'rgba(255,140,50,0.06)',
                    border: '0.5px solid rgba(255,140,50,0.12)',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: AMBER,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
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

/* MED SPA */

export function S2MedSpa({ config }) {
  return (
    <S2Shell businessName={config.business_name}>
      <S2Nav Icon={Sparkles} businessName={config.business_name} ctaText="Book Appointment" />
      <S2Hero
        businessName={config.business_name}
        headline="Reveal Your Best Self."
        subhead="Personalized treatments by board-certified providers. Subtle, beautiful, transformative results."
        primaryCta="Book Free Consultation"
        secondaryCta="View Treatments"
        widgets={WIDGET_BUILDERS.medspa()}
      />
      <S2TrustRow items={['500+ Happy Clients', 'Board Certified', 'Premium Products', '5★ Reviews']} />
      <S2Services services={config.services} Icon={Sparkles} label="Treatments" heading="Tailored to you." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <FadeIn>
            <h2
              style={{
                fontSize: 'clamp(26px, 4vw, 38px)',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              Real results.
            </h2>
          </FadeIn>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 32,
            }}
          >
            {['Before', 'After'].map((label) => (
              <GlassCard2
                key={label}
                hoverEffect={false}
                style={{
                  height: 280,
                  display: 'flex',
                  alignItems: 'flex-end',
                  background:
                    'linear-gradient(135deg, rgba(255,140,50,0.18) 0%, rgba(20,15,8,0.95) 100%)',
                  padding: 18,
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
              </GlassCard2>
            ))}
          </div>
        </div>
      </section>
      <S2Reviews
        items={[
          { quote: 'I finally feel like myself again. Subtle, perfect work.', name: 'Maya L.', role: 'Botox · 2 years' },
          { quote: 'Glowing skin in 2 sessions. The team is amazing.', name: 'Rachel D.', role: 'Laser · 6 months' },
          { quote: 'They listened to what I wanted and delivered exactly that.', name: 'Sofia G.', role: 'Body Contouring' },
        ]}
      />
      <S2Contact
        heading="Ready to start your journey?"
        subhead="Free consultation, zero pressure. We'll create a plan tailored to you."
        cta="Book Consultation"
        fields={['name', 'email', 'phone', 'treatment']}
      />
      <S2Footer config={config} />
    </S2Shell>
  )
}

export function S2MedSpaDashboard({ config }) {
  return (
    <S2Dashboard
      Icon={Sparkles}
      businessName={config.business_name}
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
            <S2MiniTable
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
          render: () => (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 14,
                height: 160,
                paddingTop: 8,
              }}
            >
              {[60, 78, 52, 88, 70, 92].map((h, i) => (
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
                      background:
                        'linear-gradient(180deg, rgba(255,140,50,0.85) 0%, rgba(255,140,50,0.3) 100%)',
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

/* HVAC */

export function S2Hvac({ config }) {
  return (
    <S2Shell businessName={config.business_name}>
      <S2Nav Icon={Wind} businessName={config.business_name} ctaText="Get Free Quote" />
      <S2Hero
        businessName={config.business_name}
        headline="Keep Your Home Comfortable Year-Round."
        subhead="Cooling, heating, and maintenance from licensed pros. Free estimates and emergency service when you need it."
        primaryCta="Schedule Service"
        secondaryCta="Get Free Quote"
        widgets={WIDGET_BUILDERS.hvac()}
      />
      <S2TrustRow items={['Licensed & Certified', '24/7 Emergency', 'Free Estimates', '10 Year Warranty']} />
      <S2Services services={config.services} Icon={Wind} label="Services" heading="Full-service HVAC." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2
              style={{
                fontSize: 'clamp(26px, 4vw, 38px)',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
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
              { num: '01', title: 'Call Us', text: "Tell us what's wrong over the phone or online." },
              { num: '02', title: 'We Diagnose', text: 'Same-day diagnosis with a clear, upfront estimate.' },
              { num: '03', title: 'Problem Solved', text: 'Most repairs done in one visit. Guaranteed.' },
            ].map((s, i) => (
              <FadeIn key={s.num} delay={i * 0.08}>
                <GlassCard2>
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 800,
                      color: 'rgba(255,140,50,0.25)',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {s.num}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 12 }}>{s.title}</div>
                  <p style={{ color: TEXT_MUTED, fontSize: 14, marginTop: 8 }}>{s.text}</p>
                </GlassCard2>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '40px 24px 60px', background: '#0f0c09' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <FadeIn>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                color: AMBER,
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              Brands We Service
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'center',
              }}
            >
              {['Carrier', 'Trane', 'Lennox', 'Rheem', 'Goodman', 'York', 'Daikin', 'Mitsubishi'].map(
                (b) => (
                  <span
                    key={b}
                    style={{
                      padding: '8px 16px',
                      border: '0.5px solid rgba(255,140,50,0.18)',
                      borderRadius: 999,
                      background: 'rgba(255,140,50,0.05)',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: 500,
                    }}
                  >
                    {b}
                  </span>
                ),
              )}
            </div>
          </FadeIn>
        </div>
      </section>
      <S2Reviews
        items={[
          { quote: 'Replaced our 15-year-old AC in a day. Cool and quiet now.', name: 'Tom B.', role: 'Homeowner' },
          { quote: 'Tech showed up on time, fair price, no upsell games.', name: 'Priya M.', role: 'Office Manager' },
          { quote: 'They saved us during a heatwave. Lifesavers.', name: 'Jorge L.', role: 'Restaurant Owner' },
        ]}
      />
      <S2Contact
        heading="Need HVAC service?"
        subhead="Tell us what's going on. We'll be in touch fast."
        cta="Request Service"
        fields={['name', 'phone', 'message', 'time']}
      />
      <S2Footer config={config} />
    </S2Shell>
  )
}

export function S2HvacDashboard({ config }) {
  return (
    <S2Dashboard
      Icon={Wind}
      businessName={config.business_name}
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
            <S2MiniTable
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
            <S2MiniTable
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

/* ROOFING */

export function S2Roofing({ config }) {
  return (
    <S2Shell businessName={config.business_name}>
      <S2Nav Icon={Hammer} businessName={config.business_name} ctaText="Get Free Inspection" />
      <S2Hero
        businessName={config.business_name}
        headline="Protect Your Home From the Top Down."
        subhead="New roofs, repairs, and inspections done by experienced crews. Built to last, backed by warranty."
        primaryCta="Schedule Inspection"
        secondaryCta="View Our Work"
        widgets={WIDGET_BUILDERS.roofing()}
      />
      <S2TrustRow items={['20+ Years Experience', 'Licensed & Insured', '5★ Rated', 'Financing Available']} />
      <S2Services services={config.services} Icon={Hammer} label="Services" heading="Roofing services." />
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2
              style={{
                fontSize: 'clamp(26px, 4vw, 38px)',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
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
              { num: '01', title: 'Free Inspection', text: "Detailed assessment of your roof's condition." },
              { num: '02', title: 'Custom Quote', text: 'Transparent pricing tailored to your home.' },
              { num: '03', title: 'Expert Installation', text: 'Skilled crews using premium materials.' },
              { num: '04', title: 'Final Walkthrough', text: "We don't leave until you're happy." },
            ].map((s, i) => (
              <FadeIn key={s.num} delay={i * 0.08}>
                <GlassCard2>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: 'rgba(255,140,50,0.25)',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {s.num}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>{s.title}</div>
                  <p style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 8 }}>{s.text}</p>
                </GlassCard2>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <section style={{ padding: '40px 24px 60px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <FadeIn>
            <h2
              style={{
                fontSize: 'clamp(24px, 3.6vw, 34px)',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
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
                <GlassCard2
                  hoverEffect={false}
                  style={{
                    aspectRatio: '4 / 3',
                    background:
                      'linear-gradient(135deg, rgba(255,140,50,0.18) 0%, rgba(20,15,8,0.95) 100%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: 'rgba(255,255,255,0.75)',
                  }}
                >
                  Completed Project {n}
                </GlassCard2>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      <FadeIn>
        <section style={{ padding: '60px 24px' }}>
          <div
            style={{
              maxWidth: 880,
              margin: '0 auto',
              borderRadius: 20,
              padding: '2.5rem',
              textAlign: 'center',
              background: 'rgba(255,140,50,0.06)',
              border: '0.5px solid rgba(255,140,50,0.25)',
              boxShadow: '0 0 60px rgba(220,100,30,0.1)',
            }}
          >
            <h3
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: AMBER,
              }}
            >
              Don't let cost stop you.
            </h3>
            <p
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 15,
                marginTop: 10,
                lineHeight: 1.6,
              }}
            >
              Flexible payment plans available. Roof your home now, pay over time.
            </p>
            <button
              type="button"
              className="s2-amber-btn"
              style={{ marginTop: 22, padding: '12px 28px', fontSize: 14 }}
            >
              Learn More
            </button>
          </div>
        </section>
      </FadeIn>
      <S2Reviews
        items={[
          { quote: 'Brand new roof in 3 days. Crew was professional and clean.', name: 'Mark T.', role: 'Homeowner' },
          { quote: "Caught hail damage I didn't even know was there. Saved me thousands.", name: 'Lina P.', role: 'Homeowner' },
          { quote: 'Honest estimate, kept their word, did the job right.', name: 'Vince A.', role: 'Property Manager' },
        ]}
      />
      <S2Contact
        heading="Get your free inspection today."
        subhead="Tell us about your roof. We'll come take a look at no cost."
        cta="Request Inspection"
        fields={['name', 'phone', 'address', 'message']}
      />
      <S2Footer config={config} />
    </S2Shell>
  )
}

export function S2RoofingDashboard({ config }) {
  return (
    <S2Dashboard
      Icon={Hammer}
      businessName={config.business_name}
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
            <S2MiniTable
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
            <S2MiniTable
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

/* ---------- Routing map ---------- */

export const STYLE2_RENDERERS = {
  gym: { Website: S2Gym, Dashboard: S2GymDashboard },
  plumber: { Website: S2Plumber, Dashboard: S2PlumberDashboard },
  realestate: { Website: S2RealEstate, Dashboard: S2RealEstateDashboard },
  medspa: { Website: S2MedSpa, Dashboard: S2MedSpaDashboard },
  hvac: { Website: S2Hvac, Dashboard: S2HvacDashboard },
  roofing: { Website: S2Roofing, Dashboard: S2RoofingDashboard },
}
