import { useLayoutEffect, useRef, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { scrollToY } from '../lib/smooth'
import { useReducedMotion } from '../lib/useReducedMotion'
import { SectionHead } from '../components/ui'
import { SITE } from '../config'

const SHOTS = [
  {
    file: './shots/dashboard.webp',
    alt: 'Aegis dashboard showing vault posture and recent items',
    title: 'The morning view',
    copy: 'Posture, expiring secrets, recent changes and every quick action — one screen, no dashboard theatre.',
    url: 'aegis / dashboard',
  },
  {
    file: './shots/vault.webp',
    alt: 'Aegis vault list with typed secrets',
    title: 'An index, not a spreadsheet',
    copy: 'Every secret is typed, searchable and readable at a glance. Favourites rise; clutter does not.',
    url: 'aegis / vault',
  },
  {
    file: './shots/detail.webp',
    alt: 'Aegis item detail with revealed password and TOTP',
    title: 'One secret, whole',
    copy: 'Reveal, copy, rotate, inspect history. The password, the TOTP and the notes travel together.',
    url: 'aegis / vault / linear',
  },
  {
    file: './shots/autofill.webp',
    alt: 'Aegis secure browser window filling a login',
    title: 'Fill on request',
    copy: 'Aegis owns the browser window, matches logins by domain and waits for a deliberate click.',
    url: 'aegis://browser',
  },
  {
    file: './shots/forge.webp',
    alt: 'Aegis password forge with entropy meter',
    title: 'The forge',
    copy: 'Rejection-sampled randomness, passphrase mode, live entropy. Nothing generated ever leaves the app.',
    url: 'aegis / forge',
  },
  {
    file: './shots/audit.webp',
    alt: 'Aegis audit panel with local scan results',
    title: 'The honest audit',
    copy: 'Reuse, weakness, age and breach exposure — measured on this machine and stored nowhere else.',
    url: 'aegis / audit',
  },
]

export function Tour() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const deck = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 900px)', () => {
      const steps = SHOTS.length - 1
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          id: 'tour-pin',
          trigger: stage.current,
          start: 'top top',
          end: `+=${Math.round(window.innerHeight * steps * 0.78)}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const index = Math.min(SHOTS.length - 1, Math.round(self.progress * steps))
            setActive(index)
            setProgress(self.progress)
          },
        },
      })

      tl.fromTo(
        deck.current,
        { rotateY: 5.5, rotateX: -2.2 },
        { rotateY: -5.5, rotateX: 2.2, duration: 1 },
        0,
      )

      const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 350)
      return () => window.clearTimeout(refresh)
    })

    return () => mm.revert()
  }, [reduced])

  const jump = (index: number) => {
    const st = ScrollTrigger.getById('tour-pin') as ScrollTrigger | undefined
    if (!st) {
      setActive(index)
      setProgress(index / Math.max(1, SHOTS.length - 1))
      return
    }
    const fraction = index / Math.max(1, SHOTS.length - 1)
    scrollToY(st.start + (st.end - st.start) * fraction)
  }

  const shot = SHOTS[active]

  return (
    <section className="tour" id="tour" ref={root}>
      <div className="container">
        <SectionHead
          eyebrow="03 — Product tour"
          title={
            <>
              Look <span className="serif-accent">inside.</span>
            </>
          }
          copy="Six real screens from the app, not renders. Scroll to walk through the parts that matter, from the morning dashboard to the audit that tells you what to fix."
          aside={<span className="mono dim">Actual build · v{SITE.version}</span>}
        />
      </div>

      <div className="tour__stage" ref={stage} data-active={active}>
        <span className="tour__ghost" aria-hidden="true">
          03
        </span>
        <span className="tour__beam" aria-hidden="true" />
        <span className="tour__orbit tour__orbit--a" aria-hidden="true" />
        <span className="tour__orbit tour__orbit--b" aria-hidden="true" />

        <div className="tour__deck" ref={deck}>
          <div className="tour__frame">
            <div className="tour__chrome">
              <span className="tour__dots">
                <i />
                <i />
                <i />
              </span>
              <span className="mono tour__url">
                <LockKeyhole size={9} /> {shot.url}
              </span>
              <span className="mono tour__local">local</span>
            </div>
            <div className="tour__shot">
              {SHOTS.map((item, index) => (
                <img
                  key={item.file}
                  src={item.file}
                  alt={item.alt}
                  width={1440}
                  height={900}
                  loading="eager"
                  data-on={active === index}
                />
              ))}
              <span className="tour__scan" key={active} aria-hidden="true" />
              <span className="tour__screen mono" aria-hidden="true">
                screen {String(active + 1).padStart(2, '0')} / {String(SHOTS.length).padStart(2, '0')}
              </span>
            </div>
            <span className="tour__reflection" aria-hidden="true" />
          </div>

          <div className="tour__caption" key={active}>
            <span className="mono tour__num">{String(active + 1).padStart(2, '0')}</span>
            <div>
              <h3>{shot.title}</h3>
              <p>{shot.copy}</p>
            </div>
          </div>
        </div>

        <span className="tour__tag tour__tag--l mono" aria-hidden="true">
          unretouched · six screens
        </span>
        <span className="tour__tag tour__tag--r mono" aria-hidden="true">
          local session · 0 network
        </span>

        <div className="tour__hud container">
          <div className="tour__rail">
            {SHOTS.map((item, index) => (
              <button
                key={item.file}
                type="button"
                className="tour__railbtn"
                data-on={active === index}
                onClick={() => jump(index)}
                aria-label={`Show ${item.title}`}
              >
                <i />
                <span className="mono">{item.title}</span>
              </button>
            ))}
          </div>
          <div className="tour__count mono">
            <span>{String(active + 1).padStart(2, '0')}</span> / {String(SHOTS.length).padStart(2, '0')}
          </div>
        </div>

        <div className="tour__progress" aria-hidden="true">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  )
}
