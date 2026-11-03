import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Fingerprint,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  ShieldX,
  X,
} from 'lucide-react'
import { useStore } from '../store'
import { TYPES } from '../lib/fields'
import { TypeGlyph } from './TypeGlyph'
import { itemSubtitle } from '../lib/utils'

export function AuditModal() {
  const {
    health,
    items,
    setAuditOpen,
    openEditor,
    runBreachScan,
    breachScan,
    settings,
    breaches,
  } = useStore()

  const issues = items
    .map((item) => ({ item, health: health.perItem[item.id] }))
    .filter(({ health: itemHealth }) => {
      if (!itemHealth) return false
      return (
        (itemHealth.strength && itemHealth.strength.score <= 1) ||
        itemHealth.reused ||
        itemHealth.old ||
        itemHealth.breachCount > 0
      )
    })
    .sort((a, b) => (b.health.breachCount > 0 ? 1 : 0) - (a.health.breachCount > 0 ? 1 : 0))

  const scanDone = breachScan.done && !breachScan.running
  const breachedCount = Object.values(breaches).filter((count) => count > 0).length

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAuditOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setAuditOpen])

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setAuditOpen(false)
      }}
    >
      <motion.div
        className="modal glass audit"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-label="Security audit"
      >
        <div className="modal__head">
          <div className="audit__title">
            <span className="audit__mark">
              <ShieldCheck size={21} />
            </span>
            <div>
              <div className="eyebrow">
                <span className="eyebrow__dot" /> Security audit
              </div>
              <h2 className="modal__title">Vault health report</h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setAuditOpen(false)}
            aria-label="Close audit"
          >
            <X size={17} />
          </button>
        </div>

        <div className="audit__summary">
          <div className="audit__score">
            <span className="audit__score-num">{health.score}</span>
            <span className="audit__score-label">out of 100</span>
          </div>
          <div className="audit__stat">
            <span className="audit__stat-icon">
              <AlertTriangle size={15} />
            </span>
            <div>
              <b>{health.weak}</b>
              <span>Weak passwords</span>
            </div>
          </div>
          <div className="audit__stat">
            <span className="audit__stat-icon">
              <RefreshCcw size={15} />
            </span>
            <div>
              <b>{health.reused}</b>
              <span>Reused secrets</span>
            </div>
          </div>
          <div className="audit__stat">
            <span className="audit__stat-icon">
              <ShieldX size={15} />
            </span>
            <div>
              <b>{breachedCount || health.breached}</b>
              <span>Breach hits</span>
            </div>
          </div>
        </div>

        <div className="audit__scan">
          <div className="audit__scan-text">
            <span className="audit__scan-title">
              <Fingerprint size={15} />
              Breach intelligence
            </span>
            <p>
              {settings.breachCheck
                ? 'Checks your logins against known breaches using k-anonymity — only a 5-character hash prefix ever leaves this device.'
                : 'Breach checks are off. Enable them in Settings to scan your secrets.'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!settings.breachCheck || breachScan.running || !items.length}
            onClick={() => void runBreachScan()}
          >
            {breachScan.running ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Fingerprint size={13} />
            )}
            {breachScan.running ? `Scanning ${breachScan.checked}/${breachScan.total}` : 'Scan secrets'}
          </button>
        </div>
        {(breachScan.running || scanDone) && (
          <div className="audit__progress">
            <span
              className="audit__progress-fill"
              style={{
                width: `${
                  breachScan.total ? Math.round((breachScan.checked / breachScan.total) * 100) : 0
                }%`,
              }}
            />
            {scanDone && (
              <span className="audit__progress-label">
                {breachScan.errors
                  ? `${breachScan.checked - breachScan.errors} checked · ${breachScan.errors} unavailable`
                  : `${breachScan.checked} secrets checked`}
              </span>
            )}
          </div>
        )}

        <div className="audit__list scroll-y">
          {issues.length === 0 ? (
            <div className="audit__clear">
              <span className="audit__clear-orb">
                <ShieldCheck size={26} />
              </span>
              <h3>No exposed secrets found</h3>
              <p>Your passwords are strong, unique, and not on any known breach list.</p>
            </div>
          ) : (
            issues.map(({ item, health: itemHealth }) => (
              <div className="audit__issue" key={item.id}>
                <TypeGlyph type={item.type} size="sm" />
                <div className="audit__issue-text">
                  <div className="audit__issue-name">
                    {item.name}
                    <span className="audit__issue-type">
                      {TYPES[item.type].label}
                    </span>
                  </div>
                  <div className="audit__issue-sub">{itemSubtitle(item)}</div>
                </div>
                <div className="audit__issue-flags">
                  {itemHealth?.strength && itemHealth.strength.score <= 1 && (
                    <span className="pill pill--danger">Weak</span>
                  )}
                  {itemHealth?.reused && <span className="pill pill--warn">Reused</span>}
                  {itemHealth?.old && <span className="pill">Old</span>}
                  {itemHealth?.breachCount ? (
                    <span className="pill pill--danger">
                      Breached {itemHealth.breachCount.toLocaleString()}×
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setAuditOpen(false)
                    openEditor(item.id, item.type)
                  }}
                >
                  Fix
                </button>
              </div>
            ))
          )}
        </div>

        <div className="audit__foot">
          <span className="audit__privacy">
            <KeyRound size={12} /> Audited locally, except the anonymous breach lookup.
          </span>
          <span className="audit__privacy">
            <Activity size={12} /> {health.total} items in this vault
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
