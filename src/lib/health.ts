import type { VaultItem } from '../types'
import { TYPES } from './fields'
import { scorePassword, type PasswordStrength } from './strength'

export interface ItemHealth {
  item: VaultItem
  strength: PasswordStrength | null
  reused: boolean
  old: boolean
  breachCount: number
}

export interface VaultHealth {
  score: number
  grade: string
  label: string
  total: number
  weak: number
  reused: number
  old: number
  breached: number
  missing2fa: number
  perItem: Record<string, ItemHealth>
  recommendations: string[]
}

const YEAR = 365 * 24 * 60 * 60 * 1000

export function computeHealth(
  items: VaultItem[],
  breaches: Record<string, number> = {},
): VaultHealth {
  const auditable = (type: VaultItem['type']) => type === 'login' || type === 'apikey'
  const secretMap = new Map<string, string[]>()
  for (const item of items) {
    if (!auditable(item.type)) continue
    const secretKey = TYPES[item.type].secretKey
    const secret = secretKey ? item.fields[secretKey] : ''
    if (secret) {
      const list = secretMap.get(secret) || []
      list.push(item.id)
      secretMap.set(secret, list)
    }
  }

  const perItem: Record<string, ItemHealth> = {}
  let weak = 0
  let reused = 0
  let old = 0
  let breached = 0
  let missing2fa = 0

  for (const item of items) {
    const secretKey = TYPES[item.type].secretKey
    const secret = auditable(item.type) && secretKey ? item.fields[secretKey] : ''
    const strength = secret ? scorePassword(secret) : null
    const isReused = Boolean(secret && (secretMap.get(secret)?.length || 0) > 1)
    const isOld = Boolean(secret && item.updatedAt < Date.now() - YEAR)
    const breachCount = breaches[item.id] || 0
    if (strength && strength.score <= 1) weak += 1
    if (isReused) reused += 1
    if (isOld) old += 1
    if (breachCount > 0) breached += 1
    if (item.type === 'login' && !item.fields.totp) missing2fa += 1
    perItem[item.id] = { item, strength, reused: isReused, old: isOld, breachCount }
  }

  const secretItems = items.filter(
    (item) => auditable(item.type) && Boolean(item.fields[TYPES[item.type].secretKey || '']),
  )
  let score = 100
  score -= weak * 9
  score -= reused * 11
  score -= old * 2
  score -= breached * 16
  if (items.length === 0) score = 0
  else if (secretItems.length === 0) score = 82
  score = Math.max(0, Math.min(100, Math.round(score)))

  const grade =
    items.length === 0
      ? '—'
      : score >= 92
        ? 'A+'
        : score >= 85
          ? 'A'
          : score >= 76
            ? 'B'
            : score >= 64
              ? 'C'
              : score >= 50
                ? 'D'
                : 'E'
  const label =
    items.length === 0
      ? 'Ready'
      : score >= 92
        ? 'Fortress'
        : score >= 85
          ? 'Excellent'
          : score >= 76
            ? 'Healthy'
            : score >= 64
              ? 'Needs care'
              : score >= 50
                ? 'At risk'
                : 'Fragile'

  const recommendations: string[] = []
  if (items.length === 0) {
    recommendations.push('Add your first secret and Aegis will start watching over it.')
  } else {
    if (weak) recommendations.push(`Replace ${weak} weak ${weak === 1 ? 'password' : 'passwords'}.`)
    if (reused)
      recommendations.push(`Unshare ${reused} reused ${reused === 1 ? 'password' : 'passwords'}.`)
    if (breached)
      recommendations.push(
        `${breached} ${breached === 1 ? 'secret appears' : 'secrets appear'} in a breach.`,
      )
    if (old)
      recommendations.push(`Rotate ${old} ${old === 1 ? 'credential' : 'credentials'} older than a year.`)
    if (!recommendations.length) recommendations.push('Everything looks sharp. Keep it that way.')
    if (missing2fa > 0 && recommendations.length < 3)
      recommendations.push(
        `Add 2FA codes to ${missing2fa} login${missing2fa === 1 ? '' : 's'} for extra depth.`,
      )
  }

  return {
    score,
    grade,
    label,
    total: items.length,
    weak,
    reused,
    old,
    breached,
    missing2fa,
    perItem,
    recommendations,
  }
}
