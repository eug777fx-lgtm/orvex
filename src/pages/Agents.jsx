// Agents · Mission Control. Mission Control runs on your Mac (http://127.0.0.1:4777)
// and watches every Claude Code session there. This page embeds it inside the CRM.
// The CRM never sees your Claude data: the browser talks to your Mac directly.
import { useCallback, useEffect, useState } from 'react'
import { Power, RefreshCw, ExternalLink } from 'lucide-react'
import PageShell from '../components/PageShell'

const TOKEN_KEY = 'lx_mc_token'
const PORT_KEY = 'lx_mc_port'
const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k) } catch { /* ignore */ } }

export default function Agents() {
  const [token, setToken] = useState(() => read(TOKEN_KEY))
  const [port] = useState(() => read(PORT_KEY) || '4777')
  const [state, setState] = useState('checking') // checking | online | offline
  const [paste, setPaste] = useState('')
  const base = `http://127.0.0.1:${port}`

  // Mission Control's "Connect to Lithos CRM" button lands here with #mc=<token>
  useEffect(() => {
    const m = /[#&]mc=([a-f0-9]{20,})/.exec(window.location.hash)
    if (m) {
      write(TOKEN_KEY, m[1])
      setToken(m[1])
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const check = useCallback(async () => {
    try {
      await fetch(`${base}/mark.png?ping=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' })
      setState('online')
    } catch {
      setState('offline')
    }
  }, [base])

  useEffect(() => {
    check()
    const t = setInterval(() => state !== 'online' && check(), 5000)
    return () => clearInterval(t)
  }, [check, state])

  const connected = state === 'online' && token

  return (
    <PageShell>
      {connected ? (
        <iframe
          className="lx-embed"
          title="Mission Control"
          src={`${base}/?embed=1#t=${token}`}
          allow="local-network-access; clipboard-write"
        />
      ) : (
        <div style={{ maxWidth: 672, margin: '8vh auto 0', padding: '0 16px' }}>
          <h1 className="lx-h1">Mission <span className="lx-serif" style={{ fontSize: 34 }}>Control</span></h1>
          <div className="lx-sub" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Every Claude Code agent working on this Mac, live: what each one is doing, the files it changes, what it costs, and the actions waiting for your approval.
          </div>

          <div className="lx-panel" style={{ marginTop: 26, padding: 22 }}>
            {state === 'checking' && <div className="lx-sub" style={{ margin: 0 }}>Looking for Mission Control on this Mac…</div>}

            {state === 'offline' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}><Power size={16} />Mission Control is not running</div>
                <ol style={{ margin: '14px 0 0 18px', color: 'rgba(255,255,255,0.65)', fontSize: 13.5, lineHeight: 1.9 }}>
                  <li>Open <b style={{ color: '#fff', fontWeight: 600 }}>Documents › Orvex Systems › mission-control</b></li>
                  <li>Double click <b style={{ color: '#fff', fontWeight: 600 }}>Mission Control.command</b> and keep that window open</li>
                  <li>This page connects on its own a few seconds later</li>
                </ol>
                <div className="lx-sub" style={{ marginTop: 14 }}>It only works on the Mac where Mission Control runs, since that is where your agents are.</div>
                <button className="lx-btn" style={{ marginTop: 16 }} onClick={check}><RefreshCw size={14} />Check again</button>
              </>
            )}

            {state === 'online' && !token && (
              <>
                <div style={{ fontWeight: 600 }}>Mission Control is running. Connect it once.</div>
                <div className="lx-sub" style={{ lineHeight: 1.7 }}>
                  In Mission Control open <b style={{ color: '#fff', fontWeight: 600 }}>System</b> and press <b style={{ color: '#fff', fontWeight: 600 }}>Connect to Lithos CRM</b>. Or paste the key from <code>npm run url</code> below.
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <a className="lx-btn primary" href={`${base}/`} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open Mission Control</a>
                  <input value={paste} onChange={(e) => setPaste(e.target.value.trim())} placeholder="or paste the key"
                    style={{ flex: 1, minWidth: 0, height: 34, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: '#000', color: '#fff', padding: '0 12px', fontFamily: 'inherit' }} />
                  <button className="lx-btn" disabled={!/^[a-f0-9]{20,}$/.test(paste.replace(/.*t=/, ''))}
                    onClick={() => { const k = paste.replace(/.*t=/, ''); write(TOKEN_KEY, k); setToken(k) }}>Connect</button>
                </div>
              </>
            )}
          </div>
          {token && state === 'offline' && (
            <button className="lx-btn sm" style={{ marginTop: 12 }} onClick={() => { write(TOKEN_KEY, null); setToken(null) }}>Forget this Mac's key</button>
          )}
        </div>
      )}
    </PageShell>
  )
}
