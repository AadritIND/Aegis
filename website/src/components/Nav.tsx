import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Download } from 'lucide-react'
import { PLATFORMS, RELEASE } from '../config'
import { detectPlatform } from '../lib/platform'
import { useRelease } from '../lib/release'
import { lockScroll } from '../lib/smooth'
import { Logo } from './Logo'

const LINKS = [
  { id: 'product', label: 'Product', n: '01' },
  { id: 'tour', label: 'Tour', n: '02' },
  { id: 'extension', label: 'Extension', n: '03' },
  { id: 'security', label: 'Security', n: '04' },
  { id: 'anatomy', label: 'Anatomy', n: '05' },
  { id: 'forge', label: 'Forge', n: '06' },
  { id: 'download', label: 'Download', n: '07' },
  { id: 'faq', label: 'FAQ', n: '08' },
]

const TINTS = [
  { id: 'acid', dot: '#c9f94d', label: 'Acid' },
  { id: 'ultra', dot: '#bda6ff', label: 'Ultra' },
  { id: 'ember', dot: '#ffb45e', label: 'Ember' },
]

export function Nav({ tint, onTint }: { tint: string; onTint: (tint: string) => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState('product')
  const [menu, setMenu] = useState(false)
  const nav = useRef<HTMLElement>(null)
  const detected = detectPlatform()
  const mac = detected === 'macos'
  const linux = detected === 'linux'
  const { version } = useRelease()
  const shortVersion = version.split('.').slice(0, 2).join('.')
  const href =
    mac || linux ? '#download' : (PLATFORMS.find((p) => p.id === 'windows')?.file ?? RELEASE.windows.file)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      setScrolled(y > 24)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0)

      let current = 'product'
      for (const link of LINKS) {
        const el = document.getElementById(link.id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.42) current = link.id
      }
      setActive(current)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    lockScroll(menu)
    const main = document.getElementById('main')
    const foot = document.querySelector('.foot')
    if (menu) {
      main?.setAttribute('inert', '')
      foot?.setAttribute('inert', '')
    } else {
      main?.removeAttribute('inert')
      foot?.removeAttribute('inert')
    }
    return () => {
      lockScroll(false)
      main?.removeAttribute('inert')
      foot?.removeAttribute('inert')
    }
  }, [menu])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="nav" ref={nav} data-scrolled={scrolled} data-menu={menu}>
        <div className="nav__inner">
          <a href="#top" className="nav__brand" aria-label="Aegis home">
            <Logo size={24} className="nav__logo" />
            <span>Aegis</span>
            <em className="nav__ver">{shortVersion}</em>
          </a>

          <nav className="nav__links" aria-label="Sections">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="nav__link"
                data-active={active === link.id}
                onClick={() => setMenu(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="nav__tint" role="group" aria-label="Accent colour">
            <span className="nav__tintlabel mono">tint</span>
            {TINTS.map((item) => (
              <button
                key={item.id}
                type="button"
                data-on={tint === item.id}
                onClick={() => onTint(item.id)}
                aria-label={`${item.label} accent`}
                aria-pressed={tint === item.id}
                title={`${item.label} accent`}
              >
                <i style={{ ['--dot' as string]: item.dot } as React.CSSProperties} />
              </button>
            ))}
          </div>

          <a className="btn btn--primary nav__cta" href={href} download={!mac && !linux}>
            <Download size={14} strokeWidth={2.3} />
            Download
          </a>

          <button
            type="button"
            className="nav__burger"
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            onClick={() => setMenu((value) => !value)}
          >
            <i />
          </button>

          <span className="nav__progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </span>
        </div>
      </header>

      <div className="menu" data-open={menu} aria-hidden={!menu}>
        <nav aria-label="Mobile sections">
          {LINKS.map((link) => (
            <a
            key={link.id}
            href={`#${link.id}`}
            className="menu__link"
            onClick={() => {
              setMenu(false)
              lockScroll(false)
            }}
          >
              {link.label}
              <i>{link.n}</i>
            </a>
          ))}
        </nav>
        <div className="menu__foot">
          <a
            className="btn btn--primary btn--lg"
            href={href}
            download={!mac && !linux}
            onClick={() => {
              setMenu(false)
              lockScroll(false)
            }}
          >
            <Download size={16} />{' '}
            {mac ? 'Get Aegis for macOS' : linux ? 'Get Aegis for Linux' : 'Download for Windows'}
          </a>
          <a
            className="link-arrow"
            href="#security"
            onClick={() => {
              setMenu(false)
              lockScroll(false)
            }}
          >
            Read the security model <ArrowUpRight size={14} />
          </a>
          <span className="mono dim">v{version} · no account · no cloud</span>
        </div>
      </div>
    </>
  )
}
