import { Check, Minus, X } from 'lucide-react'
import { SectionHead } from '../components/ui'

const CLOUD = [
  { kind: 'no', text: 'Secrets live on their servers' },
  { kind: 'no', text: 'Account, subscription, recovery email' },
  { kind: 'no', text: 'One breach surface for every customer' },
  { kind: 'yes', text: 'Polished browser extension' },
  { kind: 'yes', text: 'Automatic sync across devices' },
  { kind: 'meh', text: '$4–12 per month, forever' },
]

const LOCAL = [
  { kind: 'yes', text: 'One encrypted file on your disk' },
  { kind: 'yes', text: 'No account, no email, free forever' },
  { kind: 'yes', text: 'Breach surface: the file you hold' },
  { kind: 'meh', text: 'Manual sync, on purpose' },
  { kind: 'no', text: 'No browser extension yet' },
  { kind: 'yes', text: 'Offline always · Windows + macOS' },
]

function Mark({ kind }: { kind: string }) {
  if (kind === 'yes') return <Check size={14} strokeWidth={2.6} />
  if (kind === 'no') return <X size={14} strokeWidth={2.6} />
  return <Minus size={14} strokeWidth={2.6} />
}

export function Compare() {
  return (
    <section className="compare section" id="compare">
      <div className="container">
        <SectionHead
          dark
          eyebrow="07 — Honestly"
          title={
            <>
              Cloud vaults are convenient.
              <br />
              We&rsquo;re <span className="serif">something else.</span>
            </>
          }
          copy="A comparison that concedes what it should. Aegis is not trying to be the most feature-complete manager on earth — it is trying to be the one that cannot lose your data for you."
        />

        <div className="compare__grid" data-reveal>
          <div className="compare__card compare__card--cloud">
            <div className="compare__head">
              <span className="mono">The default</span>
              <h3>Cloud vault</h3>
              <span className="compare__price mono">$4–12 / mo</span>
            </div>
            <ul>
              {CLOUD.map((row) => (
                <li key={row.text} data-kind={row.kind}>
                  <i>
                    <Mark kind={row.kind} />
                  </i>
                  {row.text}
                </li>
              ))}
            </ul>
          </div>

          <span className="compare__vs" aria-hidden="true">
            vs
          </span>

          <div className="compare__card compare__card--aegis">
            <span className="compare__sticker mono">free forever</span>
            <div className="compare__head">
              <span className="mono">The vault</span>
              <h3>
                Aegis <span className="serif">local</span>
              </h3>
              <span className="compare__price mono">$0</span>
            </div>
            <ul>
              {LOCAL.map((row) => (
                <li key={row.text} data-kind={row.kind}>
                  <i>
                    <Mark kind={row.kind} />
                  </i>
                  {row.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="compare__note" data-reveal>
          <span className="mono">Full disclosure</span>
          <p>
            We concede two rows. Cloud managers already sync automatically and ship a mature browser extension — if
            those matter more to you than custody, they are the better tool. Aegis is for the other trade-off.
          </p>
        </div>
      </div>
    </section>
  )
}
