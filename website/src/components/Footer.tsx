import { ArrowUp, Download } from 'lucide-react'
import { PLATFORMS, RELEASE, SITE } from '../config'
import { detectPlatform } from '../lib/platform'
import { scrollToTop } from '../lib/smooth'
import { Logo } from './Logo'

export function Footer() {
  const mac = detectPlatform() === 'macos'
  const href = mac ? '#download' : (PLATFORMS.find((p) => p.id === 'windows')?.file ?? RELEASE.windows.file)

  return (
    <footer className="foot">
      <div className="foot__marquee" aria-hidden="true">
        <div className="foot__track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              No cloud <i>✦</i> No telemetry <i>✦</i> No account <i>✦</i> No back door <i>✦</i> No exceptions{' '}
              <i>✦</i>{' '}
            </span>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="foot__top">
          <h2 className="foot__cta">
            Stop renting space
            <br />
            for <em>your own secrets.</em>
          </h2>
          <div className="foot__aside">
            <a className="btn btn--dark btn--lg" href={href} download={!mac}>
              <Download size={16} />
              {mac ? 'Get Aegis for macOS' : 'Download Aegis'}
            </a>
            <span className="mono">
              v{SITE.version} · Windows + macOS · free forever
            </span>
          </div>
        </div>

        <div className="foot__cols">
          <div>
            <a href="#top" className="foot__brand" aria-label="Aegis home">
              <Logo size={28} />
              <span>Aegis</span>
            </a>
            <p className="foot__tag" style={{ marginTop: 14 }}>
              {SITE.tagline} One file, one password, one machine — yours.
            </p>
          </div>
          <div className="foot__col">
            <h4>Product</h4>
            <a href="#product">Overview</a>
            <a href="#tour">Tour</a>
            <a href="#forge">Password forge</a>
            <a href="#download">Download</a>
          </div>
          <div className="foot__col">
            <h4>Read</h4>
            <a href="#security">Security model</a>
            <a href="#anatomy">Anatomy of the file</a>
            <a href="#compare">Honest comparison</a>
            <a href="#faq">FAQ</a>
            <a href="#download">Checksums</a>
          </div>
          <div className="foot__col">
            <h4>Fine print</h4>
            <span>Unsigned builds</span>
            <span>No account · no recovery</span>
            <span>Windows 10/11 · macOS 11+</span>
            <button type="button" onClick={scrollToTop} className="foot__top-btn">
              Back to top <ArrowUp size={12} />
            </button>
          </div>
        </div>

        <div className="foot__word" aria-hidden="true">
          <span>A</span>
          <span>E</span>
          <span className="foot__mark">G</span>
          <span>I</span>
          <span>S</span>
        </div>

        <div className="foot__base">
          <span>© 2026 Aegis — built for the paranoid</span>
          <span>Made on a machine, for your machine.</span>
          <span>No cookies. No analytics. No pixels.</span>
        </div>
      </div>
    </footer>
  )
}
