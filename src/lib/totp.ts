const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export interface TotpResult {
  code: string
  digits: number
  period: number
  remaining: number
  progress: number
}

export function parseTotp(input?: string): {
  secret: string
  digits: number
  period: number
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'
  issuer?: string
  account?: string
} | null {
  if (!input) return null
  const raw = input.trim()
  if (!raw) return null

  if (/^otpauth:\/\//i.test(raw)) {
    try {
      const url = new URL(raw)
      const params = url.searchParams
      const secret = (params.get('secret') || '').replace(/\s+/g, '').toUpperCase()
      if (!secret) return null
      const digits = Number(params.get('digits') || 6)
      const period = Number(params.get('period') || 30)
      const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase()
      return {
        secret,
        digits: [6, 7, 8].includes(digits) ? digits : 6,
        period: Number.isFinite(period) && period >= 10 ? period : 30,
        algorithm:
          algorithm === 'SHA256' ? 'SHA-256' : algorithm === 'SHA512' ? 'SHA-512' : 'SHA-1',
        issuer: params.get('issuer') || url.hostname || undefined,
        account: decodeURIComponent(url.pathname.replace(/^\/+/, '')) || undefined,
      }
    } catch {
      return null
    }
  }

  const secret = raw.replace(/[\s-]+/g, '').toUpperCase()
  if (!/^[A-Z2-7]+=*$/.test(secret) || secret.replace(/=+$/, '').length < 8) return null
  return { secret, digits: 6, period: 30, algorithm: 'SHA-1' }
}

function base32Decode(input: string) {
  const clean = input.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = ALPHABET.indexOf(char)
    if (index === -1) continue
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

function bufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function generateTotp(input: string, now = Date.now()): Promise<TotpResult | null> {
  const parsed = parseTotp(input)
  if (!parsed) return null
  const secretBytes = base32Decode(parsed.secret)
  if (!secretBytes.length) return null

  const counter = Math.floor(now / 1000 / parsed.period)
  const message = new Uint8Array(8)
  const view = new DataView(message.buffer)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter % 2 ** 32)

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: parsed.algorithm },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, message)
  const hex = bufferToHex(signature)
  const offset = parseInt(hex.slice(-1), 16)
  const binary =
    (parseInt(hex.slice(offset * 2, offset * 2 + 8), 16) & 0x7fffffff) %
    10 ** parsed.digits
  const code = String(binary).padStart(parsed.digits, '0')
  const elapsed = (now / 1000) % parsed.period
  return {
    code,
    digits: parsed.digits,
    period: parsed.period,
    remaining: Math.ceil(parsed.period - elapsed),
    progress: 1 - elapsed / parsed.period,
  }
}

export function formatTotp(code: string) {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`
  return code
}
