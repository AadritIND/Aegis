import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react'
import { useStore } from '../store'
import type { ItemType } from '../types'
import { TYPES, TYPE_ORDER } from '../lib/fields'
import { cn, itemSubtitle, primaryField, relativeTime, searchItems } from '../lib/utils'
import { TypeGlyph } from '../components/TypeGlyph'
import { ItemDetail } from '../components/ItemDetail'

type Filter = 'all' | ItemType
type Sort = 'recent' | 'name' | 'created'

export function VaultPage() {
  const { items, health, copy, openEditor, settings } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sort, setSort] = useState<Sort>('recent')

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TYPE_ORDER.map((type) => [type, items.filter((item) => item.type === type).length]),
      ) as Record<ItemType, number>,
    [items],
  )

  const filtered = useMemo(() => {
    let list = query.trim() ? searchItems(items, query) : [...items]
    if (filter !== 'all') list = list.filter((item) => item.type === filter)
    if (favoritesOnly) list = list.filter((item) => item.favorite)
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'created') return b.createdAt - a.createdAt
      return (b.lastUsedAt || b.updatedAt) - (a.lastUsedAt || a.updatedAt)
    })
    return list
  }, [favoritesOnly, filter, items, query, sort])

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null)
    }
  }, [filtered, selectedId])

  const selected = items.find((item) => item.id === selectedId) || null
  const activeFilters = filter !== 'all' || favoritesOnly || Boolean(query)

  return (
    <>
      <header className="page-head">
        <div className="page-head__left">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            Local vault · {items.length} {items.length === 1 ? 'item' : 'items'}
          </div>
          <h1 className="page-title">Everything you keep close.</h1>
          <p className="page-sub">
            Logins, keys, cards and notes — encrypted with AES-256-GCM and unlocked only for this
            session.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => openEditor(null, 'login')}>
            <Plus size={15} />
            New item
          </button>
        </div>
      </header>

      <div className="vault-layout">
        <section className="glass vault-panel">
          <div className="vault-panel__head">
            <div>
              <span className="tile-eyebrow">Index</span>
              <h2 className="vault-count">
                {filtered.length}
                <span> {filtered.length === 1 ? 'entry' : 'entries'}</span>
              </h2>
            </div>
            <span className="vault-locked">
              <LockKeyhole size={12} /> unlocked
            </span>
          </div>

          <div className="vault-toolbar">
            <div className="input-wrap vault-search">
              <Search size={15} className="input-wrap__icon" />
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, user, host or tag…"
                aria-label="Search vault"
                spellCheck={false}
              />
              {query && (
                <div className="input-wrap__actions">
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className={cn('icon-btn icon-btn--glass', favoritesOnly && 'is-on')}
              onClick={() => setFavoritesOnly((prev) => !prev)}
              aria-pressed={favoritesOnly}
              title="Show favorites only"
            >
              <Star size={15} fill={favoritesOnly ? 'currentColor' : 'none'} />
            </button>
            <div className="select-wrap vault-sort">
              <select
                className="select"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Sort entries"
              >
                <option value="recent">Recent</option>
                <option value="name">A → Z</option>
                <option value="created">Newest</option>
              </select>
              <ChevronDown size={13} className="select-wrap__chevron" />
            </div>
          </div>

          <div className="vault-filters">
            <button
              type="button"
              className={cn('chip', filter === 'all' && 'is-active')}
              onClick={() => setFilter('all')}
            >
              All <span className="chip__count">{items.length}</span>
            </button>
            {TYPE_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                className={cn('chip', filter === type && 'is-active')}
                onClick={() => setFilter(type)}
              >
                {TYPES[type].plural} <span className="chip__count">{counts[type]}</span>
              </button>
            ))}
          </div>

          <div className="vault-list scroll-y">
            {filtered.length === 0 && (
              <div className="empty vault-empty">
                <span className="empty__orb">
                  {items.length === 0 ? <ShieldCheck size={22} /> : <Search size={20} />}
                </span>
                <span className="empty__title">
                  {items.length === 0 ? 'Your vault is waiting' : 'No entries match'}
                </span>
                <span className="empty__text">
                  {items.length === 0
                    ? 'Add your first secret. It is encrypted before it ever touches disk.'
                    : 'Try a different search or clear your filters.'}
                </span>
                {items.length === 0 ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => openEditor(null, 'login')}
                  >
                    <Plus size={13} /> Add first item
                  </button>
                ) : (
                  activeFilters && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setQuery('')
                        setFilter('all')
                        setFavoritesOnly(false)
                      }}
                    >
                      Clear filters
                    </button>
                  )
                )}
              </div>
            )}

            {filtered.map((item) => {
              const itemHealth = health.perItem[item.id]
              const primary = primaryField(item)
              const strength = itemHealth?.strength?.score
              return (
                <div
                  key={item.id}
                  className={cn('vault-row', selectedId === item.id && 'is-selected')}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedId(item.id)
                    }
                  }}
                >
                  <TypeGlyph type={item.type} />
                  <div className="vault-row__text">
                    <div className="vault-row__name">
                      {item.name}
                      {item.favorite && <Star size={10} fill="currentColor" className="vault-star" />}
                    </div>
                    <div className="vault-row__sub">{itemSubtitle(item)}</div>
                    {item.tags.length > 0 && (
                      <div className="vault-row__tags">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="vault-row__side">
                    <span className="vault-row__time">
                      {relativeTime(item.lastUsedAt || item.updatedAt)}
                    </span>
                    <div className="vault-row__indicators">
                      {settings.showStrength && typeof strength === 'number' && (
                        <span className="mini-strength" title={`Password strength: ${itemHealth?.strength?.label}`}>
                          {[0, 1, 2, 3].map((step) => (
                            <i
                              key={step}
                              className={cn(step <= strength && 'is-on', `s${strength}`)}
                            />
                          ))}
                        </span>
                      )}
                      {itemHealth?.breachCount ? (
                        <span
                          className="vault-breach"
                          title={`Seen in ${itemHealth.breachCount.toLocaleString()} breaches`}
                        >
                          <AlertTriangle size={12} />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="icon-btn vault-row__copy"
                        onClick={(event) => {
                          event.stopPropagation()
                          const value = item.fields[primary.key]
                          if (value) {
                            void copy(value, {
                              label: primary.label,
                              item,
                              sensitive: primary.sensitive,
                            })
                          }
                        }}
                        aria-label={`Copy ${primary.label}`}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="glass vault-detail">
          {selected ? (
            <ItemDetail
              key={selected.id}
              item={selected}
              onEdit={() => openEditor(selected.id, selected.type)}
            />
          ) : (
            <div className="detail-empty">
              <span className="detail-empty__orb">
                <LockKeyhole size={26} />
              </span>
              <h3>Select a secret</h3>
              <p>Pick an entry to see its fields, health, one-time codes and metadata.</p>
              <div className="detail-empty__hints">
                <span>
                  <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd> quick search
                </span>
                <span>
                  <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">N</kbd> new item
                </span>
              </div>
            </div>
          )}
        </aside>
      </div>

    </>
  )
}
