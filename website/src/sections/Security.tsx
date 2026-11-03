import { ArrowUpRight, LockKeyhole, ShieldCheck, WifiOff } from 'lucide-react'
import { SectionHead } from '../components/ui'

const FLOW = [
  { n: '01', title: 'Master password', sub: 'only in RAM · never stored' },
  { n: '02', title: 'scrypt', sub: 'N=32768 · r=8 · p=1' },
  { n: '03', title: '256-bit key', sub: 'derived, then dropped' },
  { n: '04', title: 'AES-256-GCM', sub: 'authenticated encryption' },
  { n: '05', title: 'aegis.vault', sub: 'one file · your disk' },
]

export function Security() {
  return (
    <section className="security section" id="security">
      <div className="security__grid-bg" aria-hidden="true" />
      <div className="container">
        <SectionHead
          dark
          eyebrow="04 — Security model"
          title={
            <>
              Zero knowledge isn&rsquo;t a feature.
              <br />
              It&rsquo;s the <span className="serif">floor plan.</span>
            </>
          }
          copy="There is no Aegis server to trust, subpoena or breach. The key is derived on your machine, used on your machine and never written anywhere but memory."
          aside={<span className="mono">Independent of us, by design</span>}
        />

        <div className="security__body">
          <div className="flow" data-reveal>
            <div className="flow__head">
              <span className="mono">Unlock path</span>
              <span className="mono flow__badge">
                <LockKeyhole size={9} /> local only
              </span>
            </div>

            <ol className="flow__list">
              {FLOW.map((step) => (
                <li key={step.n}>
                  <span className="flow__n mono">{step.n}</span>
                  <div>
                    <b>{step.title}</b>
                    <span className="mono">{step.sub}</span>
                  </div>
                  <i className="flow__node" aria-hidden="true" />
                </li>
              ))}
            </ol>

            <div className="flow__dead">
              <span className="flow__deadline" aria-hidden="true" />
              <WifiOff size={15} />
              <div>
                <b>remote endpoint</b>
                <span className="mono">never called · no DNS · no socket</span>
              </div>
              <span className="flow__cross mono">0</span>
            </div>
          </div>

          <div className="envelope-card" data-reveal style={{ '--d': 1 } as React.CSSProperties}>
            <div className="envelope-card__head">
              <span className="mono">
                <LockKeyhole size={10} /> aegis.vault
              </span>
              <span className="envelope-card__seal mono">
                <span /> sealed
              </span>
            </div>
            <pre className="envelope-card__code">
              <span className="ln">1</span>
              <span className="k">"format"</span>
              <span className="p">: </span>
              <span className="s">"aegis-vault/v1"</span>
              <span className="p">,</span>
              {'\n'}
              <span className="ln">2</span>
              <span className="k">"cipher"</span>
              <span className="p">: </span>
              <span className="s">"aes-256-gcm"</span>
              <span className="p">,</span>
              {'\n'}
              <span className="ln">3</span>
              <span className="k">"kdf"</span>
              <span className="p">: {'{ '}</span>
              <span className="k">"name"</span>
              <span className="p">: </span>
              <span className="s">"scrypt"</span>
              <span className="p">, </span>
              <span className="k">"N"</span>
              <span className="p">: </span>
              <span className="num">32768</span>
              <span className="p"> {'}'},</span>
              {'\n'}
              <span className="ln">4</span>
              <span className="k">"salt"</span>
              <span className="p">: </span>
              <span className="s">"b64:9f3c 41a2 8d77 …"</span>
              <span className="p">,</span>
              {'\n'}
              <span className="ln">5</span>
              <span className="k">"iv"</span>
              <span className="p">: </span>
              <span className="s">"b64:2a7e 6c19 …"</span>
              <span className="p">,</span>
              {'\n'}
              <span className="ln">6</span>
              <span className="k">"tag"</span>
              <span className="p">: </span>
              <span className="s">"b64:c41d 00f8 …"</span>
              <span className="p">,</span>
              {'\n'}
              <span className="ln">7</span>
              <span className="k">"payload"</span>
              <span className="p">: </span>
              <span className="s">"b64:z0Kq … 41.2 KB"</span>
              {'\n'}
              <span className="ln">8</span>
              <span className="p">{'}'}</span>
            </pre>
            <div className="envelope-card__foot">
              <ShieldCheck size={14} />
              <p>Without the password this is indistinguishable from noise. There is no recovery path to brute-force.</p>
            </div>
          </div>
        </div>

        <div className="security__facts">
          <div>
            <b>2¹⁵</b>
            <span className="mono">scrypt iterations</span>
            <p>Memory-hard by design, so guessing is expensive even with a GPU farm.</p>
          </div>
          <div>
            <b>96-bit</b>
            <span className="mono">random salt</span>
            <p>Unique per vault. The same password never derives the same key twice.</p>
          </div>
          <div>
            <b>0</b>
            <span className="mono">remote calls</span>
            <p>No analytics, no crash reports, no licensing check. The network stack is idle.</p>
          </div>
          <a className="security__link" href="#faq">
            <span className="mono">Read the honest FAQ</span>
            <ArrowUpRight size={18} />
          </a>
        </div>
      </div>
    </section>
  )
}
