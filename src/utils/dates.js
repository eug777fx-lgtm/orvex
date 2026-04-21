export function toLocalDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function sameDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function dateKey(d) {
  if (!d) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function todayKey() {
  return dateKey(startOfDay())
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatDueLabel(value) {
  const d = toLocalDate(value)
  if (!d) return ''
  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  const yesterday = addDays(today, -1)
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, tomorrow)) return 'Tomorrow'
  if (sameDay(d, yesterday)) return 'Yesterday'
  const sameYear = d.getFullYear() === today.getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

export function formatDateGroup(value) {
  const d = toLocalDate(value)
  if (!d) return ''
  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
