import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  LockKeyhole,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Vault as VaultIcon,
  WandSparkles,
} from 'lucide-react'
import { useStore } from '../store'
import type { Page, VaultItem } from '../types'
import { itemSubtitle, searchItems } from '../lib/utils'
import { TYPES } from '../lib/fields'
import { TypeGlyph } from './TypeGlyph'

type Command = {
  id: string
  label: string
  hint: string
  icon: typeof Plus
  run: () => void
}

const primaryField = (item: VaultItem) => {
  switch (item.type) {
    case 'login':
      return { key: 'password', label: 'password' }
    case 'apikey':
      return { key: 'secret', label: 'API secret' }
    case 'card':
      return { key: 'number', label: 'card number' }
    case 'note':
      return { key: 'body', label: 'note' }
    default:
      return { key: 'email', label: 'email' }
  }
}

export function CommandPalette({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const {
    paletteOpen,
    closePalette,
    items,
    copy,
    openEditor,
    lock,
    setAuditOpen,
  } = useStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!paletteOpen) return
    setQuery('')
    setSelected(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [paletteOpen])

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'new',
        label: 'Add a new item',
        hint: 'Ctrl N',
        icon: Plus,
        run: () => {
          closePalette()
          openEditor(null, 'login')
        },
      },
      {
        id: 'generator',
        label: 'Forge a password',
        hint: 'Ctrl G',
        icon: WandSparkles,
        run: () => {
          closePalette()
          onNavigate('generator')
        },
      },
      {
        id: 'audit',
        label: 'Run a security audit',
        hint: 'Review',
        icon: ShieldCheck,
        run: () => {
          closePalette()
          setAuditOpen(true)
        },
      },
      {
        id: 'vault',
        label: 'Open the vault',
        hint: 'Browse',
        icon: VaultIcon,
        run: () => {
          closePalette()
          onNavigate('vault')
        },
      },
      {
        id: 'settings',
        label: 'Vault settings',
        hint: 'Configure',
        icon: Settings2,
        run: () => {
          closePalette()
          onNavigate('settings')
        },
      },
      {
        id: 'lock',
        label: 'Lock the vault',
        hint: 'Ctrl L',
        icon: LockKeyhole,
        run: () => {
          closePalette()
          lock()
        },
      },
    ],
    [closePalette, lock, onNavigate, openEditor, setAuditOpen],
  )

  const itemResults = useMemo(() => {
    if (!query.trim()) {
      return [...items]
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
        .slice(0, 5)
    }
    return searchItems(items, query).slice(0, 8)
  }, [items, query])

  const commandResults = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((command) => command.label.toLowerCase().includes(q))
  }, [commands, query])

  const flattenedCount = itemResults.length + commandResults.length

  useEffect(() => {
    if (selected >= flattenedCount) setSelected(Math.max(0, flattenedCount - 1))
  }, [flattenedCount, selected])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useEffect(() => {
    if (!paletteOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePalette()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, closePalette])

  const activateItem = async (item: VaultItem) => {
    const { key, label } = primaryField(item)
    const value = item.fields[key]
    closePalette()
    if (value) {
      await copy(value, {
        label,
        item,
        sensitive: item.type !== 'identity',
      })
    } else {
      openEditor(item.id, item.type)
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((prev) => (flattenedCount ? (prev + 1) % flattenedCount : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((prev) => (flattenedCount ? (prev - 1 + flattenedCount) % flattenedCount : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = itemResults[selected]
      if (item) {
        void activateItem(item)
        return
      }
      const command = commandResults[selected - itemResults.length]
      command?.run()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closePalette()
    }
  }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePalette()
          }}
        >
          <motion.div
            className="palette glass"
            initial={{ opacity: 0, y: -14, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 36 }}
            role="dialog"
            aria-modal="true"
            aria-label="Quick search"
          >
            <div className="palette__search">
              <Search size={19} className="palette__search-icon" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSelected(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="Search secrets, jump anywhere…"
                aria-label="Search vault"
                spellCheck={false}
              />
              <kbd className="kbd">Esc</kbd>
            </div>

            <div className="palette__results scroll-y" ref={listRef}>
              {itemResults.length > 0 && (
                <>
                  <div className="palette__group-label">
                    {query ? 'Matches' : 'Pinned & recent'}
                    <span className="palette__group-count">{itemResults.length}</span>
                  </div>
                  {itemResults.map((item, index) => {
                    const { key, label } = primaryField(item)
                    const available = Boolean(item.fields[key])
                    const active = selected === index
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={index}
                        className={`palette__row${active ? ' is-selected' : ''}`}
                        onMouseMove={() => setSelected(index)}
                        onClick={() => void activateItem(item)}
                      >
                        <TypeGlyph type={item.type} size="sm" />
                        <span className="palette__row-text">
                          <span className="palette__row-name">{item.name}</span>
                          <span className="palette__row-sub">
                            {TYPES[item.type].label} · {itemSubtitle(item)}
                          </span>
                        </span>
                        <span className="palette__row-action">
                          {available ? `Copy ${label}` : 'Edit'}
                          <ArrowRight size={13} />
                        </span>
                      </button>
                    )
                  })}
                </>
              )}

              {commandResults.length > 0 && (
                <>
                  <div className="palette__group-label">
                    Actions
                    <span className="palette__group-count">{commandResults.length}</span>
                  </div>
                  {commandResults.map((command, index) => {
                    const Icon = command.icon
                    const active = selected === itemResults.length + index
                    return (
                      <button
                        key={command.id}
                        type="button"
                        data-index={itemResults.length + index}
                        className={`palette__row${active ? ' is-selected' : ''}`}
                        onMouseMove={() => setSelected(itemResults.length + index)}
                        onClick={command.run}
                      >
                        <span className="palette__command-icon">
                          <Icon size={15} strokeWidth={1.9} />
                        </span>
                        <span className="palette__row-text">
                          <span className="palette__row-name">{command.label}</span>
                        </span>
                        <span className="palette__row-action">{command.hint}</span>
                      </button>
                    )
                  })}
                </>
              )}

              {flattenedCount === 0 && (
                <div className="palette__empty">
                  <Sparkles size={18} />
                  Nothing matches “{query}”. Try a name, tag or website.
                </div>
              )}
            </div>

            <div className="palette__footer">
              <span className="palette__hint">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd> navigate
              </span>
              <span className="palette__hint">
                <kbd className="kbd">Enter</kbd> copy or open
              </span>
              <span className="palette__hint palette__hint--right">
                <LockKeyhole size={11} /> decrypted locally
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
