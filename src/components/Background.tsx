import { useEffect, useRef } from 'react'

export function Background() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let frame = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight * 0.35
    const paint = () => {
      frame = 0
      if (!glowRef.current) return
      glowRef.current.style.setProperty('--cx', `${x}px`)
      glowRef.current.style.setProperty('--cy', `${y}px`)
    }
    const onMove = (event: PointerEvent) => {
      x = event.clientX
      y = event.clientY
      if (!frame) frame = window.requestAnimationFrame(paint)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="bg" aria-hidden="true">
        <div className="bg__blob bg__blob--1" />
        <div className="bg__blob bg__blob--2" />
        <div className="bg__blob bg__blob--3" />
        <div className="bg__blob bg__blob--4" />
        <div className="bg__grid" />
        <div className="bg__vignette" />
      </div>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div className="bg__noise" aria-hidden="true" />
    </>
  )
}
