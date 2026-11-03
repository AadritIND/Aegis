import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, RefreshCw, ShieldCheck } from 'lucide-react'
import { SectionHead } from '../components/ui'
import { useReducedMotion } from '../lib/useReducedMotion'

const SETS = {
  lower: { label: 'a–z', chars: 'abcdefghijklmnopqrstuvwxyz' },
  upper: { label: 'A–Z', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  numbers: { label: '0–9', chars: '0123456789' },
  symbols: { label: '!@#', chars: '!@#$%^&*()-_=+[]{};:,.?/' },
} as const

type SetKey = keyof typeof SETS
type Mode = 'random' | 'passphrase'

const AMBIGUOUS = new Set(['I', 'l', '1', 'O', '0', 'o'])

const WORDS = `amber anchor atlas autumn basil beacon birch bishop bloom brick brook candle canyon cedar
cipher citadel clarity cobalt comet copper coral cypress dawn delta dune ember emerald epoch fern flint
forest fossil garnet glacier granite harbor harvest hazel helio hollow indigo iron ivory jade jasper
juniper kestrel lantern larch lark lava legacy linen lotus lucid lunar maple marble meadow mercury mesa
meteor mint mirror monsoon moss nectar nickel nimbus north oasis obsidian ocean onyx opal orbit orchid
otter oxide pepper pewter pine plateau prism quartz quill raven reef riven river robin rowan saffron sage
sandstone sable shadow sierra silver slate solstice sparrow spruce steel stone summit sycamore tarn
thistle thorn tide timber topaz tundra umber vale vapor velvet vesper violet walrus willow winter wren
zephyr zinc`.split(/\s+/)

const SCRAMBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%&*'

function randomIndex(max: number) {
  const buffer = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / max) * max
  let value = buffer[0]
  do {
    crypto.getRandomValues(buffer)
    value = buffer[0]
  } while (value >= limit)
  return value % max
}

const pick = <T,>(list: T[]) => list[randomIndex(list.length)]

function useScramble(target: string, active: boolean) {
  const [display, setDisplay] = useState(target)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!active || reduced) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    const duration = 320
    let raf = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const revealed = Math.floor(progress * target.length)
      const rest = target
        .slice(revealed)
        .split('')
        .map(() => SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)])
        .join('')
      setDisplay(target.slice(0, revealed) + rest)
      if (progress < 1) raf = requestAnimationFrame(tick)
      else setDisplay(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, reduced])

  return display
}

export function Forge() {
  const [mode, setMode] = useState<Mode>('random')
  const [length, setLength] = useState(22)
  const [words, setWords] = useState(4)
  const [sets, setSets] = useState<Record<SetKey, boolean>>({
    lower: true,
    upper: true,
    numbers: true,
    symbols: true,
  })
  const [avoid, setAvoid] = useState(true)
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [pulse, setPulse] = useState(0)
  const firstRun = useRef(true)

  const pool = useMemo(() => {
    const base = (Object.keys(SETS) as SetKey[])
      .filter((key) => sets[key])
      .map((key) => SETS[key].chars)
      .join('')
    if (!avoid) return base
    return base
      .split('')
      .filter((char) => !AMBIGUOUS.has(char))
      .join('')
  }, [sets, avoid])

  const generate = useCallback(() => {
    let next = ''
    if (mode === 'random') {
      const chars = pool.split('')
      for (let index = 0; index < length; index += 1) next += pick(chars)
    } else {
      const chosen: string[] = []
      while (chosen.length < words) {
        const word = pick(WORDS)
        if (!chosen.includes(word)) chosen.push(word)
      }
      next = `${chosen.join('-')}-${String(randomIndex(900) + 100)}`
    }
    setValue(next)
    setHistory((prev) => [next, ...prev.filter((entry) => entry !== next)].slice(0, 3))
    setPulse((prev) => prev + 1)
    setCopied(false)
  }, [length, mode, pool, words])

  useEffect(() => {
    generate()
    firstRun.current = false
  }, [generate])

  const bits = useMemo(() => {
    if (mode === 'passphrase') return Math.round((words * Math.log2(WORDS.length) + 10) * 10) / 10
    return Math.round(length * Math.log2(Math.max(pool.length, 2)) * 10) / 10
  }, [mode, words, length, pool.length])

  const verdict = bits >= 110 ? 'Excellent' : bits >= 80 ? 'Strong' : bits >= 55 ? 'Good' : bits >= 35 ? 'Fair' : 'Weak'
  const strength = bits >= 110 ? 5 : bits >= 80 ? 4 : bits >= 55 ? 3 : bits >= 35 ? 2 : 1
  const display = useScramble(value, pulse > 0)

  const toggleSet = (key: SetKey) => {
    setSets((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (!next.lower && !next.upper && !next.numbers && !next.symbols) return prev
      return next
    })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="forge section" id="forge">
      <div className="container">
        <SectionHead
          eyebrow="06 — The forge"
          title={
            <>
              Forge one.
              <br />
              <span className="serif-accent">Right here.</span>
            </>
          }
          copy="This is the app's generator, running in this page with your machine's own cryptographic random source. Rejection-sampled, not Math.random. Nothing you generate is transmitted or stored."
          aside={
            <span className="mono forge__live">
              <span /> client-side · live
            </span>
          }
        />

        <div className="forge__panel" data-reveal>
          <span className="forge__corner forge__corner--tl" aria-hidden="true" />
          <span className="forge__corner forge__corner--tr" aria-hidden="true" />
          <span className="forge__corner forge__corner--bl" aria-hidden="true" />
          <span className="forge__corner forge__corner--br" aria-hidden="true" />

          <div className="forge__bar">
            <div className="forge__modes" role="tablist" aria-label="Generation mode">
              {(['random', 'passphrase'] as Mode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  className="forge__mode"
                  data-on={mode === item}
                  onClick={() => setMode(item)}
                >
                  {item === 'random' ? 'Random string' : 'Passphrase'}
                </button>
              ))}
            </div>
            <span className="mono dim">crypto.getRandomValues</span>
          </div>

          <div className="forge__output">
            <span className="mono forge__label">Generated secret</span>
            <code className={mode === 'passphrase' ? 'forge__value forge__value--words' : 'forge__value'}>
              {display || ' '}
            </code>
            <div className="forge__actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" className="btn btn--primary btn--sm" onClick={generate}>
                <RefreshCw size={14} />
                Again
              </button>
            </div>
          </div>

          <div className="forge__meter">
            <div className="forge__meterhead">
              <span className="mono">
                <ShieldCheck size={12} /> {verdict}
              </span>
              <span className="forge__bits">
                <b>{bits}</b>
                <span className="mono">bits of entropy</span>
              </span>
            </div>
            <div className="forge__bars" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((bar) => (
                <i key={bar} data-on={bar < strength} />
              ))}
            </div>
            <p className="forge__hint mono">
              {bits >= 110
                ? 'Centuries of offline guessing, even at a billion tries per second.'
                : 'Length beats symbols. Add characters before adding exclamation marks.'}
            </p>
          </div>

          <div className="forge__controls">
            <div className="forge__control">
              <label className="forge__slider">
                <span className="mono">
                  {mode === 'random' ? 'Length' : 'Words'} <b>{mode === 'random' ? length : words}</b>
                </span>
                {mode === 'random' ? (
                  <input
                    type="range"
                    min={10}
                    max={64}
                    value={length}
                    onChange={(event) => setLength(Number(event.target.value))}
                    aria-label="Password length"
                  />
                ) : (
                  <input
                    type="range"
                    min={3}
                    max={8}
                    value={words}
                    onChange={(event) => setWords(Number(event.target.value))}
                    aria-label="Word count"
                  />
                )}
                <span className="forge__ticks mono">
                  <i>{mode === 'random' ? '10' : '3'}</i>
                  <i>{mode === 'random' ? '64' : '8'}</i>
                </span>
              </label>
            </div>

            {mode === 'random' ? (
              <div className="forge__sets">
                {(Object.keys(SETS) as SetKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="forge__set"
                    data-on={sets[key]}
                    aria-pressed={sets[key]}
                    onClick={() => toggleSet(key)}
                  >
                    <i>{sets[key] && <Check size={9} strokeWidth={3.5} />}</i>
                    {SETS[key].label}
                  </button>
                ))}
                <button
                  type="button"
                  className="forge__switch"
                  data-on={avoid}
                  aria-pressed={avoid}
                  onClick={() => setAvoid((prev) => !prev)}
                >
                  <span className="forge__knob" />
                  avoid I l 1 O 0
                </button>
              </div>
            ) : (
              <p className="forge__wordnote mono">
                {WORDS.length} words · joined with dashes · a three-digit suffix
              </p>
            )}
          </div>

          {history.length > 1 && (
            <div className="forge__history">
              <span className="mono dim">Recent sparks</span>
              <div>
                {history.slice(1).map((entry) => (
                  <button key={entry} type="button" className="mono" onClick={() => setValue(entry)}>
                    {entry.length > 30 ? `${entry.slice(0, 30)}…` : entry}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="forge__foot mono">
            In the app, copied secrets are wiped from the clipboard after 30 seconds.
          </p>
        </div>
      </div>
    </section>
  )
}
