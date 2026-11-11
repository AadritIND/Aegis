import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import type { VaultItem } from '../types'
import { TYPES } from '../lib/fields'
import { useStore } from '../store'
import { cn, formatDate, hostOf, itemSubtitle, normaliseUrl, relativeTime } from '../lib/utils'
import { TypeGlyph } from './TypeGlyph'
import { StrengthMeter } from './StrengthMeter'
import { TotpCode } from './TotpCode'

const cardNumber = (value: string) =>
  value
    .replace(/\s+/g, '')
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim()

export function ItemDetail({
  item,
  onEdit,
  onClose,
}: {
  item: VaultItem
  onEdit: () => void
  onClose?: () => void
}) {
  const { copy, toggleFavorite, deleteItem, health } = useStore()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const meta = TYPES[item.type]
  const itemHealth = health.perItem[item.id]
  const anyRevealed = Object.values(revealed).some(Boolean)

  useEffect(() => {
    if (!confirmDelete) return
    const timer = window.setTimeout(() => setConfirmDelete(false), 6000)
    return () => window.clearTimeout(timer)
  }, [confirmDelete])

  useEffect(() => {
    if (!anyRevealed) return
    const timer = window.setTimeout(() => setRevealed({}), 15000)
    return () => window.clearTimeout(timer)
  }, [anyRevealed, revealed])

  const renderValue = (key: string, value: string, secret: boolean) => {
    if (!value) return <span className="detail-field__empty">Not set</span>
    if (key === 'number' && item.type === 'card') {
      const formatted = cardNumber(value)
      if (secret && !revealed[key]) {
        return <span className="mono detail-field__secret">•••• •••• •••• {formatted.slice(-4)}</span>
      }
      return <span className="mono">{formatted}</span>
    }
    if (secret && !revealed[key]) {
      return <span className="mono detail-field__secret">{'•'.repeat(Math.min(18, Math.max(10, value.length)))}</span>
    }
    return <span className={key === 'totp' ? 'mono' : undefined}>{value}</span>
  }

  const handleExternal = (url: string) => {
    void window.vault.openExternal(normaliseUrl(url))
  }

  const fields = meta.fields.filter((def) => def.key !== 'totp' && def.key !== 'body')

  return (
    <div className="detail">
      <div className="detail__head">
        <TypeGlyph type={item.type} size="lg" />
        <div className="detail__heading">
          <span className="eyebrow">
            {meta.label}
            {item.favorite && <Star size={9} fill="currentColor" style={{ marginLeft: 2 }} />}
          </span>
          <h2 className="detail__title">{item.name}</h2>
          <p className="detail__sub">{itemSubtitle(item)}</p>
        </div>
        {onClose && (
          <button type="button" className="icon-btn detail__close" onClick={onClose} aria-label="Close detail">
            <X size={16} />
          </button>
        )}
      </div>

      {anyRevealed && (
        <div className="detail__reveal" role="status" aria-live="polite">
          <Eye size={12} />
          <span>Secrets hide automatically in 15 seconds</span>
          <span className="detail__reveal-bar" aria-hidden="true" />
        </div>
      )}

      {(item.tags.length > 0 || itemHealth?.strength) && (
        <div className="detail__badges">
          {item.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
          {itemHealth?.reused && <span className="pill pill--warn">Reused</span>}
          {itemHealth?.old && <span className="pill">Aged</span>}
          {itemHealth?.breachCount ? (
            <span className="pill pill--danger">Breached</span>
          ) : null}
        </div>
      )}

      {itemHealth?.strength && (
        <div className="detail__strength">
          <span className="field-label">Password strength</span>
          <StrengthMeter password={item.fields[meta.secretKey || ''] || ''} compact />
        </div>
      )}

      <div className="detail__fields">
        {item.type === 'login' && item.fields.totp && (
          <div className="detail-field">
            <span className="detail-field__label">One-time code</span>
            <TotpCode secret={item.fields.totp} item={item} />
          </div>
        )}

        {item.type === 'note' ? (
          <div className="detail-note">
            <div className="detail-note__head">
              <span className="field-label">Secure note</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  void copy(item.fields.body || '', { label: 'Note', item, sensitive: true })
                }
                aria-label="Copy note"
              >
                <Copy size={13} />
              </button>
            </div>
            <p className="detail-note__body">{item.fields.body || 'Empty note.'}</p>
          </div>
        ) : (
          fields.map((def) => {
            const value = item.fields[def.key] || ''
            const isUrl = def.inputMode === 'url' && value
            return (
              <div className="detail-field" key={def.key}>
                <span className="detail-field__label">{def.label}</span>
                <div className="detail-field__row">
                  <span className={cn('detail-field__value', isUrl && 'detail-field__value--link')}>
                    {isUrl ? (
                      <button type="button" onClick={() => handleExternal(value)}>
                        {hostOf(value)}
                      </button>
                    ) : (
                      renderValue(def.key, value, Boolean(def.secret))
                    )}
                  </span>
                  <div className="detail-field__actions">
                    {isUrl && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleExternal(value)}
                        aria-label="Open website"
                        title="Open website"
                      >
                        <ExternalLink size={13} />
                      </button>
                    )}
                    {def.secret && value && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [def.key]: !prev[def.key] }))
                        }
                        aria-label={revealed[def.key] ? 'Hide' : 'Reveal'}
                        title={revealed[def.key] ? 'Hide' : 'Reveal'}
                      >
                        {revealed[def.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                    {value && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          void copy(value, {
                            label: def.label,
                            item,
                            sensitive: Boolean(def.secret),
                          })
                        }
                        aria-label={`Copy ${def.label}`}
                        title="Copy"
                      >
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {item.type !== 'note' && item.fields.body && (
          <div className="detail-field">
            <span className="detail-field__label">Note</span>
            <p className="detail-field__multiline">{item.fields.body}</p>
          </div>
        )}

        {item.custom.map((field) => (
          <div className="detail-field" key={field.id}>
            <span className="detail-field__label">
              {field.secret && <LockKeyhole size={10} />} {field.label || 'Custom field'}
            </span>
            <div className="detail-field__row">
              <span className={cn('detail-field__value', field.secret && 'mono')}>
                {field.value ? renderValue(field.id, field.value, field.secret) : '—'}
              </span>
              {field.value && (
                <div className="detail-field__actions">
                  {field.secret && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() =>
                        setRevealed((prev) => ({ ...prev, [field.id]: !prev[field.id] }))
                      }
                      aria-label={revealed[field.id] ? 'Hide' : 'Reveal'}
                    >
                      {revealed[field.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      void copy(field.value, {
                        label: field.label || 'Value',
                        item,
                        sensitive: field.secret,
                      })
                    }
                    aria-label="Copy custom field"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {item.notes && (
        <div className="detail__notes">
          <span className="field-label">Notes</span>
          <p>{item.notes}</p>
        </div>
      )}

      {(itemHealth?.breachCount || itemHealth?.reused || itemHealth?.old) && (
        <div className="detail__warning">
          <AlertTriangle size={14} />
          <span>
            {itemHealth.breachCount
              ? `Seen in ${itemHealth.breachCount.toLocaleString()} known breaches. Rotate this secret.`
              : itemHealth.reused
                ? 'This password is shared with another item.'
                : 'This credential is over a year old.'}
          </span>
        </div>
      )}

      <div className="detail__meta">
        <span>Created {formatDate(item.createdAt)}</span>
        <span>Updated {relativeTime(item.updatedAt)}</span>
        <span>{item.lastUsedAt ? `Used ${relativeTime(item.lastUsedAt)}` : 'Never used'}</span>
      </div>

      <div className="detail__actions">
        <button
          type="button"
          className={`btn btn-clay btn-sm${item.favorite ? ' is-favorite' : ''}`}
          onClick={() => toggleFavorite(item.id)}
        >
          <Star size={13} fill={item.favorite ? 'currentColor' : 'none'} />
          {item.favorite ? 'Pinned' : 'Pin'}
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
          <Pencil size={13} /> Edit
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger detail__delete"
          onClick={() => setConfirmDelete((prev) => !prev)}
          aria-label="Delete item"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {confirmDelete && (
        <div className="confirm-strip">
          <span>
            <KeyRound size={13} /> Delete “{item.name}” forever?
          </span>
          <div className="confirm-strip__actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
