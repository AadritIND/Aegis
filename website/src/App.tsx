import { useCallback, useEffect, useState } from 'react'
import { Cursor } from './components/Cursor'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { Preloader } from './components/Preloader'
import { useReveal } from './lib/useReveal'
import { useSmoothScroll } from './lib/smooth'
import { Anatomy } from './sections/Anatomy'
import { Bento } from './sections/Bento'
import { Compare } from './sections/Compare'
import { Download } from './sections/Download'
import { Extension } from './sections/Extension'
import { Faq } from './sections/Faq'
import { Forge } from './sections/Forge'
import { Hero } from './sections/Hero'
import { Manifesto } from './sections/Manifesto'
import { Security } from './sections/Security'
import { Ticker } from './sections/Ticker'
import { Tour } from './sections/Tour'

const params = new URLSearchParams(window.location.search)
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const intro = params.get('intro') !== 'off' && !reduced

export default function App() {
  const [booted, setBooted] = useState(!intro)
  const [tint, setTint] = useState(() => localStorage.getItem('aegis.tint') ?? 'acid')

  useSmoothScroll(booted)
  useReveal()

  useEffect(() => {
    document.documentElement.dataset.tint = tint
    try {
      localStorage.setItem('aegis.tint', tint)
    } catch {
      /* storage can be unavailable */
    }
  }, [tint])

  const done = useCallback(() => setBooted(true), [])

  return (
    <div className="app" data-booted={booted}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {intro && <Preloader onDone={done} />}
      <Cursor />
      <Nav tint={tint} onTint={setTint} />

      <main id="main">
        <Hero booted={booted} tint={tint} />
        <Ticker />
        <Bento />
        <Manifesto />
        <Tour />
        <Extension />
        <Security />
        <Anatomy />
        <Forge />
        <Compare />
        <Download />
        <Faq />
      </main>

      <Footer />
    </div>
  )
}
