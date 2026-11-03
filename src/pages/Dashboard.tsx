import { useEffect, useMemo, useState } from 'react'
import { animate, motion } from 'framer-motion'
import {
  ArrowRight,
  Copy,
  Flame,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
} from 'lucide-react'
import { useStore } from '../store'
import type { Page, VaultItem } from '../types'
import { TYPES, TYPE_ORDER } from '../lib/fields'
import {
  dayKey,
  greeting,
  itemSubtitle,
  primaryField,
  relativeTime,
  spotlightMove,
} from '../lib/utils'
import { TypeGlyph } from '../components/TypeGlyph'

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
}

const containerMotion = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
}

function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
  }, [value])
  return <span className={className}>{display}</span>
}

export function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const {
    items,
    health,
    profile,
    copy,
    openPalette,
    openEditor,
    lock,
    setAuditOpen,
    settings,
    data,
  } = useStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  const favorites = items.filter((item) => item.favorite)
  const recent = useMemo(
    () =>
      [...items]
        .sort((a, b) => (b.lastUsedAt || b.updatedAt) - (a.lastUsedAt || a.updatedAt))
        .slice(0, 4),
    [items],
  )
  const quick = (favorites.length ? favorites : recent).slice(0, 3)

  const counts = useMemo(
    () => TYPE_ORDER.map((type) => ({ type, count: items.filter((item) => item.type === type).length })),
    [items],
  )
  const total = items.length
  const loginCount = items.filter((item) => item.type === 'login').length
  const auditedCount = items.filter(
    (item) =>
      (item.type === 'login' || item.type === 'apikey') &&
      Boolean(item.fields[TYPES[item.type].secretKey || '']),
  ).length
  const twoFactor = Math.max(0, loginCount - health.missing2fa)
  const uniqueSecrets = Math.max(0, auditedCount - health.reused)
  const freshSecrets = Math.max(0, auditedCount - health.old)
  const scoreMeters = [
    { label: 'Two-factor coverage', value: twoFactor, total: loginCount },
    { label: 'Unique passwords', value: uniqueSecrets, total: auditedCount },
    { label: 'Fresh credentials', value: freshSecrets, total: auditedCount },
  ].filter((meter) => meter.total > 0)

  const activityMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of data?.activity || []) {
      const key = dayKey(entry.at)
      map.set(key, (map.get(key) || 0) + 1)
    }
    return map
  }, [data?.activity])

  const weeks = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(today.getDate() - today.getDay())
    const start = new Date(endOfWeek)
    start.setDate(endOfWeek.getDate() - 23 * 7)
    const columns: { key: string; count: number; date: Date; future: boolean }[][] = []
    for (let week = 0; week < 24; week += 1) {
      const column: { key: string; count: number; date: Date; future: boolean }[] = []
      for (let day = 0; day < 7; day += 1) {
        const date = new Date(start)
        date.setDate(start.getDate() + week * 7 + day)
        const key = dayKey(date.getTime())
        column.push({
          key,
          count: activityMap.get(key) || 0,
          date,
          future: date.getTime() > today.getTime(),
        })
      }
      columns.push(column)
    }
    return columns
  }, [activityMap])

  const streak = useMemo(() => {
    const cursor = new Date()
    cursor.setHours(12, 0, 0, 0)
    if (!activityMap.get(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
    let count = 0
    while (activityMap.get(dayKey(cursor.getTime()))) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [activityMap])

  const actionsThisMonth = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return (data?.activity || []).filter((entry) => entry.at >= cutoff).length
  }, [data?.activity])

  const donut = useMemo(() => {
    const radius = 42
    const circumference = 2 * Math.PI * radius
    let offset = 0
    const segments = counts
      .filter((entry) => entry.count > 0)
      .map((entry) => {
        const share = total ? entry.count / total : 0
        const length = Math.max(share * circumference - 4, 1)
        const segment = {
          ...entry,
          color: TYPES[entry.type].color,
          length,
          offset,
          circumference,
        }
        offset += share * circumference
        return segment
      })
    return { segments, circumference, radius }
  }, [counts, total])

  const gaugeRadius = 74
  const gaugeCirc = 2 * Math.PI * gaugeRadius

  const copyItem = (item: VaultItem) => {
    const primary = primaryField(item)
    const value = item.fields[primary.key]
    if (value) {
      void copy(value, { label: primary.label, item, sensitive: primary.sensitive })
    } else {
      openEditor(item.id, item.type)
    }
  }

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <header className="page-head">
        <div className="page-head__left">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            {dateLabel}
          </div>
          <h1 className="page-title">
            {greeting()}
            {profile.name ? `, ${profile.name}` : ''}
          </h1>
          <p className="page-sub">
            {total
              ? `${total} secrets sealed on this device — not in a cloud, not in a browser, just here.`
              : 'Your vault is ready. Add your first secret and it will never leave this device unencrypted.'}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-outline" onClick={() => setAuditOpen(true)}>
            <ShieldCheck size={15} />
            Review audit
          </button>
          <button type="button" className="btn btn-primary" onClick={() => openEditor(null, 'login')}>
            <Plus size={15} />
            New item
          </button>
        </div>
      </header>

      <motion.div
        className="bento"
        variants={containerMotion}
        initial="hidden"
        animate="show"
      >
        <motion.section
          variants={cardMotion}
          className="glass tile spotlight tile-score"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Vault health</div>
              <h3 className="score-title">{health.label}</h3>
            </div>
            <span className="score-grade">{health.grade}</span>
          </div>

          <div className="gauge">
            <svg viewBox="0 0 180 180" className="gauge__svg">
              <defs>
                <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="55%" stopColor="var(--accent-2)" />
                  <stop offset="100%" stopColor="var(--accent-3)" />
                </linearGradient>
              </defs>
              <circle
                cx="90"
                cy="90"
                r={gaugeRadius}
                fill="none"
                stroke="rgba(255,255,255,.06)"
                strokeWidth="10"
              />
              <motion.circle
                cx="90"
                cy="90"
                r={gaugeRadius}
                fill="none"
                stroke="url(#score-gradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={gaugeCirc}
                initial={{ strokeDashoffset: gaugeCirc }}
                animate={{ strokeDashoffset: gaugeCirc * (1 - health.score / 100) }}
                transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                transform="rotate(-90 90 90)"
                style={{ filter: 'drop-shadow(0 0 9px rgba(var(--accent-rgb), .55))' }}
              />
            </svg>
            <div className="gauge__center">
              <CountUp value={health.score} className="gauge__score" />
              <span className="gauge__caption">of 100</span>
            </div>
          </div>

          <div className="score-stats">
            <div className="score-stat">
              <span className="score-stat__dot score-stat__dot--danger" />
              <b>{health.weak}</b>
              <span>Weak</span>
            </div>
            <div className="score-stat">
              <span className="score-stat__dot score-stat__dot--warn" />
              <b>{health.reused}</b>
              <span>Reused</span>
            </div>
            <div className="score-stat">
              <span className="score-stat__dot" />
              <b>{health.old}</b>
              <span>Aged</span>
            </div>
          </div>

          {scoreMeters.length > 0 && total > 0 && (
            <div className="score-breakdown">
              {scoreMeters.map((meter) => (
                <div className="score-meter" key={meter.label}>
                  <div className="score-meter__head">
                    <span>{meter.label}</span>
                    <b>
                      {meter.value}/{meter.total}
                    </b>
                  </div>
                  <div className="score-meter__track">
                    <i
                      style={{
                        width: `${Math.round((meter.value / meter.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="score-note">
            <Sparkles size={14} className="score-note__icon" />
            <span>{health.recommendations[0]}</span>
          </div>
          <button type="button" className="tile-link score-link" onClick={() => setAuditOpen(true)}>
            Review security <ArrowRight size={12} />
          </button>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile spotlight tile-command"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Quick access</div>
              <h3 className="tile-title">One keystroke away</h3>
            </div>
            <span className="tile-badge-soft">
              <Sparkles size={12} /> live
            </span>
          </div>

          <button type="button" className="command-search" onClick={openPalette}>
            <Search size={16} />
            <span>Search logins, keys, cards…</span>
            <kbd className="kbd">Ctrl K</kbd>
          </button>

          <div className="quick-list">
            <span className="tile-eyebrow">{favorites.length ? 'Pinned' : 'Recent'}</span>
            {quick.length === 0 && (
              <p className="tile-empty">Add a secret and it will wait for you here.</p>
            )}
            {quick.map((item) => {
              const primary = primaryField(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  className="quick-item"
                  onClick={() => copyItem(item)}
                  title={`Copy ${primary.label.toLowerCase()}`}
                >
                  <TypeGlyph type={item.type} size="sm" />
                  <span className="quick-item__text">
                    <span className="quick-item__name">{item.name}</span>
                    <span className="quick-item__sub">{itemSubtitle(item)}</span>
                  </span>
                  <Copy size={13} className="quick-item__copy" />
                </button>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile spotlight tile-mix"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Composition</div>
              <h3 className="tile-title">{total} items</h3>
            </div>
          </div>

          <div className="mix-body">
            <div className="mix-donut">
              <svg viewBox="0 0 112 112">
                {donut.segments.length === 0 ? (
                  <circle
                    cx="56"
                    cy="56"
                    r={donut.radius}
                    fill="none"
                    stroke="rgba(255,255,255,.07)"
                    strokeWidth="11"
                  />
                ) : (
                  donut.segments.map((segment, index) => (
                    <circle
                      key={segment.type}
                      className="mix-seg"
                      cx="56"
                      cy="56"
                      r={donut.radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="11"
                      strokeLinecap="round"
                      transform="rotate(-90 56 56)"
                      style={{
                        strokeDasharray: mounted
                          ? `${segment.length} ${donut.circumference}`
                          : `0 ${donut.circumference}`,
                        strokeDashoffset: -segment.offset,
                        transitionDelay: `${index * 90 + 150}ms`,
                        filter: `drop-shadow(0 0 4px ${segment.color}55)`,
                      }}
                    />
                  ))
                )}
              </svg>
              <div className="mix-donut__center">
                <b>{total}</b>
                <span>secrets</span>
              </div>
            </div>
            <div className="mix-legend">
              {counts.map((entry) => (
                <div className="mix-legend__row" key={entry.type}>
                  <span
                    className="mix-legend__dot"
                    style={{ background: TYPES[entry.type].color }}
                  />
                  <span className="mix-legend__label">{TYPES[entry.type].plural}</span>
                  <b>{entry.count}</b>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile spotlight tile-recents"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Recently touched</div>
              <h3 className="tile-title">Back where you left off</h3>
            </div>
            <button type="button" className="tile-link" onClick={() => onNavigate('vault')}>
              Open vault <ArrowRight size={12} />
            </button>
          </div>
          <div className="recent-list">
            {recent.length === 0 && (
              <div className="empty empty--inline">
                <span className="empty__orb">
                  <LockKeyhole size={20} />
                </span>
                <span className="empty__title">An empty vault is a quiet vault</span>
                <span className="empty__text">Add your first login to get started.</span>
              </div>
            )}
            {recent.map((item) => {
              const primary = primaryField(item)
              return (
                <div className="recent-row" key={item.id}>
                  <button
                    type="button"
                    className="recent-row__main"
                    onClick={() => openEditor(item.id, item.type)}
                  >
                    <TypeGlyph type={item.type} size="sm" />
                    <span className="recent-row__text">
                      <span className="recent-row__name">{item.name}</span>
                      <span className="recent-row__sub">{itemSubtitle(item)}</span>
                    </span>
                  </button>
                  <span className="recent-row__time">{relativeTime(item.lastUsedAt || item.updatedAt)}</span>
                  <button
                    type="button"
                    className="icon-btn recent-row__copy"
                    onClick={() =>
                      void copy(item.fields[primary.key] || '', {
                        label: primary.label,
                        item,
                        sensitive: primary.sensitive,
                      })
                    }
                    aria-label={`Copy ${primary.label}`}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile tile-actions"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Tools</div>
              <h3 className="tile-title">Quick actions</h3>
            </div>
          </div>
          <div className="action-grid">
            <button
              type="button"
              className="clay-action"
              data-tint="mint"
              onClick={() => openEditor(null, 'login')}
            >
              <span className="clay-action__icon">
                <Plus size={16} />
              </span>
              <span>New item</span>
            </button>
            <button
              type="button"
              className="clay-action"
              data-tint="violet"
              onClick={() => onNavigate('generator')}
            >
              <span className="clay-action__icon">
                <WandSparkles size={16} />
              </span>
              <span>Forge</span>
            </button>
            <button
              type="button"
              className="clay-action"
              data-tint="amber"
              onClick={() => setAuditOpen(true)}
            >
              <span className="clay-action__icon">
                <ShieldCheck size={16} />
              </span>
              <span>Audit</span>
            </button>
            <button type="button" className="clay-action" data-tint="sky" onClick={lock}>
              <span className="clay-action__icon">
                <LockKeyhole size={16} />
              </span>
              <span>Lock</span>
            </button>
          </div>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile spotlight tile-activity"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Activity</div>
              <h3 className="tile-title">A quiet rhythm of trust</h3>
            </div>
            <span className="tile-badge-soft">
              <Flame size={12} /> {streak} day streak
            </span>
          </div>
          <div className="heat" role="img" aria-label="Vault activity over the last 24 weeks">
            {weeks.map((column, columnIndex) => (
              <div className="heat__col" key={columnIndex}>
                {column.map((day) => {
                  const level = day.future
                    ? 0
                    : day.count === 0
                      ? 0
                      : day.count < 2
                        ? 1
                        : day.count < 4
                          ? 2
                          : day.count < 7
                            ? 3
                            : 4
                  return (
                    <span
                      key={day.key}
                      className={`heat__cell${level > 0 ? ` is-${level}` : ''}${day.future ? ' is-future' : ''}`}
                      title={`${day.date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })} · ${day.count} action${day.count === 1 ? '' : 's'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="heat-foot">
            <span>{actionsThisMonth} actions in the last 30 days</span>
            <span className="heat-legend">
              Less
              <i />
              <i className="is-2" />
              <i className="is-3" />
              <i className="is-4" />
              More
            </span>
          </div>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile tile-posture"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Privacy posture</div>
              <h3 className="tile-title">Local. Locked. Yours.</h3>
            </div>
            <span className="posture-seal">
              <ShieldCheck size={17} />
            </span>
          </div>

          <div className="posture-list">
            <div className="posture-row">
              <span className="posture-dot" />
              <span>Encryption at rest</span>
              <b>AES-256</b>
            </div>
            <div className="posture-row">
              <span className="posture-dot" />
              <span>Cloud sync</span>
              <b className="good">Never</b>
            </div>
            <div className="posture-row">
              <span className="posture-dot" />
              <span>Auto-lock</span>
              <b>{settings.autoLockMinutes} min</b>
            </div>
          </div>

          <div className="tip-recommendation">
            <Sparkles size={13} />
            <span>{health.recommendations[1] || health.recommendations[0]}</span>
          </div>
        </motion.section>

        <motion.section
          variants={cardMotion}
          className="glass tile spotlight tile-favorites"
          onMouseMove={spotlightMove}
        >
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Pinned</div>
              <h3 className="tile-title">Favorites</h3>
            </div>
            <Star size={14} className="tile-star" />
          </div>
          {favorites.length === 0 ? (
            <div className="empty empty--inline">
              <span className="empty__orb">
                <Star size={18} />
              </span>
              <span className="empty__title">Nothing pinned yet</span>
              <span className="empty__text">Star an item to keep it within reach.</span>
            </div>
          ) : (
            <div className="fav-list">
              {favorites.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="fav-row"
                  onClick={() => copyItem(item)}
                  title={`Copy ${primaryField(item).label.toLowerCase()}`}
                >
                  <TypeGlyph type={item.type} size="sm" />
                  <span className="fav-row__name">{item.name}</span>
                  <Copy size={12} className="fav-row__copy" />
                </button>
              ))}
            </div>
          )}
          {favorites.length > 3 && (
            <button type="button" className="tile-link fav-more" onClick={() => onNavigate('vault')}>
              +{favorites.length - 3} more <ArrowRight size={11} />
            </button>
          )}
        </motion.section>
      </motion.div>
    </>
  )
}
