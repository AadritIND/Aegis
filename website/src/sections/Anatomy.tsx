import { useLayoutEffect, useRef, useState } from 'react'
import { Fingerprint, KeyRound, Layers, LockKeyhole, ScanLine, ShieldCheck } from 'lucide-react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'

const LAYERS = [
  {
    n: '01',
    tag: 'the only secret',
    title: 'Master password',
    body: 'The one thing you memorise. It is never written to disk, never held in a variable longer than the key derivation needs it, and never sent anywhere.',
    code: 'never stored · never transmitted',
    icon: Fingerprint,
    tone: 'acid',
  },
  {
    n: '02',
    tag: 'what makes it unique',
    title: 'Salt · IV',
    body: 'A random 16-byte salt means the same password produces a different key on every vault. A 12-byte nonce means the same secret never encrypts twice the same way.',
    code: 'salt 16B · iv 12B · crypto.getRandomValues',
    icon: ScanLine,
    tone: 'cyan',
  },
  {
    n: '03',
    tag: 'the slow part, on purpose',
    title: 'scrypt KDF',
    body: 'N = 32,768, r = 8, p = 1. Deliberately expensive, so guessing a master password costs an attacker a great deal of time and memory for every attempt.',
    code: 'N=32768 · r=8 · p=1 · 256-bit key',
    icon: KeyRound,
    tone: 'violet',
  },
  {
    n: '04',
    tag: 'what seals it',
    title: 'AES-256-GCM',
    body: 'Every byte of your vault is authenticated encryption. A single flipped bit anywhere in the file means decryption refuses to return anything at all.',
    code: 'aes-256-gcm · 256-bit key · 96-bit nonce',
    icon: LockKeyhole,
    tone: 'pink',
  },
  {
    n: '05',
    tag: 'what proves it',
    title: 'Auth tag',
    body: 'The tag is the tamper seal. If the file has been edited, truncated or swapped, the tag fails before a single item is parsed into memory.',
    code: 'tag 16B · verified before parse',
    icon: ShieldCheck,
    tone: 'ember',
  },
]

const TONE: Record<string, string> = {
  acid: '201,249,77',
  cyan: '79,227,224',
  violet: '140,110,255',
  pink: '255,159,216',
  ember: '255,180,94',
}

const SWITCHES = [0.31, 0.42, 0.52, 0.63]

export function Anatomy() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const stack = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 960px)', () => {
      const layers = gsap.utils.toArray<HTMLElement>('.anatomy__layer')
      if (!layers.length) return

      gsap.set(stack.current, {
        rotateX: 60,
        rotateY: 0,
        rotateZ: -38,
        y: 0,
        scale: 1,
      })
      gsap.set(layers, {
        transformPerspective: 1800,
        transformOrigin: '50% 50%',
        x: (index: number) => (index - 2) * 12,
        y: (index: number) => (index - 2) * 30,
        z: (index: number) => (LAYERS.length - 1 - index) * 20,
        rotateZ: 0,
        rotateY: 0,
      })

      /* A slow, permanent swivel keeps the slab alive between scroll moves. */
      gsap.fromTo(
        stack.current,
        { rotateY: -5 },
        { rotateY: 5, duration: 6.5, ease: 'sine.inOut', yoyo: true, repeat: -1 },
      )

      let focused = 0
      const focusLayer = (index: number) => {
        layers.forEach((layer, i) => {
          gsap.to(layer, {
            scale: i === index ? 1.035 : 1,
            duration: 0.6,
            ease: 'power3.out',
          })
        })
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        scrollTrigger: {
          trigger: stage.current,
          start: 'top top',
          end: '+=210%',
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            /* The readout turns over as each successive wafer starts to peel. */
            const next = SWITCHES.reduce((count, at) => (self.progress >= at ? count + 1 : count), 0)
            if (next !== focused) {
              focused = next
              focusLayer(next)
            }
            setProgress(self.progress)
            setActive(next)
          },
        },
      })

      /* 1 · wind up — the slab tilts away and compresses before it opens. */
      tl.to(
        stack.current,
        { rotateZ: -48, rotateX: 62, scale: 0.95, duration: 0.28, ease: 'power2.inOut' },
        0,
      )
      tl.to(
        layers,
        {
          x: (index: number) => (index - 2) * 16,
          y: (index: number) => (index - 2) * window.innerHeight * 0.04,
          z: (index: number) => (LAYERS.length - 1 - index) * window.innerHeight * 0.025,
          duration: 0.28,
          ease: 'power2.inOut',
        },
        0,
      )

      /* 2 · the swing — the whole stack turns while each wafer peels away in turn. */
      tl.to(
        stack.current,
        {
          rotateZ: -12,
          rotateX: 45,
          y: () => window.innerHeight * 0.074,
          scale: 1,
          duration: 1.1,
          ease: 'power2.inOut',
        },
        0.18,
      )
      tl.to(
        stack.current,
        {
          keyframes: [
            { x: 38, duration: 0.5, ease: 'power2.out' },
            { x: 20, duration: 0.6, ease: 'power2.inOut' },
          ],
        },
        0.18,
      )
      tl.to(
        layers,
        {
          x: (index: number) => (index - 2) * 30,
          y: (index: number) => (index - 2) * window.innerHeight * 0.118,
          z: (index: number) => (LAYERS.length - 1 - index) * window.innerHeight * 0.046,
          rotateZ: (index: number) => (index - 2) * 1.6,
          rotateY: (index: number) => (index - 2) * 2.2,
          rotateX: (index: number) => (index - 2) * -0.8,
          duration: 0.55,
          ease: 'power3.inOut',
          stagger: 0.2,
        },
        0.22,
      )

      /* 3 · camera push — the deck drifts closer as the pin releases. */
      tl.to(
        stack.current,
        {
          scale: 1.04,
          x: 18,
          y: () => window.innerHeight * 0.067,
          rotateZ: -9,
          duration: 0.4,
          ease: 'power1.inOut',
        },
        1.55,
      )

      tl.to({}, { duration: 0.001 })

      const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300)
      return () => window.clearTimeout(refresh)
    })

    return () => mm.revert()
  }, [reduced])

  return (
    <section className="anatomy" id="anatomy" ref={root} data-static={reduced}>
      <span className="anatomy__index" aria-hidden="true">
        INSIDE
      </span>
      <span className="anatomy__glow anatomy__glow--a" aria-hidden="true" />
      <span className="anatomy__glow anatomy__glow--b" aria-hidden="true" />

      <div className="container anatomy__head">
        <div className="anatomy__headtop">
          <span className="eyebrow">06 — Anatomy</span>
          <span className="mono">one file · five layers</span>
        </div>
        <div className="anatomy__headgrid">
          <h2 className="h2">
            Nothing hidden.
            <br />
            <span className="serif-accent">Everything sealed.</span>
          </h2>
          <p className="lead">
            Most vaults ask you to trust a diagram. Here is the actual file, opened up layer by layer. Scroll
            through the whole thing — there is no sixth layer, and nothing in the middle you cannot read.
          </p>
        </div>
      </div>

      <div className="anatomy__stage" ref={stage}>
        <div className="anatomy__scene container">
          <div className="anatomy__visual">
            <div className="anatomy__stack" ref={stack}>
              {LAYERS.map((layer, index) => (
                <article
                  className="anatomy__layer"
                  key={layer.n}
                  data-active={active === index}
                  data-tone={layer.tone}
                  style={
                    {
                      '--i': index,
                      '--tone': TONE[layer.tone],
                      zIndex: index + 1,
                    } as React.CSSProperties
                  }
                >
                  <header className="anatomy__layerhead">
                    <span className="anatomy__layernum mono">{layer.n}</span>
                    <span className="anatomy__icon">
                      <layer.icon size={16} strokeWidth={1.8} />
                    </span>
                    <span className="mono anatomy__layertag">{layer.tag}</span>
                  </header>
                  <h3 className="anatomy__layertitle">{layer.title}</h3>
                  <div className="anatomy__layercode mono">
                    <span>{layer.code}</span>
                    <i />
                  </div>
                  <span className="anatomy__layerglow" aria-hidden="true" />
                </article>
              ))}
            </div>

            <div className="anatomy__float anatomy__float--a mono" aria-hidden="true">
              <Layers size={11} /> aegis.vault — 41.2 KB
            </div>
            <div className="anatomy__float anatomy__float--b mono" aria-hidden="true">
              <LockKeyhole size={11} /> format v1 · sealed
            </div>

            <div className="anatomy__ruler" aria-hidden="true">
              <i style={{ width: `${progress * 100}%` }} data-on={progress > 0.015} />
            </div>
          </div>

          <aside className="anatomy__readout">
            <div className="anatomy__counter">
              <span className="mono">layer</span>
              <b key={active}>{String(active + 1).padStart(2, '0')}</b>
              <span className="mono">/ {String(LAYERS.length).padStart(2, '0')}</span>
            </div>

            <div className="anatomy__copy" key={active}>
              <span className="mono anatomy__copytag">{LAYERS[active].tag}</span>
              <h3>{LAYERS[active].title}</h3>
              <p>{LAYERS[active].body}</p>
              <code className="mono">{LAYERS[active].code}</code>
            </div>

            <ol className="anatomy__rail">
              {LAYERS.map((layer, index) => (
                <li key={layer.n} data-on={active === index} data-done={active > index}>
                  <span className="mono">{layer.n}</span>
                  <b>{layer.title}</b>
                  <i />
                </li>
              ))}
            </ol>

            <span className="anatomy__scroll mono">
              scroll to disassemble
              <i />
            </span>
          </aside>
        </div>
      </div>
    </section>
  )
}
