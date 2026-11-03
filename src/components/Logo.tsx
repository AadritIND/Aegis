import { useId } from 'react'
import { cn } from '../lib/utils'

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  const rawId = useId()
  const id = `aegis-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <span className={cn('logo-mark', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size * 0.68} height={size * 0.68} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--accent)" />
            <stop offset="0.55" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent-3)" />
          </linearGradient>
        </defs>
        <path
          d="M16 2.4 27.3 6.7v8.2c0 6.5-4.6 11.6-11.3 14.9C9.3 26.5 4.7 21.4 4.7 14.9V6.7L16 2.4Z"
          fill={`url(#${id})`}
        />
        <path
          d="M16 2.4 27.3 6.7v8.2c0 6.5-4.6 11.6-11.3 14.9C9.3 26.5 4.7 21.4 4.7 14.9V6.7L16 2.4Z"
          fill="none"
          stroke="rgba(255,255,255,.45)"
          strokeWidth="0.8"
        />
        <circle cx="16" cy="14.2" r="3.15" fill="rgba(4,14,11,.78)" />
        <path
          d="M16 16.7v4.6"
          stroke="rgba(4,14,11,.78)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M8.4 8.1 15.4 5.6"
          stroke="rgba(255,255,255,.55)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="nav-brand">
      <LogoMark size={30} />
      {!compact && (
        <div className="nav-brand__text">
          <span className="nav-brand__word">Aegis</span>
          <span className="nav-brand__small">VAULT</span>
        </div>
      )}
    </div>
  )
}
