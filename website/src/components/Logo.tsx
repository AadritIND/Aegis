import { useId } from 'react'

/* The Aegis mark: a shield with a keyhole punched clean through it. */
export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  const id = useId().replace(/[:]/g, '')
  const mask = `aegis-${id}`

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse">
          <path
            d="M16 1.8 28 6.5v8.3c0 7.2-5 12.8-12 15.4C9 27.6 4 22 4 14.8V6.5L16 1.8Z"
            fill="#fff"
          />
          <circle cx="16" cy="13.6" r="3.1" fill="#000" />
          <path d="M16 15.4v6.2" stroke="#000" strokeWidth="2.6" strokeLinecap="round" />
        </mask>
      </defs>
      <path
        d="M16 1.8 28 6.5v8.3c0 7.2-5 12.8-12 15.4C9 27.6 4 22 4 14.8V6.5L16 1.8Z"
        fill="currentColor"
        mask={`url(#${mask})`}
      />
    </svg>
  )
}
