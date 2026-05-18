import { useState } from 'react'

export default function AppLogin({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Enter email and password'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rep_login', email, password })
      })
      const data = await res.json()
      if (data.success && data.rep) {
        onAuth(data.rep)
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch(e) {
      setError('Connection error — try again')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!name || !email || !password || !inviteCode) { setError('Fill all fields'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rep_register', name, email, password, invite_code: inviteCode })
      })
      const data = await res.json()
      if (data.success && data.rep) {
        onAuth(data.rep)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch(e) {
      setError('Connection error — try again')
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '0.5px solid rgba(255,255,255,0.1)',
    color: '#F5F5F2', fontSize: 14, outline: 'none',
    marginBottom: 12, boxSizing: 'border-box'
  }
  const btn = {
    width: '100%', padding: 12, borderRadius: 8,
    background: '#ffffff', color: '#000000',
    fontWeight: 600, fontSize: 14, border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1, marginTop: 4
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F2', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Lithos<span style={{ fontWeight: 300, color: 'rgba(194,181,155,0.7)' }}>Labs</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(242,237,228,0.4)' }}>
            {mode === 'login' ? 'Sign in to your dashboard' : 'Create your account'}
          </div>
        </div>

        <div style={{ background: '#111113', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28 }}>
          {mode === 'register' && (
            <input style={inp} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input style={inp} placeholder="Email address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inp} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleLogin()} />
          {mode === 'register' && (
            <input style={inp} placeholder="Invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
          )}
          {error && <div style={{ fontSize: 12, color: 'rgba(248,113,113,0.8)', marginBottom: 8 }}>{error}</div>}
          <button style={btn} onClick={mode === 'login' ? handleLogin : handleRegister}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'New team member? Register with invite code' : 'Already have an account? Sign in'}
          </div>
        </div>
      </div>
    </div>
  )
}
