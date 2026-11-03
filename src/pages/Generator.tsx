import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Copy,
  Dice5,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useStore } from '../store'
import {
  DEFAULT_PASSWORD_OPTIONS,
  WORDLIST_SIZE,
  generatePassphrase,
  generatePassword,
  passphraseEntropy,
  type PasswordOptions,
} from '../lib/generator'
import { humanCrackTime, scorePassword, strengthColor } from '../lib/strength'
import { cn, relativeTime, uid } from '../lib/utils'

type Mode = 'random' | 'passphrase'
type Separator = '-' | '.' | '_' | ' '

interface HistoryEntry {
  id: string
  value: string
  at: number
  score: number
  mode: Mode
}

const CHARSETS: { key: keyof Omit<PasswordOptions, 'length' | 'avoidAmbiguous'>; label: string }[] = [
  { key: 'lowercase', label: 'Lowercase' },
  { key: 'uppercase', label: 'Uppercase' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'symbols', label: 'Symbols' },
]

const separators: { value: Separator; label: string }[] = [
  { value: '-', label: 'dash' },
  { value: '.', label: 'dot' },
  { value: '_', label: 'underscore' },
  { value: ' ', label: 'space' },
]

export function GeneratorPage() {
  const { copy } = useStore()
  const [initial] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))
  const [mode, setMode] = useState<Mode>('random')
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [words, setWords] = useState(5)
  const [separator, setSeparator] = useState<Separator>('-')
  const [capitalise, setCapitalise] = useState(true)
  const [value, setValue] = useState(initial)
  const [refreshKey, setRefreshKey] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: uid('gen'),
      value: initial,
      at: Date.now() - 4 * 60 * 1000,
      score: scorePassword(initial).score,
      mode: 'random',
    },
  ])
  const firstRun = useRef(true)

  const create = (record: boolean) => {
    const next =
      mode === 'random'
        ? generatePassword(options)
        : generatePassphrase(words, separator, capitalise)
    setValue(next)
    setRefreshKey((prev) => prev + 1)
    if (record) {
      setHistory((prev) =>
        [
          {
            id: uid('gen'),
            value: next,
            at: Date.now(),
            score: scorePassword(next).score,
            mode,
          },
          ...prev,
        ].slice(0, 7),
      )
    }
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    create(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, options, words, separator, capitalise])

  const strength = useMemo(() => {
    if (mode === 'random') {
      const result = scorePassword(value)
      return {
        score: result.score,
        label: result.label,
        bits: result.entropy,
        crackTime: result.crackTime,
      }
    }
    const bits = passphraseEntropy(words)
    const score = bits >= 70 ? 4 : bits >= 55 ? 3 : bits >= 40 ? 2 : 1
    const labels = ['Critical', 'Weak', 'Fair', 'Strong', 'Excellent']
    return {
      score,
      label: labels[score],
      bits,
      crackTime: humanCrackTime(Math.pow(2, Math.max(0, bits - 1)) / 1e11),
    }
  }, [mode, value, words])

  const color = strengthColor(strength.score)
  const modeLabel = mode === 'random' ? 'Password' : 'Passphrase'

  const toggleOption = (key: keyof Omit<PasswordOptions, 'length' | 'avoidAmbiguous'>) => {
    const enabled = CHARSETS.filter((set) => options[set.key])
    if (enabled.length === 1 && enabled[0].key === key && options[key]) return
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const copyValue = (entry: HistoryEntry | null = null) => {
    const target = entry?.value ?? value
    const targetMode = entry?.mode ?? mode
    void copy(target, {
      label: targetMode === 'random' ? 'Password' : 'Passphrase',
      sensitive: true,
    })
    if (!entry) {
      setHistory((prev) =>
        prev.some((item) => item.value === target)
          ? prev
          : [
              {
                id: uid('gen'),
                value: target,
                at: Date.now(),
                score: strength.score,
                mode,
              },
              ...prev,
            ].slice(0, 7),
      )
    }
  }

  const fillPercent = ((options.length - 8) / (64 - 8)) * 100

  return (
    <>
      <header className="page-head">
        <div className="page-head__left">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            CSPRNG · never leaves this device
          </div>
          <h1 className="page-title">Forge something unguessable.</h1>
          <p className="page-sub">
            Every character comes from your device’s cryptographic random generator. Nothing is
            logged, nothing is sent, nothing is saved until you say so.
          </p>
        </div>
        <div className="page-actions">
          <span className="pill pill--accent">
            <ShieldCheck size={11} /> {WORDLIST_SIZE}-word library
          </span>
        </div>
      </header>

      <div className="generator-layout">
        <section className="glass forge">
          <div className="forge__top">
            <div className="segmented" role="tablist" aria-label="Generator mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'random'}
                className={cn('segment', mode === 'random' && 'is-active')}
                onClick={() => setMode('random')}
              >
                <WandSparkles size={13} /> Random
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'passphrase'}
                className={cn('segment', mode === 'passphrase' && 'is-active')}
                onClick={() => setMode('passphrase')}
              >
                <Dice5 size={13} /> Passphrase
              </button>
            </div>
            <span className="pill">
              <LockKeyhole size={10} /> generated locally
            </span>
          </div>

          <div className="forge__output">
            <span className="forge__glow" aria-hidden="true" />
            <motion.div
              key={refreshKey}
              className="forge__value mono"
              initial={{ opacity: 0.35, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {[...value].map((char, index) => (
                <span
                  key={`${refreshKey}-${index}`}
                  className={cn(
                    /\d/.test(char) && 'forge-char--num',
                    /[^A-Za-z0-9\s]/.test(char) && 'forge-char--sym',
                  )}
                >
                  {char}
                </span>
              ))}
            </motion.div>
            <div className="forge__output-actions">
              <button type="button" className="btn btn-primary" onClick={() => copyValue()}>
                <Copy size={14} /> Copy {modeLabel.toLowerCase()}
              </button>
              <button
                type="button"
                className="btn btn-clay"
                onClick={() => create(true)}
                title="Generate another"
              >
                <RefreshCw size={14} /> Again
              </button>
            </div>
          </div>

          <div className="forge__strength">
            <div className="forge__strength-head">
              <span className="strength__label" style={{ color }}>
                {strength.label}
              </span>
              <span className="faint mono">{strength.bits} bits</span>
              <span className="spacer" />
              <span className="faint">{strength.crackTime} to crack offline</span>
            </div>
            <div className="strength__track" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className="strength__seg"
                  style={{
                    background: index <= strength.score ? color : undefined,
                    boxShadow: index <= strength.score ? `0 0 10px ${color}55` : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="forge__options">
            {mode === 'random' ? (
              <>
                <div className="forge-length">
                  <div className="forge-length__head">
                    <span className="field-label">Length</span>
                    <span className="forge-length__value mono">{options.length}</span>
                  </div>
                  <input
                    type="range"
                    className="range"
                    min={8}
                    max={64}
                    step={1}
                    value={options.length}
                    onChange={(event) =>
                      setOptions((prev) => ({ ...prev, length: Number(event.target.value) }))
                    }
                    style={{ '--fill': `${fillPercent}%` } as React.CSSProperties}
                    aria-label="Password length"
                  />
                  <div className="range-scale">
                    <span>8</span>
                    <span>24</span>
                    <span>40</span>
                    <span>64</span>
                  </div>
                </div>

                <div className="option-grid">
                  {CHARSETS.map((set) => {
                    const on = options[set.key]
                    const lastOne = CHARSETS.filter((entry) => options[entry.key]).length === 1 && on
                    return (
                      <button
                        key={set.key}
                        type="button"
                        className={cn('option-tile', on && 'is-on')}
                        onClick={() => toggleOption(set.key)}
                        aria-pressed={on}
                        title={lastOne ? 'Keep at least one character set enabled' : undefined}
                      >
                        <span className="option-tile__check">{on && <Check size={11} />}</span>
                        {set.label}
                      </button>
                    )
                  })}
                </div>

                <div className="option-row">
                  <div>
                    <span className="option-row__title">Avoid ambiguous characters</span>
                    <span className="option-row__sub">Skip O, 0, I, l and similar lookalikes.</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={options.avoidAmbiguous}
                    className={cn('switch', options.avoidAmbiguous && 'is-on')}
                    onClick={() =>
                      setOptions((prev) => ({ ...prev, avoidAmbiguous: !prev.avoidAmbiguous }))
                    }
                  >
                    <span className="switch__knob" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="forge-length">
                  <div className="forge-length__head">
                    <span className="field-label">Words</span>
                    <span className="forge-length__value mono">{words}</span>
                  </div>
                  <input
                    type="range"
                    className="range"
                    min={3}
                    max={8}
                    step={1}
                    value={words}
                    onChange={(event) => setWords(Number(event.target.value))}
                    style={{
                      '--fill': `${((words - 3) / 5) * 100}%`,
                    } as React.CSSProperties}
                    aria-label="Number of words"
                  />
                  <div className="range-scale">
                    <span>3</span>
                    <span>5</span>
                    <span>8</span>
                  </div>
                </div>

                <div className="forge-separator">
                  <span className="field-label">Separator</span>
                  <div className="segmented">
                    {separators.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={cn('segment', separator === option.value && 'is-active')}
                        onClick={() => setSeparator(option.value)}
                        title={option.label}
                      >
                        {option.value === ' ' ? 'space' : option.value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="option-row">
                  <div>
                    <span className="option-row__title">Capitalise words</span>
                    <span className="option-row__sub">Softer to read and easier to retype.</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={capitalise}
                    className={cn('switch', capitalise && 'is-on')}
                    onClick={() => setCapitalise((prev) => !prev)}
                  >
                    <span className="switch__knob" />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="forge-side">
          <section className="glass forge-history">
            <div className="tile-head">
              <div>
                <div className="tile-eyebrow">This session</div>
                <h3 className="tile-title">Recent sparks</h3>
              </div>
              <Sparkles size={14} className="tile-star" />
            </div>
            {history.length === 1 && (
              <p className="forge-history__hint">
                Generated values stay in memory only. Copy one to save it to your clipboard for a
                moment.
              </p>
            )}
            <div className="history-list">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="history-row"
                  onClick={() => copyValue(entry)}
                  title="Copy this value"
                >
                  <span className="history-row__value mono">
                    {entry.value.length > 18 ? `${entry.value.slice(0, 18)}…` : entry.value}
                  </span>
                  <span className="history-row__meta">
                    <i style={{ background: strengthColor(entry.score) }} />
                    {relativeTime(entry.at)}
                  </span>
                  <Copy size={12} className="history-row__copy" />
                </button>
              ))}
            </div>
          </section>

          <section className="glass forge-tips">
            <div className="tile-head">
              <div>
                <div className="tile-eyebrow">Good to know</div>
                <h3 className="tile-title">Entropy, briefly</h3>
              </div>
            </div>
            <ol className="tips-list">
              <li>
                <span>01</span>
                <p>Length beats complexity. A long phrase you can type is stronger than a short puzzle.</p>
              </li>
              <li>
                <span>02</span>
                <p>Never reuse a password across services. One breach should never cascade.</p>
              </li>
              <li>
                <span>03</span>
                <p>Your clipboard clears automatically after the timeout in Settings.</p>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </>
  )
}
