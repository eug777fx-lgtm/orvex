import { useMemo, useState } from 'react'
import { Copy, Mail } from 'lucide-react'
import { Modal, Button, TogglePill } from './ui'
import { S } from './shared'
import { generateOutreach } from '../../lib/intelOutreach'

const FORMATS = [
  ['callNotes', 'Cold call notes'],
  ['email', 'Email'],
  ['sms', 'SMS'],
  ['followUp', 'Follow-up'],
]

function asText(o, fmt) {
  const v = o[fmt]
  if (typeof v === 'string') return v
  return `Subject: ${v.subject}\n\n${v.body}`
}

export default function OutreachModal({ open, onClose, businesses, sender, catalog, onCopied }) {
  const [fmt, setFmt] = useState('callNotes')
  const [idx, setIdx] = useState(0)
  const [edits, setEdits] = useState({})
  const list = useMemo(() => businesses || [], [businesses])
  const current = list[Math.min(idx, list.length - 1)]
  const generated = useMemo(() => (current ? generateOutreach(current, { sender, catalog }) : null), [current, sender, catalog])
  const editKey = `${current?.id}:${fmt}`
  const text = edits[editKey] ?? (generated ? asText(generated, fmt) : '')
  const setText = (v) => setEdits((e) => ({ ...e, [editKey]: v }))

  if (!current) return null

  const copyAll = async () => {
    const all = list
      .map((b) => `### ${b.business_name}${b.phone ? ` (${b.phone})` : ''}\n${asText(generateOutreach(b, { sender, catalog }), fmt)}`)
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(all)
      onCopied?.(`Copied ${list.length} messages`)
    } catch {
      onCopied?.('Copy failed. Select the text and copy manually.', 'error')
    }
  }

  const mailHref =
    fmt === 'email' || fmt === 'followUp'
      ? (() => {
          const [first, ...rest] = text.split('\n')
          const subject = first.replace(/^Subject:\s*/, '')
          const body = rest.join('\n').replace(/^\n+/, '')
          return `mailto:${current.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        })()
      : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={list.length > 1 ? `Outreach for ${list.length} businesses` : `Outreach for ${current.business_name}`}
      width={680}
      footer={
        <>
          {list.length > 1 && <Button onClick={copyAll}>Copy all ({list.length})</Button>}
          {mailHref && (
            <Button onClick={() => { window.location.href = mailHref }}>
              <Mail size={13} /> Open in mail app
            </Button>
          )}
          <Button
            variant="solid"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text)
                onCopied?.('Copied to clipboard')
              } catch {
                onCopied?.('Copy failed. Select the text and copy manually.', 'error')
              }
            }}
          >
            <Copy size={13} /> Copy
          </Button>
        </>
      }
    >
      {list.length > 1 && (
        <select style={{ ...S.select, marginBottom: 12 }} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
          {list.map((b, i) => (
            <option key={b.id} value={i}>
              {b.business_name}
            </option>
          ))}
        </select>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {FORMATS.map(([k, l]) => (
          <TogglePill key={k} active={fmt === k} onClick={() => setFmt(k)}>
            {l}
          </TogglePill>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={fmt === 'sms' ? 5 : 16}
        style={{ ...S.input, resize: 'vertical', lineHeight: 1.55, fontSize: 13, whiteSpace: 'pre-wrap' }}
      />
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 10, lineHeight: 1.5 }}>
        Built only from verified data (business profile and observed website signals). Review before sending.
        {fmt === 'sms' &&
          ' Only text numbers you are permitted to message. In the US, marketing texts to mobile numbers generally require prior written consent (TCPA); always honor STOP requests.'}
        {fmt !== 'sms' && !current.email && (fmt === 'email' || fmt === 'followUp') && ' No verified email is on file for this business.'}
      </div>
    </Modal>
  )
}
