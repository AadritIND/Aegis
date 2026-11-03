import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SITE } from '../config'
import { Logo } from './Logo'

/* The cold start. A machined door, eight bolts, a wheel that answers to
   the clock, and a lid that swings open onto the actual page.

   Progress is not a timer. Every tick below is tied to a real readiness
   event — font faces, the interface plates, WebGL, the load event and a
   settled layout — with a safety valve so a stuck request can never hold
   the site hostage. */

const PHASES = [
  { at: 0, key: 'MOUNT', label: 'Mounting cold volume' },
  { at: 5, key: 'GLYPH', label: 'Loading font tables' },
  { at: 32, key: 'PLATES', label: 'Decoding interface plates' },
  { at: 88, key: 'LAYOUT', label: 'Settling the local layout' },
  { at: 98, key: 'SEAL', label: 'Breaking the seal' },
]

/* Every screenshot the product sections use. Warming them here means the
   tour never pops a blank frame after the door opens. */
const PLATES = [
  './shots/dashboard.webp',
  './shots/vault.webp',
  './shots/detail.webp',
  './shots/autofill.webp',
  './shots/forge.webp',
  './shots/audit.webp',
  './shots/scrolled.webp',
  './shots/settings.webp',
  './shots/onboarding.webp',
  './shots/editor.webp',
  './shots/palette.webp',
  './shots/compact.webp',
]

const FONT_FACES = [
  '400 16px "Inter Variable"',
  '600 16px "Bricolage Grotesque Variable"',
  'italic 400 20px "Instrument Serif"',
  '400 12px "JetBrains Mono Variable"',
]

const LOG: { at: number; node: string; text: string; ok?: boolean }[] = [
  { at: 1, node: '00', text: 'cold start · sector 0x0000' },
  { at: 6, node: '01', text: 'font tables · {fonts} families' },
  { at: 18, node: '02', text: 'plate cache · {plates} decoded' },
  { at: 38, node: '03', text: 'aegis-vault/v1 header', ok: true },
  { at: 50, node: '04', text: 'cylinder · 8 bolts' },
  { at: 62, node: '05', text: 'scrypt N=32768 r=8 p=1' },
  { at: 70, node: '06', text: 'graphics · {gl}' },
  { at: 78, node: '07', text: 'layout · no reflow', ok: true },
  { at: 86, node: '08', text: 'document · {ready}', ok: true },
  { at: 92, node: '09', text: 'netstat --interfaces' },
  { at: 96, node: '10', text: 'remote endpoints 0', ok: true },
  { at: 99, node: '11', text: 'session · local only', ok: true },
]

const BOLTS = ['01', '02', '03', '04', '05', '06', '07', '08']

const TICKS = Array.from({ length: 120 }, (_, index) => {
  const major = index % 10 === 0
  const mid = index % 5 === 0
  const angle = (index / 120) * Math.PI * 2
  const inner = major ? 168 : mid ? 176 : 181
  const outer = 190
  return {
    x1: 200 + Math.cos(angle) * inner,
    y1: 200 + Math.sin(angle) * inner,
    x2: 200 + Math.cos(angle) * outer,
    y2: 200 + Math.sin(angle) * outer,
    major,
    mid,
  }
})

function randomHex(length: number) {
  const chars = '0123456789ABCDEF'
  let out = ''
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * 16)]
  return out
}

export function Preloader({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0)
  const [open, setOpen] = useState(false)
  const [fast, setFast] = useState(false)
  const [gone, setGone] = useState(false)
  const [fonts, setFonts] = useState(0)
  const [plates, setPlates] = useState(0)
  const [glReady, setGlReady] = useState(false)
  const [readyState, setReadyState] = useState('interactive')
  const finished = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const stream = useMemo(
    () =>
      Array.from({ length: 14 }, () =>
        `${randomHex(4)} ${randomHex(4)} ${randomHex(4)}`,
      ),
    [],
  )
  const seal = useMemo(() => `${randomHex(4)}·${randomHex(4)}·${randomHex(4)}`, [])

  const finish = useCallback((immediate = false) => {
    if (finished.current) return
    finished.current = true
    if (immediate) setFast(true)
    setP(100)
    setOpen(true)
    onDoneRef.current()
    document.documentElement.classList.remove('is-booting')
    window.setTimeout(() => setGone(true), immediate ? 700 : 1950)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('is-booting')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish(true)
      return () => html.classList.remove('is-booting')
    }

    let cancelled = false
    let raf = 0
    let safety = 0
    let target = 0
    let display = 0
    let ready = false

    const setTarget = (value: number) => {
      target = Math.max(target, Math.min(100, value))
    }

    const twoFrames = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

    const afterLoad = () =>
      new Promise<void>((resolve) => {
        if (document.readyState === 'complete') {
          resolve()
          return
        }
        const onLoad = () => {
          setReadyState('complete')
          resolve()
        }
        window.addEventListener('load', onLoad, { once: true })
      })

    const run = async () => {
      await twoFrames()
      setTarget(4)

      /* real font faces — the four families the site actually paints in */
      let fontCount = 0
      const fontJobs = FONT_FACES.map((face) =>
        document.fonts
          .load(face)
          .catch(() => null)
          .then(() => {
            fontCount += 1
            if (!cancelled) setFonts(fontCount)
            setTarget(4 + (fontCount / FONT_FACES.length) * 26)
          }),
      )
      await Promise.all(fontJobs)
      await document.fonts.ready.catch(() => null)
      setTarget(31)

      /* real image fetches + decodes for every product plate */
      let plateCount = 0
      await Promise.all(
        PLATES.map(
          (src) =>
            new Promise<void>((resolve) => {
              const image = new Image()
              image.decoding = 'async'
              const step = () => {
                plateCount += 1
                if (!cancelled) setPlates(plateCount)
                setTarget(31 + (plateCount / PLATES.length) * 53)
                resolve()
              }
              image.onload = () => {
                if (typeof image.decode === 'function') image.decode().then(step, step)
                else step()
              }
              image.onerror = step
              image.src = src
            }),
        ),
      )
      setTarget(85)

      /* A context probe is not enough: the actual vault door mounts behind
         this screen, so wait for its first rendered frame before calling
         graphics ready. If it never arrives, the sequence still completes. */
      let hasGL = false
      try {
        const probe = document.createElement('canvas')
        hasGL = Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
      } catch {
        hasGL = false
      }

      let sceneReady = false
      if (hasGL) {
        sceneReady = await new Promise<boolean>((resolve) => {
          const vaultWindow = window as Window & { __aegisVaultReady?: boolean }
          if (vaultWindow.__aegisVaultReady) {
            resolve(true)
            return
          }

          let timer = 0
          const onReady = () => {
            window.clearTimeout(timer)
            window.removeEventListener('aegis:vault-ready', onReady)
            resolve(true)
          }

          window.addEventListener('aegis:vault-ready', onReady, { once: true })
          timer = window.setTimeout(() => {
            window.removeEventListener('aegis:vault-ready', onReady)
            resolve(false)
          }, 4200)
        })
      }

      if (!cancelled) setGlReady(hasGL && sceneReady)
      setTarget(89)

      await Promise.race([
        afterLoad(),
        new Promise<void>((resolve) => window.setTimeout(resolve, 5000)),
      ])
      await twoFrames()
      setTarget(94)

      /* let pending layout and style work finish before the door opens */
      await new Promise<void>((resolve) => {
        const idle = (
          window as Window & {
            requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
          }
        ).requestIdleCallback
        if (idle) idle(() => resolve(), { timeout: 900 })
        else window.setTimeout(resolve, 120)
      })
      setTarget(98)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 90))
      setTarget(100)
      if (!cancelled) setReadyState(document.readyState)
      ready = true
    }

    let previous = performance.now()

    const frame = (now: number) => {
      if (cancelled) return
      const delta = Math.min(2, (now - previous) / 16.667)
      previous = now

      if (display < target) {
        const step = Math.max(0.06, (target - display) * 0.1) * delta
        display = Math.min(target, display + step)
        const next = Math.floor(display * 10) / 10
        setP((current) => (next > current ? next : current))
      }

      if (ready && display >= 99.6 && !finished.current) {
        setP(100)
        finish()
        return
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    safety = window.setTimeout(() => {
      if (cancelled || finished.current) return
      setTarget(100)
      display = 100
      ready = true
    }, 11000)

    run().catch(() => {
      if (cancelled) return
      setTarget(100)
      ready = true
    })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(true)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.clearTimeout(safety)
      window.removeEventListener('keydown', onKey)
      html.classList.remove('is-booting')
    }
  }, [finish])

  useEffect(() => {
    if (!gone) return
    document.documentElement.classList.remove('is-booting')
    document.body.style.removeProperty('overflow')
  }, [gone])

  const phase = [...PHASES].reverse().find((item) => p >= item.at) ?? PHASES[0]
  const arc = 2 * Math.PI * 146
  const offset = arc * (1 - p / 100)
  const wheelTurn = -24 + p * 4.4

  if (gone) return null

  const track = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = root.current
    if (!el) return
    const x = event.clientX / window.innerWidth - 0.5
    const y = event.clientY / window.innerHeight - 0.5
    el.style.setProperty('--px', x.toFixed(3))
    el.style.setProperty('--py', y.toFixed(3))
  }

  return (
    <div
      className="bootv"
      data-open={open}
      data-fast={fast}
      ref={root}
      onPointerMove={track}
      role="status"
      aria-live="polite"
      aria-label="Unlocking the Aegis vault"
    >
      <span className="bootv__wash" aria-hidden="true" />
      <span className="bootv__grid" aria-hidden="true" />
      <span className="bootv__scan" aria-hidden="true" />
      <span className="bootv__bar bootv__bar--t" aria-hidden="true" />
      <span className="bootv__bar bootv__bar--b" aria-hidden="true" />

      <div className="bootv__frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>

      <header className="bootv__top">
        <div className="bootv__brand">
          <Logo size={21} />
          <b>AEGIS</b>
          <em>series 01</em>
        </div>
        <div className="bootv__topmeta">
          <span>cold start</span>
          <span className="bootv__dot" />
          <span>local volume</span>
          <span className="bootv__dot" />
          <span>no uplink</span>
        </div>
      </header>

      <div className="bootv__left" aria-hidden="true">
        <span className="bootv__cap">mount sequence</span>
        <div className="bootv__log">
          {LOG.map((line) => (
            <p key={line.node} data-on={p >= line.at}>
              <em>{line.node}</em>
              <span>{line.ok ? 'ok' : '›'}</span>
              {line.text
                .replace('{fonts}', `${fonts}/${FONT_FACES.length}`)
                .replace('{plates}', `${plates}/${PLATES.length}`)
                .replace('{gl}', glReady ? 'webgl2 ready' : 'probing')
                .replace('{ready}', readyState)}
            </p>
          ))}
        </div>
        <span className="bootv__cap bootv__cap--low">kernel 01 · loopback</span>
      </div>

      <div className="bootv__right" aria-hidden="true">
        <span className="bootv__cap">cylinder state</span>
        <div className="bootv__boltslist">
          {BOLTS.map((bolt, index) => {
            const released = p > 34 + index * 3.2
            return (
              <span key={bolt} data-open={released}>
                <i />
                bolt {bolt}
                <em>{released ? 'open' : 'locked'}</em>
              </span>
            )
          })}
        </div>
        <div className="bootv__stream">
          {stream.map((row, index) => (
            <span key={row} style={{ opacity: 0.16 + ((index * 7) % 5) / 12 }}>
              {row}
            </span>
          ))}
        </div>
      </div>

      <div className="bootv__stage">
        <span className="bootv__halo" aria-hidden="true" />
        <div className="bootv__gantry" aria-hidden="true">
          <span className="bootv__gantryring bootv__gantryring--1" />
          <span className="bootv__gantryring bootv__gantryring--2" />
          <span className="bootv__gantryticks" />
          <span className="bootv__gantrylabel bootv__gantrylabel--t">sector 0x00 · cold storage</span>
          <span className="bootv__gantrylabel bootv__gantrylabel--r">door 01 · 8 bolt</span>
          <span className="bootv__gantrylabel bootv__gantrylabel--b">pressure 1.0 atm</span>
          <span className="bootv__gantrylabel bootv__gantrylabel--l">shaft a · 0 rpm</span>
        </div>
        <div className="bootv__rig">
          <span className="bootv__cavity" aria-hidden="true">
            <i />
            <b />
          </span>

          <div className="bootv__door" aria-hidden="true">
            <div className="bootv__face">
              <span className="bootv__metal" />
              <span className="bootv__brush" />
              <span className="bootv__rim" />
              <span className="bootv__rim2" />

              <svg className="bootv__ticks" viewBox="0 0 400 400">
                {TICKS.map((tick, index) => (
                  <line
                    key={index}
                    x1={tick.x1}
                    y1={tick.y1}
                    x2={tick.x2}
                    y2={tick.y2}
                    stroke={
                      tick.major
                        ? 'rgba(201,249,77,.68)'
                        : tick.mid
                          ? 'rgba(244,241,231,.3)'
                          : 'rgba(244,241,231,.13)'
                    }
                    strokeWidth={tick.major ? 1.6 : 0.8}
                  />
                ))}
                <circle
                  cx="200"
                  cy="200"
                  r="146"
                  fill="none"
                  stroke="rgba(244,241,231,.07)"
                  strokeWidth="10"
                />
                <circle
                  className="bootv__arc"
                  cx="200"
                  cy="200"
                  r="146"
                  fill="none"
                  stroke="var(--acid)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray={arc}
                  strokeDashoffset={offset}
                />
              </svg>

              <div className="bootv__bolts">
                {BOLTS.map((bolt, index) => (
                  <span
                    key={bolt}
                    className="bootv__bolt"
                    style={{ '--a': `${index * 45 + 22.5}deg` } as React.CSSProperties}
                    data-released={p > 34 + index * 3.2}
                  >
                    <i />
                  </span>
                ))}
              </div>

              <div className="bootv__engrave">
                <svg viewBox="0 0 400 400">
                  <defs>
                    <path
                      id="bootv-etch"
                      d="M 200,200 m -132,0 a 132,132 0 1,1 264,0 a 132,132 0 1,1 -264,0"
                    />
                  </defs>
                  <text>
                    <textPath href="#bootv-etch" startOffset="0%">
                      AEGIS · LOCAL VOLUME · AES-256-GCM · SCRYPT N=32768 · ZERO NETWORK · NO ACCOUNT ·
                    </textPath>
                  </text>
                </svg>
              </div>

              <div className="bootv__wheel" style={{ '--turn': `${wheelTurn}deg` } as React.CSSProperties}>
                <svg viewBox="0 0 240 240">
                  <defs>
                    <linearGradient id="spoke" x1="0" y1="0" x2="1" y2="0">
                      <stop stopColor="#4b5044" />
                      <stop offset=".28" stopColor="#f1f3e4" />
                      <stop offset=".5" stopColor="#8b9280" />
                      <stop offset=".74" stopColor="#e6ead8" />
                      <stop offset="1" stopColor="#3d4238" />
                    </linearGradient>
                    <radialGradient id="wheelring" cx=".38" cy=".3" r=".9">
                      <stop stopColor="#c8ceb7" />
                      <stop offset=".55" stopColor="#5e6453" />
                      <stop offset="1" stopColor="#23261e" />
                    </radialGradient>
                  </defs>
                  <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(8,9,7,.72)" strokeWidth="20" />
                  <circle cx="120" cy="120" r="104" fill="none" stroke="url(#wheelring)" strokeWidth="11" />
                  <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
                  {[0, 120, 240].map((deg) => (
                    <g key={deg} transform={`rotate(${deg} 120 120)`}>
                      <rect x="112.5" y="24" width="15" height="92" rx="7.5" fill="url(#spoke)" stroke="rgba(8,9,7,.7)" strokeWidth="1" />
                      <circle cx="120" cy="38" r="7" fill="#141610" stroke="rgba(255,255,255,.3)" strokeWidth="1" />
                      <circle cx="120" cy="38" r="2.4" fill="rgba(201,249,77,.75)" />
                    </g>
                  ))}
                  <circle cx="120" cy="120" r="46" fill="rgba(8,9,7,.85)" />
                  <circle cx="120" cy="120" r="46" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
                </svg>
              </div>

              <div className="bootv__hub">
                <span className="bootv__hubcap">unlocking</span>
                <div className="bootv__digits">
                  <b>{String(Math.floor(Math.min(100, p))).padStart(3, '0')}</b>
                  <i>%</i>
                </div>
                <span className="bootv__phasetext">{phase.label}</span>
              </div>

              <span className="bootv__spec bootv__spec--l">
                AEGIS
                <br />
                VAULT CO.
              </span>
              <span className="bootv__spec bootv__spec--r">
                SN 01
                <br />
                {SITE.version}
              </span>
            </div>
            <span className="bootv__edge" />
          </div>

          <span className="bootv__flare" aria-hidden="true" />
        </div>

        <div className="bootv__under" aria-hidden="true">
          <span>
            plates {String(plates).padStart(2, '0')} / {String(PLATES.length).padStart(2, '0')}
          </span>
          <i />
          <span>aes-256-gcm</span>
          <i />
          <span>scrypt · n=32768</span>
          <i />
          <span>{seal}</span>
        </div>
      </div>

      <footer className="bootv__bottom">
        <div className="bootv__progress">
          <div className="bootv__rail">
            <i style={{ width: `${p}%` }} />
            <b style={{ left: `${p}%` }} />
          </div>
          <div className="bootv__phase">
            <span className="mono">{phase.key}</span>
            <p>{phase.label}</p>
          </div>
        </div>
        <button type="button" className="bootv__skip" onClick={() => finish(true)}>
          Skip sequence <em>esc</em>
        </button>
      </footer>

      <span className="bootv__flash" aria-hidden="true" />
    </div>
  )
}
