import { useLayoutEffect, useRef } from 'react'
import { ArrowDown, ArrowUpRight, Download, KeyRound, ShieldCheck, WifiOff } from 'lucide-react'
import { PLATFORMS, RELEASE } from '../config'
import { detectPlatform } from '../lib/platform'
import { useRelease } from '../lib/release'
import { useReducedMotion } from '../lib/useReducedMotion'
import { gsap } from '../lib/gsap'
import { VaultCore } from '../components/VaultCore'
import { Magnetic } from '../components/ui'

export function Hero({ booted, tint }: { booted: boolean; tint: string }) {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const detected = detectPlatform()
  const mac = detectPlatform() === 'macos'
  const release = useRelease()

  const windows = PLATFORMS.find((platform) => platform.id === 'windows')
  const installHref = mac ? '#download' : (windows?.file ?? RELEASE.windows.file)
  const installLabel = mac ? 'Get Aegis for macOS' : 'Download for Windows'

  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      gsap.to('.hero__title', {
        yPercent: -9,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('.hero__canvas', {
        yPercent: 13,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.to('.hero__side', {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, root)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      className="hero"
      id="top"
      ref={root}
      data-booted={booted}
      onPointerMove={(event) => {
        const el = root.current
        if (!el) return
        const box = el.getBoundingClientRect()
        el.style.setProperty('--mx', ((event.clientX - box.left) / box.width).toFixed(3))
        el.style.setProperty('--my', ((event.clientY - box.top) / box.height).toFixed(3))
      }}
    >
      <div className="hero__atmos" aria-hidden="true">
        <span className="hero__spot" />
        <span className="hero__blob hero__blob--acid" />
        <span className="hero__blob hero__blob--violet" />
        <span className="hero__blob hero__blob--cyan" />
        <span className="hero__grid" />
        <span className="hero__scan" />
      </div>

      <div className="hero__canvas" aria-hidden="true">
        <span className="hero__orb-fallback" />
        {/* The door mounts behind the boot screen so its shaders, textures and
            first frame are part of the real load — not a pop-in after it. */}
        <VaultCore tint={tint} reduced={reduced} />
        <span className="hero__canvas-fade" />
      </div>

      <div className="hero__side hero__side--left mono" aria-hidden="true">
        LOCAL VOLUME · 1 FILE
      </div>
      <div className="hero__side hero__side--right mono" aria-hidden="true">
        {release.version} — {release.released}
      </div>

      <div className="container hero__inner">
        <div className="hero__top">
          <span className="eyebrow">Local-first desktop vault</span>
          <span className="hero__os mono">
            <span>Windows 10/11</span>
            <i />
            <span>macOS 11+</span>
            <i />
            <span>No account</span>
          </span>
        </div>

        <h1 className="hero__title" aria-label="Nothing leaves this machine.">
          <span className="split hero__line" style={{ '--delay': 100 } as React.CSSProperties}>
            <span className="w">
              <span>Nothing</span>
            </span>
          </span>
          <span className="split hero__line hero__line--indent" style={{ '--delay': 240 } as React.CSSProperties}>
            <span className="w">
              <span>leaves</span>
            </span>{' '}
            <span className="w">
              <span>this</span>
            </span>
          </span>
          <span className="split hero__line hero__line--serif" style={{ '--delay': 400 } as React.CSSProperties}>
            <span className="w">
              <span>machine.</span>
            </span>
          </span>
        </h1>

        <div className="hero__body">
          <p className="hero__lede">
            A vault for passwords, API keys and the things you would never hand to a cloud. One encrypted file,
            sealed on your own disk, opened by one password that never leaves your head.
          </p>

          <div className="hero__actions">
            <Magnetic>
              <a className="btn btn--primary btn--lg" href={installHref} download={!mac}>
                <Download size={17} strokeWidth={2.2} />
                {installLabel}
              </a>
            </Magnetic>
            <a className="btn btn--ghost btn--lg hero__watch" href="#tour">
              See it move
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </a>
          </div>

          <div className="hero__meta">
            <span className="mono">v{release.version}</span>
            <span className="mono">free forever</span>
            <span className="mono">
              {detected === 'macos' ? 'universal build' : `${release.assets.windows.size} installer`}
            </span>
          </div>
        </div>

        <div className="hero__badges" aria-hidden="true">
          <div className="hero__badge hero__badge--a">
            <ShieldCheck size={15} strokeWidth={2} />
            <div>
              <b>AES-256-GCM</b>
              <span className="mono">sealed at rest</span>
            </div>
          </div>
          <div className="hero__badge hero__badge--b">
            <WifiOff size={15} strokeWidth={2} />
            <div>
              <b>0</b>
              <span className="mono">network calls</span>
            </div>
          </div>
          <div className="hero__badge hero__badge--c">
            <KeyRound size={15} strokeWidth={2} />
            <div>
              <b>scrypt</b>
              <span className="mono">N = 32,768</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container hero__foot">
        <div className="hero__facts">
          <div>
            <span className="mono">01 / custody</span>
            <p>One encrypted file in your app-data folder.</p>
          </div>
          <div>
            <span className="mono">02 / surface</span>
            <p>No server, no sync account, no telemetry.</p>
          </div>
          <div>
            <span className="mono">03 / access</span>
            <p>Master password only. No reset. No back door.</p>
          </div>
        </div>
        <a className="hero__scroll" href="#product" aria-label="Scroll to the product">
          <span className="mono">Scroll</span>
          <ArrowDown size={15} />
        </a>
      </div>
    </section>
  )
}
