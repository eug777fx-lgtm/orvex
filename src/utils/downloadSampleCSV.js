const HEADERS = [
  'company_name',
  'owner_name',
  'phone',
  'email',
  'location',
  'industry',
  'website_url',
  'notes',
]

const ROWS = [
  [
    'Aruba Plumbing Co',
    'John Smith',
    '+297 123 4567',
    'john@arubaplumbing.com',
    'Oranjestad, Aruba',
    'plumber',
    '',
    'Found on Google Maps, no website',
  ],
  [
    'Island Electric',
    'Maria Croes',
    '+297 987 6543',
    '',
    'Noord, Aruba',
    'electrician',
    'http://islandelectric.aw',
    'Has website but looks outdated',
  ],
]

function escapeCell(value) {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsv() {
  const lines = [HEADERS.join(',')]
  for (const row of ROWS) {
    lines.push(row.map(escapeCell).join(','))
  }
  return lines.join('\n') + '\n'
}

export function downloadSampleCSV() {
  const csv = buildCsv()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sample_leads.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default downloadSampleCSV
