import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  CloudOff,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lightbulb,
  Loader2,
  LockKeyhole,
  MousePointerClick,
  ShieldCheck,
} from 'lucide-react'
import { useStore } from '../store'
import { LogoMark } from '../components/Logo'
import { WindowControls } from '../components/WindowControls'
import { StrengthMeter } from '../components/StrengthMeter'
import { cn } from '../lib/utils'

const COPY = {
  locked: {
    eyebrow: 'Private by default',
    title: ['Your private world,', 'beautifully sealed.'],
    lede: 'Passwords, API keys, cards and quiet notes — encrypted on this device and opened by one password only you know.',
    panelEyebrow: 'Welcome back',
    panelTitle: 'Unlock your vault',
    panelSub: 'One master password stands between the world and everything you keep.',
  },
  onboarding: {
    eyebrow: 'First light',
    title: ['A quieter place for', 'everything private.'],
    lede: 'Aegis is a local-first vault with a taste for calm. No account, no cloud, no one else holding the keys.',
    panelEyebrow: 'Create your vault',
    panelTitle: 'Begin with a master password',
    panelSub: 'It encrypts everything and never leaves this device. There is no reset, so make it memorable.',
  },
}

export function Gate({ mode }: { mode: 'locked' | 'onboarding' }) {
  const { unlock, createVault, status, info } = useStore()
  const onboarding = mode === 'onboarding'
  const copy = COPY[mode]
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [hint, setHint] = useState('')
  const [name, setName] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [revealedHint, setRevealedHint] = useState<string | null>(null)
  const [capsLock, setCapsLock] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (onboarding) nameRef.current?.focus()
      else passwordRef.current?.focus()
    }, 420)
    return () => window.clearTimeout(timer)
  }, [onboarding])

  useEffect(() => {
    setError('')
    setPassword('')
    setConfirm('')
    setRevealedHint(null)
  }, [mode])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (onboarding) {
      if (password.length < 10) {
        setError('Use at least 10 characters for your master password.')
        return
      }
      if (password !== confirm) {
        setError('The two passwords do not match.')
        return
      }
      if (!acknowledged) {
        setError('Please confirm you understand there is no recovery.')
        return
      }
      setLoading(true)
      try {
        await createVault(password, hint.trim(), name.trim())
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        setError(
          message === 'VAULT_EXISTS'
            ? 'A vault already exists on this device.'
            : message === 'WEAK_MASTER_PASSWORD'
              ? 'Use at least 10 characters.'
              : 'The vault could not be created.',
        )
      } finally {
        setLoading(false)
      }
      return
    }

    if (!password) {
      setError('Enter your master password.')
      passwordRef.current?.focus()
      return
    }
    setLoading(true)
    try {
      await unlock(password)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'BAD_PASSWORD') {
        setAttempts((prev) => prev + 1)
        setError('That password does not open this vault. Try again.')
      } else if (message === 'NO_VAULT') {
        setError('No vault was found on this device.')
      } else {
        setError('The vault could not be unlocked.')
      }
    } finally {
      setLoading(false)
    }
  }

  const revealHint = async () => {
    try {
      const value = await window.vault.hint()
      setRevealedHint(value || 'No hint was saved for this vault.')
    } catch {
      setRevealedHint('No hint was saved for this vault.')
    }
  }

  return (
    <div className="gate">
      <div className="gate__chrome">
        <div className="gate__brand">
          <LogoMark size={28} />
          <div>
            <span className="gate__word">Aegis</span>
            <span className="gate__tagline">PRIVATE VAULT</span>
          </div>
        </div>
        <WindowControls />
      </div>

      <section className="gate__stage">
        <div className="gate__orbit" aria-hidden="true">
          <span className="gate__ring gate__ring--a" />
          <span className="gate__ring gate__ring--b" />
          <span className="gate__ring gate__ring--c" />
          <span className="gate__planet gate__planet--a" />
          <span className="gate__planet gate__planet--b" />
        </div>

        <motion.div
          className="gate__story"
          key={mode}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        >
          <span className="eyebrow gate__eyebrow">
            <span className="eyebrow__dot" />
            {copy.eyebrow}
          </span>
          <h1 className="gate__title">
            {copy.title[0]}
            <span className="gate__title-accent">{copy.title[1]}</span>
          </h1>
          <p className="gate__lede">{copy.lede}</p>

          <div className="gate__features">
            <div className="gate__feature">
              <span className="gate__feature-icon">
                <ShieldCheck size={16} />
              </span>
              <div>
                <b>Sealed on this device</b>
                <span>AES-256-GCM at rest, keys derived with scrypt. No server ever sees a byte.</span>
              </div>
            </div>
            <div className="gate__feature">
              <span className="gate__feature-icon">
                <MousePointerClick size={16} />
              </span>
              <div>
                <b>Autofill on your terms</b>
                <span>Domain-matched logins, filled only when you ask. Never in the background.</span>
              </div>
            </div>
            <div className="gate__feature">
              <span className="gate__feature-icon">
                <Fingerprint size={16} />
              </span>
              <div>
                <b>One password to remember</b>
                <span>Everything else can be long, strange and impossible to guess.</span>
              </div>
            </div>
          </div>

          <div className="gate__foot">
            <span>
              <CloudOff size={12} /> no cloud
            </span>
            <span>
              <KeyRound size={12} /> no recovery
            </span>
            <span className="mono">v{info?.version || '1.0.5'}</span>
          </div>
        </motion.div>
      </section>

      <motion.section
        className="gate__panel"
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
      >
        <div className="gate-card glass">
          <div className="gate-card__aura" aria-hidden="true">
            <span className="gate-card__pulse gate-card__pulse--a" />
            <span className="gate-card__pulse gate-card__pulse--b" />
            <span className="gate-card__orb">
              <LockKeyhole size={24} />
            </span>
          </div>

          <div className="gate-card__head">
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              {copy.panelEyebrow}
            </span>
            <h2>{copy.panelTitle}</h2>
            <p>{copy.panelSub}</p>
          </div>

          <form onSubmit={submit} className="gate-form">
            {onboarding && (
              <div className="field">
                <label className="field-label" htmlFor="gate-name">
                  Your name <span className="field-label__hint">— optional</span>
                </label>
                <input
                  id="gate-name"
                  ref={nameRef}
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="What should Aegis call you?"
                  autoComplete="off"
                  maxLength={40}
                />
              </div>
            )}

            <div className="field">
              <label className="field-label" htmlFor="gate-password">
                Master password
              </label>
              <div className="input-wrap">
                <input
                  id="gate-password"
                  ref={passwordRef}
                  className="input input--tight"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError('')
                  }}
                  onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                  onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                  placeholder={onboarding ? 'At least 10 characters' : 'Enter your master password'}
                  autoComplete={onboarding ? 'new-password' : 'current-password'}
                  spellCheck={false}
                />
                <div className="input-wrap__actions">
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {capsLock && (
                <span className="gate__caps">
                  <Fingerprint size={11} /> Caps Lock is on
                </span>
              )}
              {onboarding && password.length > 0 && <StrengthMeter password={password} />}
            </div>

            {onboarding && (
              <>
                <div className="field">
                  <label className="field-label" htmlFor="gate-confirm">
                    Confirm password
                  </label>
                  <input
                    id="gate-confirm"
                    className="input"
                    type="password"
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value)
                      if (error) setError('')
                    }}
                    placeholder="Type it once more"
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="gate-hint">
                    Password hint <span className="field-label__hint">— optional</span>
                  </label>
                  <input
                    id="gate-hint"
                    className="input"
                    value={hint}
                    onChange={(event) => setHint(event.target.value)}
                    placeholder="A clue only you would understand"
                    autoComplete="off"
                    maxLength={120}
                  />
                </div>

                <button
                  type="button"
                  className="gate-ack"
                  onClick={() => setAcknowledged((prev) => !prev)}
                  aria-pressed={acknowledged}
                >
                  <span className={cn('check', acknowledged && 'is-on')}>
                    {acknowledged && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span>
                    I understand Aegis cannot recover this password if I forget it.
                  </span>
                </button>
              </>
            )}

            {error && (
              <motion.div
                className="gate__error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.div>
            )}

            {!onboarding && (
              <div className="gate__hint-row">
                {attempts >= 3 ? (
                  revealedHint === null ? (
                    <button type="button" className="gate__hint-btn" onClick={() => void revealHint()}>
                      <Lightbulb size={12} /> Reveal master hint
                    </button>
                  ) : (
                    <div className="gate__hint">
                      <Lightbulb size={12} />
                      <span>{revealedHint}</span>
                    </div>
                  )
                ) : (
                  <span className="gate__hint-muted">
                    No recovery. That is what makes it a vault.
                  </span>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block gate__submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {onboarding ? 'Sealing your vault…' : 'Unlocking…'}
                </>
              ) : (
                <>
                  {onboarding ? 'Create my vault' : 'Unlock Aegis'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="gate-card__trust">
            <span>
              <ShieldCheck size={11} /> AES-256-GCM
            </span>
            <span>
              <KeyRound size={11} /> scrypt
            </span>
            <span>
              <CloudOff size={11} /> local only
            </span>
          </div>

          {!onboarding && status?.createdAt && (
            <p className="gate-card__meta">
              Vault sealed {new Date(status.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </motion.section>
    </div>
  )
}
