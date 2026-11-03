import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Activity, ItemType, VaultItem } from '../types'

export const uid = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}

export function relativeTime(ts?: number | null) {
  if (!ts) return 'never'
  const diff = Date.now() - ts
  const sec = Math.round(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  const week = Math.round(day / 7)
  if (week < 5) return `${week}w ago`
  const month = Math.round(day / 30)
  if (month < 12) return `${month}mo ago`
  return `${Math.round(day / 365)}y ago`
}

export function formatDate(ts?: number | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts: number) {
  return `${formatDate(ts)} · ${formatTime(ts)}`
}

export function dayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function hostOf(url?: string) {
  if (!url) return ''
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0]
  }
}

export function normaliseUrl(url?: string) {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function itemSubtitle(item: VaultItem) {
  const f = item.fields || {}
  switch (item.type) {
    case 'login':
      return f.username || hostOf(f.url) || 'Login'
    case 'apikey':
      return [f.keyId, f.environment].filter(Boolean).join(' · ') || 'API credential'
    case 'card': {
      const digits = (f.number || '').replace(/\s+/g, '')
      return digits ? `${f.brand || 'Card'} •••• ${digits.slice(-4)}` : 'Payment card'
    }
    case 'note':
      return (f.body || '').split('\n')[0]?.slice(0, 64) || 'Secure note'
    case 'identity':
      return f.email || f.fullName || 'Identity'
    default:
      return item.type
  }
}

export const typeCount = (items: VaultItem[], type: ItemType) =>
  items.filter((item) => item.type === type).length

export function fuzzyScore(query: string, text: string) {
  const q = query.trim().toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  let qi = 0
  let score = 0
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) {
      score += 2
      qi += 1
    }
  }
  return qi === q.length ? score : 0
}

export function searchItems(items: VaultItem[], query: string) {
  const q = query.trim()
  if (!q) return items
  return items
    .map((item) => {
      const fields = item.fields || {}
      const searchable = [
        item.name,
        item.tags.join(' '),
        fields.username,
        fields.url,
        fields.keyId,
        fields.environment,
        fields.email,
        fields.fullName,
        fields.body,
        fields.service,
      ]
        .filter(Boolean)
        .join(' ')
      return { item, score: fuzzyScore(q, searchable) }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
}

export function activityLabel(activity: Activity) {
  switch (activity.kind) {
    case 'created':
      return 'created'
    case 'updated':
      return 'updated'
    case 'deleted':
      return 'deleted'
    case 'copied':
      return 'copied'
    case 'favorite':
      return 'favorited'
    case 'unlocked':
      return 'unlocked'
    case 'imported':
      return 'imported'
    case 'generated':
      return 'generated'
    case 'autofilled':
      return 'autofilled'
    default:
      return 'touched'
  }
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Burning the midnight oil'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function spotlightMove(event: ReactMouseEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
}

export function primaryField(item: VaultItem) {
  switch (item.type) {
    case 'login':
      return { key: 'password', label: 'Password', sensitive: true }
    case 'apikey':
      return { key: 'secret', label: 'API secret', sensitive: true }
    case 'card':
      return { key: 'number', label: 'Card number', sensitive: true }
    case 'note':
      return { key: 'body', label: 'Note', sensitive: true }
    default:
      return { key: 'email', label: 'Email', sensitive: false }
  }
}

export function accentColor(accent: string) {
  switch (accent) {
    case 'iris':
      return '#b7a4ff'
    case 'amber':
      return '#ffd39b'
    case 'rose':
      return '#ffb3c7'
    default:
      return '#9ff5d2'
  }
}
