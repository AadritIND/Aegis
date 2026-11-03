import { useEffect, useState } from 'react'
import {
  Braces,
  Command,
  Copy,
  CreditCard,
  Download,
  FileText,
  Fingerprint,
  Gauge,
  KeyRound,
  LockKeyhole,
  MousePointerClick,
  Palette,
  ShieldCheck,
  Sparkles,
  Timer,
  Upload,
  Wand2,
} from 'lucide-react'
import { SectionHead, Tilt } from '../components/ui'

const TYPES = [
  { icon: KeyRound, name: 'Login', fields: 'user · pass · 2FA' },
  { icon: Braces, name: 'API key', fields: 'endpoint · scope' },
  { icon: CreditCard, name: 'Card', fields: 'number · exp · CVC' },
  { icon: FileText, name: 'Note', fields: 'free-form' },
  { icon: Fingerprint, name: 'Identity', fields: 'name · address' },
]

const SMALL = [
  { icon: Copy, label: 'Clipboard clears in 30s' },
  { icon: ShieldCheck, label: 'k-anonymous breach check' },
  { icon: Upload, label: 'CSV import' },
  { icon: Download, label: 'Encrypted export' },
  { icon: Command, label: 'Global hotkey' },
  { icon: Palette, label: 'Four tints' },
  { icon: Timer, label: 'Live TOTP' },
  { icon: Sparkles, label: 'Zero telemetry' },
]

function useTotpPreview() {
  const [seconds, setSeconds] = useState(() => 30 - (Math.floor(Date.now() / 1000) % 30))
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(30 - (Math.floor(Date.now() / 1000) % 30)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const step = Math.floor(Date.now() / 30000)
  const digits = String((step * 7919 + 1337) % 1000000).padStart(6, '0')
  return { code: `${digits.slice(0, 3)} ${digits.slice(3)}`, seconds }
}

export function Bento() {
  const totp = useTotpPreview()

  return (
    <section className="bento section" id="product">
      <div className="container">
        <SectionHead
          dark
          eyebrow="01 — The product"
          title={
            <>
              One window.
              <br />
              <span className="serif-accent">No server</span> behind it.
            </>
          }
          copy="Everything you expect from a password manager, rebuilt around a single idea: the only machine that ever sees your secrets should be the one on your desk."
          aside={<span className="mono dim">Electron · Windows · macOS</span>}
        />

        <div className="bento__grid">
          <div className="bento__cell bento__cell--a" data-reveal>
            <Tilt className="tile tile--ink" strength={4}>
              <div className="tile__head">
                <span className="tile__glyph">
                  <LockKeyhole size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">01 — Custody</span>
              </div>
              <h3 className="tile__title">
                Sealed on
                <br />
                your disk.
              </h3>
              <p className="tile__body">
                One file, encrypted with AES-256-GCM under a key derived from your master password. Copy it to a
                USB stick and you have a complete backup. Lose the password and it is a rock.
              </p>
              <div className="envelope" aria-hidden="true">
                <div className="envelope__bar">
                  <span className="mono">
                    <LockKeyhole size={9} /> aegis.vault
                  </span>
                  <span className="mono envelope__sealed">sealed</span>
                </div>
                <pre>{`{
  "format": "aegis-vault/v1",
  "cipher": "aes-256-gcm",
  "kdf": { "name": "scrypt", "N": 32768 },
  "salt": "b64:9f3c…",
  "payload": "██████████  41.2 KB"
}`}</pre>
                <span className="envelope__scan" />
              </div>
            </Tilt>
          </div>

          <div className="bento__cell bento__cell--b" data-reveal style={{ '--d': 1 } as React.CSSProperties}>
            <Tilt className="tile tile--violet" strength={5}>
              <div className="tile__head">
                <span className="tile__glyph">
                  <Sparkles size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">02 — Structure</span>
              </div>
              <h3 className="tile__title">Every secret has a shape.</h3>
              <p className="tile__body">
                Logins, keys, cards, notes and identities each get their own editor, their own fields and their own
                glyph. A full vault still reads in one pass.
              </p>
              <ul className="typelist" aria-hidden="true">
                {TYPES.map((type) => (
                  <li key={type.name}>
                    <span className="typelist__icon">
                      <type.icon size={14} strokeWidth={1.9} />
                    </span>
                    <b>{type.name}</b>
                    <span className="mono">{type.fields}</span>
                  </li>
                ))}
              </ul>
            </Tilt>
          </div>

          <div className="bento__cell bento__cell--c" data-reveal style={{ '--d': 1 } as React.CSSProperties}>
            <Tilt className="tile tile--paper" strength={5}>
              <div className="tile__head">
                <span className="tile__glyph tile__glyph--ink">
                  <MousePointerClick size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">03 — Autofill</span>
              </div>
              <h3 className="tile__title">Autofill, minus the middleman.</h3>
              <p className="tile__body">
                Aegis has its own secure browser window. Logins match by domain and fill only when you ask — no
                content script living inside your everyday browser.
              </p>
              <div className="minibrowser" aria-hidden="true">
                <div className="minibrowser__bar">
                  <i />
                  <i />
                  <i />
                  <span className="mono">
                    <LockKeyhole size={8} /> app.linear.app
                  </span>
                  <em className="mono">local</em>
                </div>
                <div className="minibrowser__row">
                  <span className="mono">email</span>
                  <b>alex@studio.co</b>
                </div>
                <div className="minibrowser__row">
                  <span className="mono">password</span>
                  <b>••••••••••••</b>
                  <em className="minibrowser__fill">Fill</em>
                </div>
              </div>
            </Tilt>
          </div>

          <div className="bento__cell bento__cell--d" data-reveal style={{ '--d': 2 } as React.CSSProperties}>
            <Tilt className="tile tile--ink" strength={5}>
              <div className="tile__head">
                <span className="tile__glyph">
                  <Gauge size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">04 — Posture</span>
              </div>
              <h3 className="tile__title">An audit that tells the truth.</h3>
              <div className="score">
                <div className="score__ring">
                  <div>
                    <b>86</b>
                    <span className="mono">/ 100</span>
                  </div>
                </div>
                <ul className="score__list">
                  <li>
                    <span>3</span> reused
                  </li>
                  <li>
                    <span>1</span> weak
                  </li>
                  <li>
                    <span>2</span> ageing
                  </li>
                </ul>
              </div>
              <p className="tile__body">
                Checked locally: reuse, length, age and known-breach exposure. No score is uploaded anywhere.
              </p>
            </Tilt>
          </div>

          <div className="bento__cell bento__cell--e" data-reveal style={{ '--d': 2 } as React.CSSProperties}>
            <Tilt className="tile tile--acid" strength={5}>
              <div className="tile__head">
                <span className="tile__glyph tile__glyph--ink">
                  <Wand2 size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">05 — Forge</span>
              </div>
              <h3 className="tile__title">A generator with taste.</h3>
              <div className="miniforge" aria-hidden="true">
                <code>v3x!Qm8#Lr2@Wd7$Ka</code>
                <span className="mono">118 bits</span>
              </div>
              <div className="entropy" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((bar) => (
                  <i key={bar} />
                ))}
              </div>
              <p className="tile__body tile__body--ink">
                Random or passphrase, ambiguous characters optional, entropy counted honestly.
              </p>
              <a className="tile__link" href="#forge">
                Try it live <span>→</span>
              </a>
            </Tilt>
          </div>

          <div className="bento__cell bento__cell--f" data-reveal style={{ '--d': 3 } as React.CSSProperties}>
            <Tilt className="tile tile--ink" strength={5}>
              <div className="tile__head">
                <span className="tile__glyph">
                  <Timer size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">06 — Second factor</span>
              </div>
              <h3 className="tile__title">2FA, on device.</h3>
              <div className="totp">
                <div className="totp__meta">
                  <span className="mono">github · alex</span>
                  <span className="mono">TOTP</span>
                </div>
                <b>{totp.code}</b>
                <div className="totp__bar">
                  <i style={{ width: `${(totp.seconds / 30) * 100}%` }} />
                </div>
                <span className="mono dim">{totp.seconds}s until next code</span>
              </div>
              <p className="tile__body">
                Seeds live in the vault, codes are generated here. Nothing to sync, nothing to intercept.
              </p>
            </Tilt>
          </div>

          <div className="bento__cell bento__cell--g" data-reveal style={{ '--d': 3 } as React.CSSProperties}>
            <Tilt className="tile tile--paper" strength={4}>
              <div className="tile__head">
                <span className="tile__glyph tile__glyph--ink">
                  <Sparkles size={18} strokeWidth={1.9} />
                </span>
                <span className="tile__tag mono">07 — Everything else</span>
              </div>
              <h3 className="tile__title">
                The small things
                <br />
                are the whole thing.
              </h3>
              <ul className="smallthings">
                {SMALL.map((item) => (
                  <li key={item.label}>
                    <item.icon size={13} strokeWidth={2} />
                    {item.label}
                  </li>
                ))}
              </ul>
            </Tilt>
          </div>
        </div>
      </div>
    </section>
  )
}
