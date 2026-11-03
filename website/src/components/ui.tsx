import { useRef, type CSSProperties, type ReactNode } from 'react'

export function Tilt({
  children,
  className = '',
  strength = 6,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    el.style.setProperty('--ry', `${(x - 0.5) * strength}deg`)
    el.style.setProperty('--rx', `${(0.5 - y) * strength}deg`)
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }

  const reset = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
  }

  return (
    <div ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </div>
  )
}

export function Magnetic({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  const move = (event: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.16
    const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.22
    el.style.transform = `translate3d(${Math.max(-9, Math.min(9, dx))}px, ${Math.max(-6, Math.min(6, dy))}px, 0)`
  }

  const reset = () => {
    if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)'
  }

  return (
    <span
      ref={ref}
      className={`magnetic ${className}`}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      {children}
    </span>
  )
}

export function Split({
  text,
  className = '',
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  return (
    <span className={`split ${className}`}>
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className="w">
            <span style={{ '--i': index, '--delay': delay } as CSSProperties}>{word}</span>
          </span>{' '}
        </span>
      ))}
    </span>
  )
}

export function SectionHead({
  eyebrow,
  title,
  copy,
  dark = false,
  aside,
  className = '',
}: {
  eyebrow: string
  title: ReactNode
  copy?: ReactNode
  dark?: boolean
  aside?: ReactNode
  className?: string
}) {
  return (
    <header className={`sec-head ${dark ? 'sec-head--dark' : ''} ${className}`} data-reveal>
      <div className="sec-head__top">
        <span className={`eyebrow ${dark ? 'eyebrow--dark' : ''}`}>{eyebrow}</span>
        {aside}
      </div>
      <div className="sec-head__grid">
        <h2 className="h2 sec-head__title">{title}</h2>
        {copy && <p className={`lead ${dark ? 'lead--dark' : ''} sec-head__copy`}>{copy}</p>}
      </div>
    </header>
  )
}
