import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'
import { useReducedMotion } from '../lib/useReducedMotion'

const LEDGER = [
  {
    n: '00',
    key: 'accounts',
    body: 'There is no login screen because there is no account. No profile, no identity to leak.',
  },
  {
    n: '00',
    key: 'servers',
    body: 'No sync endpoint, no relay, no database with your name on it. Nowhere to send it is nowhere to breach it.',
  },
  {
    n: '00',
    key: 'telemetry',
    body: 'No analytics, no crash pings, no usage graph. Nothing phones home.',
  },
  {
    n: '00',
    key: 'recovery',
    body: 'No reset link, no key escrow, no backdoor. We cannot recover your vault — and neither can anyone else.',
  },
  {
    n: '01',
    key: 'file',
    body: 'aegis.vault. AES-256-GCM. On your disk, under your control.',
    lead: true,
  },
]

export function Manifesto() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return
    const mm = gsap.matchMedia()

    mm.add('(min-width: 900px)', () => {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        })

        /* Act one — the statement opens up as the section pins. */
        tl.to('.manifesto__ghost--one', { scale: 1.16, xPercent: -4, opacity: 0.18, duration: 0.62 }, 0)
        tl.to('.manifesto__halo', { rotate: 16, y: -26, duration: 0.62 }, 0)
        tl.to('.manifesto__ring', { rotate: 9, scale: 1.04, duration: 0.62 }, 0)
        tl.to('.manifesto__type', { yPercent: -5, scale: 1.02, duration: 0.62 }, 0)
        tl.to('.mline[data-line="1"]', { xPercent: -9, duration: 0.62 }, 0)
        tl.to('.mline[data-line="2"]', { xPercent: 6, duration: 0.62 }, 0)
        tl.to('.mline[data-line="3"]', { xPercent: 8, duration: 0.62 }, 0)
        tl.to('.manifesto__note', { y: -24, duration: 0.6 }, 0)
        tl.to('.manifesto__stamp--one', { rotate: 4, y: -16, duration: 0.6 }, 0)
        tl.to('.manifesto__ruler i', { opacity: 0.9, stagger: 0.015, duration: 0.12 }, 0.02)

        /* The page turns: act one leaves, act two arrives. */
        tl.to('.manifesto__ghost--one', { opacity: 0.06, duration: 0.3 }, 0.44)
        tl.to(
          '.manifesto__inner',
          { yPercent: -7, scale: 0.95, opacity: 0, filter: 'blur(5px)', duration: 0.15, ease: 'power2.in' },
          0.39,
        )
        tl.fromTo(
          '.manifesto__ghost--two',
          { autoAlpha: 0, scale: 0.94, xPercent: 5 },
          { autoAlpha: 1, scale: 1.02, xPercent: 0, duration: 0.3, ease: 'power2.out' },
          0.38,
        )
        tl.fromTo(
          '.manifesto__ledger',
          { autoAlpha: 0, y: 42 },
          { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' },
          0.48,
        )
        tl.fromTo(
          '.manifesto__ledgerhead',
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.16, ease: 'power2.out' },
          0.49,
        )
        tl.fromTo(
          '.mledger__row',
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.13, stagger: 0.03, ease: 'power2.out' },
          0.51,
        )
        tl.fromTo(
          '.mledger__rule',
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.15, stagger: 0.03 },
          0.51,
        )
        tl.fromTo(
          '.manifesto__ledgerfoot',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.16 },
          0.72,
        )
        tl.fromTo(
          '.manifesto__scan',
          { y: -240, opacity: 0 },
          { y: 260, opacity: 1, duration: 0.32 },
          0.54,
        )
        tl.to('.manifesto__scan', { opacity: 0, duration: 0.06 }, 0.94)
        tl.to('.manifesto__ruler i', { opacity: 1, stagger: 0.006, duration: 0.06 }, 0.72)

        /* Entrance — words come up to full white as the section arrives. */
        gsap.fromTo(
          '.mword',
          { opacity: 0.3 },
          {
            opacity: 1,
            stagger: 0.09,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top 82%', end: 'top 24%', scrub: true },
          },
        )
      }, root)
      return () => ctx.revert()
    })

    return () => mm.revert()
  }, [reduced])

  return (
    <section className="manifesto" ref={root} aria-label="Manifesto" data-static={reduced}>
      <div className="manifesto__stage">
        <span className="manifesto__ghost manifesto__ghost--one" aria-hidden="true">
          LOCAL
        </span>
        <span className="manifesto__ghost manifesto__ghost--two" aria-hidden="true">
          ZERO
        </span>
        <span className="manifesto__halo" aria-hidden="true" />
        <span className="manifesto__ring" aria-hidden="true" />

        <div className="container manifesto__inner">
          <div className="manifesto__top">
            <span className="eyebrow">02 — Manifesto</span>
            <span className="mono">a note on custody</span>
          </div>

          <div className="manifesto__type" aria-label="The cloud is just someone else's disk.">
            <span className="mline" data-line="1">
              <span className="mword">The</span> <span className="mword">cloud</span>{' '}
              <span className="mword">is</span>
            </span>
            <span className="mline mline--outline" data-line="2">
              <span className="mword">just</span> <span className="mword">someone</span>
            </span>
            <span className="mline" data-line="3">
              <span className="mword">
                <em className="serif">else&rsquo;s</em>
              </span>{' '}
              <span className="mword">disk.</span>
            </span>
          </div>

          <div className="manifesto__bottom">
            <p className="manifesto__note">
              So we removed the cloud. Aegis is not a service you subscribe to — it is a file you own, a password
              you remember, and a program with nowhere to send your data.
              <span className="manifesto__notemore">
                The only thing you give up is the convenience of someone else holding the key.
              </span>
            </p>
            <div className="manifesto__stamp manifesto__stamp--one" aria-hidden="true">
              <span>No</span>
              <b>SERVER</b>
              <span>Attached</span>
            </div>
          </div>
        </div>

        <div className="manifesto__ledger">
          <div className="manifesto__top">
            <span className="eyebrow">02.1 — The receipts</span>
            <span className="mono">an inventory of what isn&rsquo;t attached</span>
          </div>

          <div className="container manifesto__ledgerinner">
            <div className="manifesto__ledgerhead">
              <h3 className="manifesto__ledgertitle">
                Nothing <em className="serif">attached.</em>
              </h3>
              <p className="manifesto__ledgersub">
                A cloud service carries servers, accounts, analytics, a support desk and a database. Aegis
                carries a file.
              </p>
            </div>

            <ol className="mledger">
              {LEDGER.map((row) => (
                <li className="mledger__row" key={row.key} data-lead={row.lead || undefined}>
                  <span className="mledger__num">{row.n}</span>
                  <span className="mledger__key mono">{row.key}</span>
                  <p className="mledger__body">{row.body}</p>
                  <span className="mledger__state mono">{row.lead ? 'local' : 'none'}</span>
                  <i className="mledger__rule" aria-hidden="true" />
                </li>
              ))}
            </ol>

            <div className="manifesto__ledgerfoot">
              <p className="manifesto__closing">
                The cloud ends at your desk.
                <span className="mono">zero strings attached</span>
              </p>
              <div className="manifesto__stamp manifesto__stamp--zero" aria-hidden="true">
                <span>Zero</span>
                <b>ATTACHED</b>
                <span>Ever</span>
              </div>
            </div>
          </div>

          <span className="manifesto__scan" aria-hidden="true" />
        </div>

        <div className="manifesto__ruler" aria-hidden="true">
          {Array.from({ length: 11 }).map((_, index) => (
            <i key={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
