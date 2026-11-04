import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Copy, Download as DownloadIcon, HardDrive, ShieldCheck } from 'lucide-react'
import { PLATFORMS, type Platform } from '../config'
import { detectPlatform } from '../lib/platform'
import { useRelease } from '../lib/release'
import { SectionHead } from '../components/ui'

function OSMark({ id }: { id: Platform['id'] }) {
  if (id === 'windows') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M3 4.6l7.6-1v8.1H3V4.6Zm0 14.8l7.6 1v-8.1H3v7.1Zm9.4 1.3L21 22V12.3h-8.6v8.4Zm0-18.4v8.1H21V2l-8.6 1.3Z" fill="currentColor" />
      </svg>
    )
  }
  if (id === 'macos') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 3 2.3 1.2 0 1.7-.8 3.1-.8 1.4 0 1.9.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.8Zm-2.3-5.5c.6-.8 1.1-1.9 1-3-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 2c-2.2 0-3.7 1.4-4.2 3.2C6.6 5.4 5.6 6 4.7 7 3.2 8.7 2.6 11 3 13.6c.5 3.1 2.3 5.9 4.6 7.2.9.5 1.7.6 2.4.3.7.3 1.4.3 2.1.1.7.2 1.5.1 2.3-.4 2.3-1.3 4.1-4.1 4.6-7.2.4-2.6-.2-4.9-1.7-6.6-.9-1-1.9-1.6-3.1-1.8C13.7 3.4 12 2 12 2Z" fill="currentColor" />
    </svg>
  )
}

export function Download() {
  const detected = useMemo(detectPlatform, [])
  const release = useRelease()
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copyHash = async (hash: string, name: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(name)
    } catch {
      setCopied(null)
    }
  }

  const ordered = useMemo(
    () => [...PLATFORMS].sort((a, b) => (a.id === detected ? -1 : b.id === detected ? 1 : 0)),
    [detected],
  )

  return (
    <section className="download section" id="download">
      <div className="container">
        <SectionHead
          eyebrow="08 — Download"
          title={
            <>
              Take it <span className="serif">home.</span>
            </>
          }
          copy="One app, two platforms, no account. Install it, set a master password, and start moving secrets out of browsers and into a file you actually own."
          aside={
            <span className="mono">
              v{release.version} · {release.released}
            </span>
          }
        />

        <div className="dl__grid">
          {ordered.map((platform, index) => {
            const isDetected = platform.id === detected
            const ready = platform.status === 'ready'
            const mac = platform.id === 'macos'
            return (
              <div
                className="dl__card"
                key={platform.id}
                data-detected={isDetected}
                data-pending={!ready}
                data-reveal
                style={{ '--d': index } as React.CSSProperties}
              >
                <div className="dl__head">
                  <span className="dl__os">
                    <OSMark id={platform.id} />
                  </span>
                  <div>
                    <h3>{platform.label}</h3>
                    <p className="mono">{platform.detail}</p>
                  </div>
                  {isDetected && <span className="dl__badge mono">your system</span>}
                </div>

                {ready ? (
                  <>
                    {mac ? (
                      <div className="dl__variants">
                        {[release.assets.macZip, release.assets.macDmg].map((variant) => (
                          <a key={variant.file} className="dl__btn" href={variant.file} download>
                            <span>
                              <DownloadIcon size={15} />
                              {variant.label}
                            </span>
                            <em className="mono">{variant.size}</em>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <a className="btn btn--primary btn--lg dl__single" href={release.assets.windows.file} download>
                        <DownloadIcon size={17} />
                        Download for {platform.label}
                        <span className="mono dl__size">{release.assets.windows.size}</span>
                      </a>
                    )}

                    <dl className="dl__meta mono">
                      <div>
                        <dt>Version</dt>
                        <dd>{release.version}</dd>
                      </div>
                      <div>
                        <dt>Signing</dt>
                        <dd>unsigned</dd>
                      </div>
                      <div>
                        <dt>License</dt>
                        <dd>free forever</dd>
                      </div>
                    </dl>

                    <div className="dl__hash">
                      <span className="mono">SHA-256</span>
                      {mac ? (
                        release.source === 'github' &&
                        release.assets.macZip.sha256 &&
                        release.assets.macDmg.sha256 ? (
                          <div className="dl__hashes">
                            {[release.assets.macZip, release.assets.macDmg].map((variant) => (
                              <button
                                key={variant.file}
                                type="button"
                                className="mono"
                                onClick={() => copyHash(variant.sha256, variant.label)}
                                title={`Copy the SHA-256 for ${variant.label}`}
                              >
                                {variant.label}: {variant.sha256.slice(0, 10)}…{variant.sha256.slice(-6)}
                                {copied === variant.label ? <Check size={10} /> : <Copy size={10} />}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="mono dim">available when online</span>
                        )
                      ) : release.source === 'github' && release.assets.windows.sha256 ? (
                        <button
                          type="button"
                          className="mono"
                          onClick={() => copyHash(release.assets.windows.sha256, 'windows')}
                          title="Copy the Windows SHA-256"
                        >
                          {release.assets.windows.sha256.slice(0, 18)}…{release.assets.windows.sha256.slice(-10)}
                          {copied === 'windows' ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      ) : (
                        <span className="mono dim">available when online</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dl__pendingbox">
                      <HardDrive size={18} />
                      <p>Packaging in progress. The Windows and macOS builds are the ones shipping today.</p>
                    </div>
                    <button type="button" className="btn btn--ghost btn--lg dl__single" disabled>
                      Linux — not yet available
                    </button>
                  </>
                )}
              </div>
            )
          })}

          <span className="dl__sticker" aria-hidden="true">
            <span>free</span>
            <span>forever</span>
            <i>✦</i>
          </span>
        </div>

        <div className="dl__lower">
          <div className="dl__steps" data-reveal>
            <h3 className="dl__sub">Three steps. No accounts.</h3>
            <ol>
              <li>
                <span className="mono">01</span>
                <p>Download the build for your machine.</p>
              </li>
              <li>
                <span className="mono">02</span>
                <p>
                  Windows: run the per-user installer. macOS: unzip, drag <b>Aegis</b> into Applications, then
                  right-click → <b>Open</b> the first time.
                </p>
              </li>
              <li>
                <span className="mono">03</span>
                <p>Set a master password. It is never stored, transmitted or recoverable.</p>
              </li>
            </ol>
            <div className="dl__req mono">
              <span>
                <ShieldCheck size={12} /> Windows 10/11 x64 · macOS 11+
              </span>
              <span>≈ 300–350 MB installed</span>
            </div>
          </div>

          <div className="dl__warn" data-reveal style={{ '--d': 1 } as React.CSSProperties}>
            <div className="dl__warnhead">
              <AlertTriangle size={16} />
              <h3 className="dl__sub">Both builds are unsigned.</h3>
            </div>
            <p>
              There is no code-signing certificate behind these packages — one costs real money and Aegis is free —
              so each system will object exactly once.{' '}
              {release.source === 'github'
                ? `The checksums above are for v${release.version} as shipped.`
                : 'Checksums are unavailable while the release service is offline; the download buttons still resolve to the latest published build.'}
            </p>
            <details>
              <summary className="mono">How to open an unsigned build</summary>
              <ul>
                <li>
                  <b>Windows:</b> SmartScreen appears → <em>More info</em> → <em>Run anyway</em>.
                </li>
                <li>
                  <b>macOS:</b> right-click Aegis → <em>Open</em>, or run{' '}
                  <code>xattr -dr com.apple.quarantine /Applications/Aegis.app</code>.
                </li>
                <li>
                  If macOS calls the bundle damaged, sign it locally with{' '}
                  <code>codesign --force --deep --sign - /Applications/Aegis.app</code>.
                </li>
              </ul>
            </details>
          </div>
        </div>

        <details className="dl__all" data-reveal>
          <summary className="mono">
            All artifacts &amp; full checksums <span>+</span>
          </summary>
          <div className="dl__allrows">
            {[
              { name: release.assets.windows.name, label: 'Windows x64', hash: release.assets.windows.sha256 },
              { name: release.assets.macZip.name, label: 'macOS universal (.zip)', hash: release.assets.macZip.sha256 },
              { name: release.assets.macDmg.name, label: 'macOS universal (.dmg)', hash: release.assets.macDmg.sha256 },
            ].map((row) => (
              <div key={row.name} className="dl__allrow">
                <span className="mono">{row.label}</span>
                <code>{row.name}</code>
                <code className="dl__allhash">
                  {release.source === 'github' && row.hash ? row.hash : 'unavailable offline'}
                </code>
                <button
                  type="button"
                  onClick={() => copyHash(row.hash, row.name)}
                  aria-label={`Copy hash for ${row.name}`}
                  disabled={release.source !== 'github' || !row.hash}
                >
                  {copied === row.name ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  )
}
