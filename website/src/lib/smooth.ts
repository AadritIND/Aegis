import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap, ScrollTrigger } from './gsap'

let instance: Lenis | null = null

export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis({
      duration: 1.05,
      lerp: 0.09,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      smoothWheel: true,
    })
    instance = lenis

    const update = () => ScrollTrigger.update()
    lenis.on('scroll', update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const id = anchor.getAttribute('href')?.slice(1)
      if (!id) return
      if (id === 'top') {
        event.preventDefault()
        lenis.scrollTo(0, { duration: 1.3 })
        return
      }
      const element = document.getElementById(id)
      if (!element) return
      event.preventDefault()
      lenis.scrollTo(element, { offset: -86, duration: 1.35 })
    }
    document.addEventListener('click', onClick)

    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 500)

    return () => {
      window.clearTimeout(refresh)
      document.removeEventListener('click', onClick)
      gsap.ticker.remove(raf)
      lenis.destroy()
      instance = null
    }
  }, [enabled])
}

export function scrollToId(id: string, offset = -86) {
  const element = document.getElementById(id)
  if (!element) return
  if (instance) instance.scrollTo(element, { offset, duration: 1.2 })
  else element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function scrollToTop() {
  if (instance) instance.scrollTo(0, { duration: 1.1 })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

export function scrollToY(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1.1 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

export function lockScroll(locked: boolean) {
  if (instance) {
    if (locked) instance.stop()
    else instance.start()
  }
  document.documentElement.style.overflow = locked ? 'hidden' : ''
  document.body.style.overflow = locked ? 'hidden' : ''
}
