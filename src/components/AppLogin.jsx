import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import Background from './Background'
import { workflowApi } from '../lib/auth'

const wrapStyle = {
  position: 'fixed',
  inset: 0,
  background: '#0B0B0D',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  padding: '2rem',
}

const cardStyle = {
  position: 'relative',
  width: '100%',
  maxWidth: 380,
  background: '#111113',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
  padding: 32,
  zIndex: 1,
  boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
}

const labelStyle = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 8,
  display: 'block',
  letterSpacing: '0.02em',
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '12px 14px',
  color: '#ffffff',
  fontSize: 14,
  outline: 'none',
  marginBottom: 14,
  fontFamily: 'inherit',
  transition: 'border-color 0.15s ease',
}

const primaryButton = {
  width: '100%',
  marginTop: 6,
  background: '#ffffff',
  color: '#000000',
  border: 'none',
  borderRadius: 12,
  padding: '13px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

export default function AppLogin({ onAuthed }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e?.preventDefault?.()
    setError('')
    if (busy) return
    setBusy(true)
    try {
      if (mode === 'login') {
        const data = await workflowApi('rep_login', {
          method: 'POST',
          body: { email: email.trim(), password },
        })
        if (!data?.success || !data?.rep) {
          setError(data?.error || 'Invalid email or password')
          return
        }
        finish(data.rep)
      } else {
        const data = await workflowApi('rep_register', {
          method: 'POST',
          body: {
            name: name.trim(),
            email: email.trim(),
            password,
            invite_code: inviteCode.trim(),
          },
        })
        if (!data?.success || !data?.rep) {
          setError(data?.error || 'Registration failed')
          return
        }
        finish(data.rep)
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function finish(rep) {
    const auth = {
      id: rep.id,
      name: rep.name,
      email: rep.email,
      role: rep.role === 'admin' ? 'admin' : 'rep',
    }
    localStorage.setItem('lithos_auth', JSON.stringify(auth))
    onAuthed(auth)
  }

  return (
    <div style={wrapStyle}>
      <Background />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 28,
          zIndex: 1,
        }}
      >
        <img
          src="/lithos-logo.png"
          alt="Lithos Labs"
          style={{
            width: 30,
            height: 30,
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            opacity: 0.92,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 19, color: '#fff', letterSpacing: '-0.3px' }}>
            Lithos
          </span>
          <span
            style={{
              fontWeight: 300,
              fontSize: 19,
              color: 'rgba(194,181,155,0.6)',
              letterSpacing: '-0.3px',
            }}
          >
            Labs
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={cardStyle}
      >
        <h1 style={{ fontSize: 19, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
          Welcome to Lithos Labs
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, marginBottom: 24 }}>
          {mode === 'login'
            ? 'Sign in to your workspace'
            : 'Register with your team invite code'}
        </p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label style={labelStyle} htmlFor="al-name">
                Full name
              </label>
              <input
                id="al-name"
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </>
          )}

          <label style={labelStyle} htmlFor="al-email">
            Email
          </label>
          <input
            id="al-email"
            type="email"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@lithoslabs.com"
            autoComplete="email"
          />

          <label style={labelStyle} htmlFor="al-password">
            Password
          </label>
          <input
            id="al-password"
            type="password"
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {mode === 'register' && (
            <>
              <label style={labelStyle} htmlFor="al-invite">
                Invite code
              </label>
              <input
                id="al-invite"
                style={inputStyle}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Team invite code"
              />
            </>
          )}

          <motion.button
            type="submit"
            style={{ ...primaryButton, opacity: busy ? 0.7 : 1 }}
            whileHover={{ scale: busy ? 1 : 1.01 }}
            whileTap={{ scale: busy ? 1 : 0.98 }}
            disabled={busy}
          >
            {busy ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <>
                {mode === 'login' ? 'Login' : 'Create account'}
                <ArrowRight size={15} strokeWidth={2.5} />
              </>
            )}
          </motion.button>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                color: '#ff6b6b',
                fontSize: 12.5,
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              {error}
            </motion.div>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
          style={{
            width: '100%',
            marginTop: 20,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 12.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {mode === 'login'
            ? 'New team member? Register with invite code'
            : 'Already have an account? Sign in'}
        </button>
      </motion.div>
    </div>
  )
}
