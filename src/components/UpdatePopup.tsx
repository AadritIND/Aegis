import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownToLine, Check, RefreshCw, Sparkles, X } from 'lucide-react'
import { useUpdater } from '../lib/updater'

const mb = (bytes = 0) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

function speed(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB/s`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`
}

export function UpdatePopup() {
  const { state, download, install } = useUpdater()
  const [dismissed, setDismissed] = useState('')
  const key = `${state.status}:${state.version ?? ''}`
  const visible =
    (state.status === 'available' ||
      state.status === 'downloading' ||
      state.status === 'downloaded') &&
    dismissed !== key

  const title =
    state.status === 'available'
      ? `Aegis ${state.version} is here`
      : state.status === 'downloading'
        ? 'Pulling the update'
        : 'Restart to finish'

  const eyebrow =
    state.status === 'available'
      ? 'Update available'
      : state.status === 'downloading'
        ? 'Downloading securely'
        : 'Update ready'

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          className="update-card glass"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 330, damping: 30 }}
        >
          <span className="update-card__aura" aria-hidden="true" />
          <header className="update-card__head">
            <span className="update-card__orb">
              {state.status === 'downloaded' ? (
                <Check size={17} strokeWidth={2.4} />
              ) : state.status === 'downloading' ? (
                <RefreshCw size={17} className="spin" />
              ) : (
                <Sparkles size={17} />
              )}
            </span>
            <div className="update-card__titles">
              <span className="eyebrow">
                <span className="eyebrow__dot" />
                {eyebrow}
              </span>
              <h2>{title}</h2>
            </div>
            <button
              type="button"
              className="icon-btn update-card__close"
              onClick={() => setDismissed(key)}
              aria-label="Dismiss update notice"
            >
              <X size={15} />
            </button>
          </header>

          {state.status === 'available' && (
            <>
              <p className="update-card__copy">
                You’re on {state.currentVersion}. The new build installs in place — your vault and
                every secret stay exactly where they are.
              </p>
              {state.notes && <div className="update-card__notes">{state.notes}</div>}
              <div className="update-card__actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={download}>
                  <ArrowDownToLine size={14} /> Download update
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDismissed(key)}
                >
                  Later
                </button>
              </div>
            </>
          )}

          {state.status === 'downloading' && (
            <>
              <p className="update-card__copy">
                Downloading Aegis {state.version} in the background. Keep using the vault — we’ll
                tell you when it’s ready.
              </p>
              <div className="update-card__meter" aria-hidden="true">
                <span style={{ width: `${Math.max(2, state.progress ?? 0)}%` }} />
              </div>
              <div className="update-card__meta">
                <span>{state.progress ?? 0}%</span>
                <span>
                  {state.total ? `${mb(state.transferred)} of ${mb(state.total)}` : 'Starting…'}
                </span>
                <span>{speed(state.bytesPerSecond)}</span>
              </div>
            </>
          )}

          {state.status === 'downloaded' && (
            <>
              <p className="update-card__copy">
                Aegis {state.version} is downloaded. Restart now to apply it, or simply quit when
                you’re done — the update installs on the way out.
              </p>
              <div className="update-card__actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={install}>
                  <RefreshCw size={14} /> Restart &amp; install
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDismissed(key)}
                >
                  Later
                </button>
              </div>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
