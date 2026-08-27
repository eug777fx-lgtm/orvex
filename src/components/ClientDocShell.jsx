// Shared shell + form primitives for the public client-facing document pages
// (/client/proposal/:token and /client/invoice/:token). Branded Lithos Labs,
// mobile-first, completely outside the CRM auth wall.

export const shellStyles = {
  page: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  container: { maxWidth: 780, margin: '0 auto', padding: '0 20px 80px' },
  card: {
    background: '#111',
    border: '1px solid #2a2a2a',
    borderRadius: 16,
    padding: 24,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '13px 15px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: 16, // ≥16px prevents iOS zoom-on-focus
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    width: '100%',
    background: '#fff',
    color: '#000',
    fontSize: 16,
    fontWeight: 650,
    padding: '16px 0',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
  },
}

export function ClientHeader({ kicker }) {
  return (
    <header
      style={{
        padding: '26px 20px',
        borderBottom: '1px solid #1c1c1c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 780,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img
          src="/lithos-logo.png"
          alt=""
          style={{ width: 22, height: 22, objectFit: 'contain' }}
          onError={(e) => (e.target.style.display = 'none')}
        />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>Lithos</span>
        <span style={{ fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.55)' }}>Labs</span>
      </div>
      {kicker && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 650,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          {kicker}
        </span>
      )}
    </header>
  )
}

// Friendly full-page state (expired / revoked / not found / error)
export function ClientStateScreen({ title, message }) {
  return (
    <div style={shellStyles.page}>
      <ClientHeader />
      <div style={{ ...shellStyles.container, paddingTop: 90, textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 18 }}>·</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{title}</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
          {message}
        </p>
        <p style={{ marginTop: 26, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
          Questions? Contact Lithos Labs at{' '}
          <a href="mailto:eug777fx@gmail.com" style={{ color: '#fff' }}>
            eug777fx@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}

export const STATE_COPY = {
  not_found: {
    title: 'Document not found',
    message: 'This link is not valid. It may have been replaced with a newer one — please use the most recent link you received from Lithos Labs.',
  },
  revoked: {
    title: 'Link no longer active',
    message: 'This link has been deactivated. Please reach out to Lithos Labs and we will send you a fresh one.',
  },
  expired: {
    title: 'This link has expired',
    message: 'The document is past its validity window. Contact Lithos Labs to receive an updated version.',
  },
  error: {
    title: 'Something went wrong',
    message: 'We could not load this document right now. Please try again in a moment.',
  },
}
