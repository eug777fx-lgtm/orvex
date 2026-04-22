import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Background from '../components/Background'

const PASSWORD = 'Hebrews11'

const containerStyle = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  padding: '2rem',
}

const orbBase = {
  position: 'absolute',
  borderRadius: '50%',
  pointerEvents: 'none',
  filter: 'blur(80px)',
}

const cardStyle = {
  position: 'relative',
  width: 400,
  maxWidth: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 24,
  padding: '2.5rem',
  boxShadow:
    '0 0 0 0.5px rgba(255,255,255,0.05), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,120,255,0.06)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  zIndex: 1,
}

const logoStyle = {
  fontSize: 28,
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.5px',
}

const subtitleStyle = {
  color: 'rgba(255,255,255,0.35)',
  fontSize: 13,
  marginTop: 4,
}

const dividerStyle = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '1.75rem 0',
  border: 'none',
}

const labelStyle = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 10,
  display: 'block',
  letterSpacing: '0.02em',
}

const inputBaseStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '12px 16px',
  color: '#ffffff',
  fontSize: 15,
  letterSpacing: '2px',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  fontFamily: 'inherit',
}

const buttonStyle = {
  width: '100%',
  marginTop: '1rem',
  background: '#ffffff',
  color: '#080808',
  border: 'none',
  borderRadius: 12,
  padding: '13px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'background 0.15s ease',
}

const errorStyle = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  marginTop: 10,
  textAlign: 'center',
}

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [wrong, setWrong] = useState(false)
  const [focused, setFocused] = useState(false)

  function submit(e) {
    e?.preventDefault?.()
    if (password === 'Hebrews11') {
      localStorage.setItem('cos_auth', 'true')
      setWrong(false)
      onSuccess?.()
    } else {
      setWrong(true)
      setTimeout(() => setWrong(false), 500)
    }
  }

  return (
    <div style={containerStyle}>
      <Background />
      <div
        style={{
          ...orbBase,
          width: 600,
          height: 600,
          top: '-15%',
          left: '-10%',
          background:
            'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          ...orbBase,
          width: 500,
          height: 500,
          bottom: '-10%',
          right: '-10%',
          background:
            'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          animation: 'float 12s ease-in-out infinite reverse',
        }}
      />
      <div
        style={{
          ...orbBase,
          width: 400,
          height: 400,
          top: '10%',
          right: '5%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
          animation: 'float 10s ease-in-out infinite 2s',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: wrong ? [0, -8, 8, -8, 8, 0] : 0,
        }}
        transition={{
          opacity: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          y: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          x: { duration: 0.4 },
        }}
        style={cardStyle}
      >
        <div style={logoStyle}>COS</div>
        <div style={subtitleStyle}>Client Operating System</div>
        <div style={{ ...subtitleStyle, fontSize: 11, marginTop: 2 }}>
          More clients. Less chaos.
        </div>

        <div style={dividerStyle} />

        <form onSubmit={submit}>
          <label style={labelStyle} htmlFor="cos-access">Access Code</label>
          <input
            id="cos-access"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              ...inputBaseStyle,
              borderColor: focused ? 'rgba(99,120,255,0.5)' : 'rgba(255,255,255,0.1)',
              boxShadow: focused ? '0 0 0 3px rgba(99,120,255,0.1)' : 'none',
            }}
          />

          <motion.button
            type="submit"
            style={buttonStyle}
            whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.92)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            Enter
            <ArrowRight size={15} strokeWidth={2.5} />
          </motion.button>

          {wrong && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={errorStyle}
            >
              Incorrect access code
            </motion.div>
          )}
        </form>
      </motion.div>
    </div>
  )
}
