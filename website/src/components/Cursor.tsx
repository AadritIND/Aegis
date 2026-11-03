import { useEffect, useRef } from 'react'

export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!fine) return

    const html = document.documentElement
    html.classList.add('has-cursor')
    html.dataset.cursor = 'hidden'

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const ringPos = { ...pos }
    let raf = 0
    let visible = false

    const move = (event: PointerEvent) => {
      pos.x = event.clientX
      pos.y = event.clientY
      if (!visible) {
        visible = true
        ringPos.x = pos.x
        ringPos.y = pos.y
        html.dataset.cursor = ''
      }
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
    }

    const loop = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.16
      ringPos.y += (pos.y - ringPos.y) * 0.16
      if (ring.current) ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('input, textarea, select')) {
        html.dataset.cursor = 'hidden'
        return
      }
      html.dataset.cursor = target.closest('a, button, [role="button"], [data-cursor]') ? 'link' : ''
    }

    const leave = () => {
      html.dataset.cursor = 'hidden'
      visible = false
    }
    const enter = () => {
      html.dataset.cursor = ''
      visible = true
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('pointerenter', enter)

    return () => {
      cancelAnimationFrame(raf)
      html.classList.remove('has-cursor')
      delete html.dataset.cursor
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      document.removeEventListener('pointerleave', leave)
      document.removeEventListener('pointerenter', enter)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
