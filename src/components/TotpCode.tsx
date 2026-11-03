import { useEffect, useState } from 'react'
import { Copy, ShieldCheck } from 'lucide-react'
import type { VaultItem } from '../types'
import { formatTotp, generateTotp, parseTotp, type TotpResult } from '../lib/totp'
import { useStore } from '../store'

export function TotpCode({ secret, item }: { secret: string; item?: VaultItem }) {
  const { copy } = useStore()
  const [result, setResult] = useState<TotpResult | null>(null)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!secret || !parseTotp(secret)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    let alive = true
    const tick = () => {
      generateTotp(secret)
        .then((next) => {
          if (alive) setResult(next)
        })
        .catch(() => {
          if (alive) setInvalid(true)
        })
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [secret])

  if (invalid) {
    return <div className="totp totp--invalid">This one-time secret isn’t valid base32.</div>
  }

  if (!result) {
    return <div className="totp totp--loading">Generating code…</div>
  }

  return (
    <div className="totp">
      <span className="totp__badge">
        <ShieldCheck size={14} />
        2FA
      </span>
      <span className="totp__code mono">{formatTotp(result.code)}</span>
      <span className="totp__ring" title={`${result.remaining}s remaining`}>
        <span
          className="totp__ring-fill"
          style={{
            background: `conic-gradient(var(--accent) ${result.progress * 360}deg, rgba(255,255,255,.1) 0deg)`,
          }}
        />
        <span className="totp__ring-text">{result.remaining}</span>
      </span>
      <button
        type="button"
        className="icon-btn"
        onClick={() => void copy(result.code, { label: '2FA code', item })}
        aria-label="Copy one-time code"
        title="Copy one-time code"
      >
        <Copy size={14} />
      </button>
    </div>
  )
}
