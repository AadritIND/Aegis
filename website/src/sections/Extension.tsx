import {
  ArrowUpRight,
  Check,
  Link2,
  LockKeyhole,
  MousePointerClick,
  Puzzle,
  Save,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { SectionHead } from '../components/ui'
import { useRelease } from '../lib/release'

const FEATURES = [
  {
    icon: Link2,
    title: 'Pair once, locally',
    copy: 'A six-digit code from inside your unlocked vault authorises the browser. No account, no email, no cloud handshake.',
  },
  {
    icon: MousePointerClick,
    title: 'Domain-matched fill',
    copy: 'The extension asks Aegis which logins match the active site. Only the one you choose comes back across the loopback bridge.',
  },
  {
    icon: Save,
    title: 'Auto-save, if you want it',
    copy: 'A submitted login can create or update the matching item in your encrypted vault. Switch it off in the popup at any time.',
  },
  {
    icon: ShieldCheck,
    title: 'Revocable by design',
    copy: 'Aegis stores only a hash of each browser token. Unpair a browser from the app or the extension whenever you like.',
  },
]

export function Extension() {
  const { version } = useRelease()

  return (
    <section className="extension section" id="extension">
      <span className="extension__glow extension__glow--a" aria-hidden="true" />
      <span className="extension__glow extension__glow--b" aria-hidden="true" />
      <div className="container">
        <SectionHead
          eyebrow="04 — Browser extension"
          title={
            <>
              Your everyday browser.
              <br />
              <span className="serif-accent">Still your vault.</span>
            </>
          }
          copy="Aegis now ships a companion extension for Chrome, Edge, Brave and Arc. It connects to the desktop app over loopback, fills the login you choose, and can save a submitted credential straight into the encrypted vault."
          aside={
            <span className="mono">
              Included with <b>v{version}</b> · Windows · macOS · Linux
            </span>
          }
        />

        <div className="extension__grid">
          <div className="extension__visual" data-reveal>
            <div className="ext-browser">
              <div className="ext-browser__chrome">
                <span className="ext-browser__dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="mono ext-browser__url">
                  <LockKeyhole size={9} /> github.com/login
                </span>
                <span className="mono ext-browser__local">local</span>
              </div>
              <div className="ext-browser__page">
                <div className="ext-page">
                  <span className="mono ext-page__eyebrow">Sign in</span>
                  <h3>Welcome back.</h3>
                  <label className="ext-field">
                    <span>Email</span>
                    <b>alex@studio.co</b>
                  </label>
                  <label className="ext-field">
                    <span>Password</span>
                    <b>••••••••••••••</b>
                  </label>
                  <span className="ext-page__submit">Sign in</span>
                </div>

                <div className="ext-pop" aria-hidden="true">
                  <div className="ext-pop__head">
                    <span className="ext-pop__mark">A</span>
                    <div>
                      <b>Aegis</b>
                      <small>LOCAL COMPANION</small>
                    </div>
                    <span className="ext-pop__status">
                      <i /> connected
                    </span>
                  </div>
                  <div className="ext-pop__site">
                    <span>github.com</span>
                    <small>3 logins</small>
                  </div>
                  <div className="ext-pop__row ext-pop__row--active">
                    <span className="ext-pop__avatar">GH</span>
                    <span>
                      <b>GitHub</b>
                      <small>alex@studio.co</small>
                    </span>
                    <em>Fill</em>
                  </div>
                  <div className="ext-pop__row">
                    <span className="ext-pop__avatar">GH</span>
                    <span>
                      <b>GitHub · work</b>
                      <small>alex@studio.dev</small>
                    </span>
                    <em>Fill</em>
                  </div>
                  <div className="ext-pop__foot">
                    <span>
                      <Check size={10} /> Auto-save on
                    </span>
                    <span>Alt+Shift+F</span>
                  </div>
                </div>

                <span className="ext-toast">
                  <span className="ext-toast__mark">
                    <Zap size={10} />
                  </span>
                  Filled by Aegis · GitHub
                </span>
              </div>
            </div>

            <div className="extension__captions">
              <span className="mono">
                <ShieldCheck size={11} /> 127.0.0.1 only
              </span>
              <span className="mono">
                <LockKeyhole size={11} /> token hash stored
              </span>
              <span className="mono">
                <Puzzle size={11} /> no credentials in browser storage
              </span>
            </div>
          </div>

          <div className="extension__side">
            <div className="extension__features">
              {FEATURES.map((feature, index) => (
                <article
                  className="ext-feature"
                  key={feature.title}
                  data-reveal
                  style={{ '--d': index } as React.CSSProperties}
                >
                  <span className="ext-feature__icon">
                    <feature.icon size={16} />
                  </span>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.copy}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="ext-install" data-reveal>
              <div className="ext-install__head">
                <span className="mono">Install from inside Aegis</span>
                <Puzzle size={17} />
              </div>
              <h3>One desktop app. Two places to browse.</h3>
              <p>
                Unlock Aegis, open <b>Settings → Browser extension</b>, and press{' '}
                <b>Prepare extension</b>. The app copies the companion package to Downloads and
                walks you through loading it in your browser. Enter the pairing code once; the
                extension and vault find each other locally from then on.
              </p>
              <div className="ext-install__foot">
                <span className="mono">
                  <Check size={11} /> Chrome · Edge · Brave · Arc
                </span>
                <a className="btn btn--primary btn--sm" href="#download">
                  Get Aegis {version} <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
