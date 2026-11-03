import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import type { CustomField, ItemType, VaultItem } from '../types'
import { TYPES, TAGS_SUGGESTIONS, TYPE_ORDER, emptyFields } from '../lib/fields'
import { TYPE_ICONS } from './TypeGlyph'
import { useStore } from '../store'
import { generatePassword, DEFAULT_PASSWORD_OPTIONS } from '../lib/generator'
import { uid } from '../lib/utils'
import { StrengthMeter } from './StrengthMeter'

const NAME_PLACEHOLDERS: Record<ItemType, string> = {
  login: 'e.g. GitHub',
  apikey: 'e.g. Stripe — Production',
  card: 'e.g. Visa Signature',
  note: 'e.g. Recovery codes',
  identity: 'e.g. Personal details',
}

export function ItemEditor() {
  const { editor, items, saveItem, closeEditor, addToast } = useStore()
  const existing = useMemo(
    () => items.find((item) => item.id === editor.itemId) || null,
    [editor.itemId, items],
  )

  const [type, setType] = useState<ItemType>(existing?.type || editor.type)
  const [name, setName] = useState(existing?.name || '')
  const [fields, setFields] = useState<Record<string, string>>(() => ({
    ...emptyFields(existing?.type || editor.type),
    ...(existing?.fields || {}),
  }))
  const [tags, setTags] = useState<string[]>(existing?.tags || [])
  const [tagDraft, setTagDraft] = useState('')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [favorite, setFavorite] = useState(existing?.favorite || false)
  const [custom, setCustom] = useState<CustomField[]>(existing?.custom || [])
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  const meta = TYPES[type]

  useEffect(() => {
    const timer = window.setTimeout(() => nameRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeEditor])

  const setField = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  const changeType = (next: ItemType) => {
    if (next === type) return
    setType(next)
    setFields(emptyFields(next))
    setRevealed({})
  }

  const addTag = (raw: string) => {
    const value = raw.trim().replace(/^#/, '').toLowerCase().slice(0, 24)
    if (!value) return
    setTags((prev) => (prev.includes(value) || prev.length >= 8 ? prev : [...prev, value]))
    setTagDraft('')
  }

  const handleTagKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(tagDraft)
    } else if (event.key === 'Backspace' && !tagDraft && tags.length) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const forge = (key: string) => {
    const value = generatePassword({
      ...DEFAULT_PASSWORD_OPTIONS,
      length: key === 'secret' ? 36 : 20,
    })
    setField(key, value)
    setRevealed((prev) => ({ ...prev, [key]: true }))
    addToast({ title: 'Password forged', detail: `${value.length} characters from your device's CSPRNG.`, tone: 'success' })
  }

  const addCustom = () => {
    if (custom.length >= 8) return
    setCustom((prev) => [
      ...prev,
      { id: uid('cf'), label: '', value: '', secret: false },
    ])
  }

  const updateCustom = (id: string, patch: Partial<CustomField>) =>
    setCustom((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give this item a name so you can find it later.')
      nameRef.current?.focus()
      return
    }
    const cleanedFields: Record<string, string> = {}
    for (const def of meta.fields) {
      const value = fields[def.key] ?? ''
      cleanedFields[def.key] = def.secret ? value : value.trim()
    }

    const next: VaultItem = {
      id: existing?.id || uid('item'),
      type,
      name: name.trim(),
      favorite,
      tags,
      notes: notes.trim(),
      fields: cleanedFields,
      custom: custom
        .map((field) => ({ ...field, label: field.label.trim(), value: field.value.trim() }))
        .filter((field) => field.label || field.value),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      lastUsedAt: existing?.lastUsedAt,
    }
    saveItem(next)
  }

  const suggestions = TAGS_SUGGESTIONS.filter((tag) => !tags.includes(tag)).slice(0, 4)

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeEditor()
      }}
    >
      <motion.form
        className="modal glass editor"
        onSubmit={submit}
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-label={existing ? 'Edit item' : 'New item'}
      >
        <div className="modal__head">
          <div>
            <div className="eyebrow">
              <span className="eyebrow__dot" />
              {existing ? 'Editing item' : 'New vault item'}
            </div>
            <h2 className="modal__title">
              {existing ? `Edit ${meta.label.toLowerCase()}` : `Add a ${meta.label.toLowerCase()}`}
            </h2>
          </div>
          <div className="modal__head-actions">
            <button
              type="button"
              className={`favorite-toggle${favorite ? ' is-on' : ''}`}
              onClick={() => setFavorite((prev) => !prev)}
              aria-pressed={favorite}
            >
              <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
              {favorite ? 'Favorited' : 'Favorite'}
            </button>
            <button type="button" className="icon-btn" onClick={closeEditor} aria-label="Close">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="type-select" role="tablist" aria-label="Item type">
          {TYPE_ORDER.map((option) => {
            const Icon = TYPE_ICONS[option]
            const optionMeta = TYPES[option]
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={type === option}
                className={`type-option${type === option ? ' is-active' : ''}`}
                style={{ '--type-color': optionMeta.color } as React.CSSProperties}
                onClick={() => changeType(option)}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{optionMeta.label}</span>
              </button>
            )
          })}
        </div>

        <div className="editor-grid">
          <div className="field editor-span2">
            <label className="field-label" htmlFor="editor-name">
              Name
            </label>
            <input
              id="editor-name"
              ref={nameRef}
              className="input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError('')
              }}
              placeholder={NAME_PLACEHOLDERS[type]}
              autoComplete="off"
            />
            {error && <span className="field-error">{error}</span>}
          </div>

          {meta.fields.map((def) => {
            const isSecret = Boolean(def.secret)
            const isVisible = revealed[def.key]
            return (
              <div className={`field${def.full ? ' editor-span2' : ''}`} key={def.key}>
                <label className="field-label" htmlFor={`field-${def.key}`}>
                  {def.label}
                  {def.hint && <span className="field-label__hint">— {def.hint}</span>}
                </label>
                {def.multiline ? (
                  <textarea
                    id={`field-${def.key}`}
                    className={`textarea${def.mono ? ' textarea--mono' : ''}`}
                    value={fields[def.key] || ''}
                    onChange={(event) => setField(def.key, event.target.value)}
                    placeholder={def.placeholder}
                    rows={type === 'note' ? 7 : 3}
                    spellCheck={type === 'note'}
                    style={def.key === 'body' ? { minHeight: 168 } : undefined}
                  />
                ) : isSecret ? (
                  <div className="input-wrap">
                    <input
                      id={`field-${def.key}`}
                      className={`input${def.mono ? ' input--mono' : ''}`}
                      type={isVisible ? 'text' : 'password'}
                      value={fields[def.key] || ''}
                      onChange={(event) => setField(def.key, event.target.value)}
                      placeholder={def.placeholder}
                      autoComplete="new-password"
                      spellCheck={false}
                      style={{ paddingRight: 78 }}
                    />
                    <div className="input-wrap__actions">
                      <button
                        type="button"
                        className="input-action"
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [def.key]: !prev[def.key] }))
                        }
                        aria-label={isVisible ? 'Hide value' : 'Reveal value'}
                      >
                        {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        className="input-action"
                        onClick={() => forge(def.key)}
                        aria-label="Generate a value"
                        title="Generate"
                      >
                        <Sparkles size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    id={`field-${def.key}`}
                    className={`input${def.mono ? ' input--mono' : ''}`}
                    value={fields[def.key] || ''}
                    onChange={(event) => setField(def.key, event.target.value)}
                    placeholder={def.placeholder}
                    inputMode={def.inputMode}
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
                {def.key === 'password' && (fields.password || '').length > 0 && (
                  <StrengthMeter password={fields.password} />
                )}
              </div>
            )
          })}

          <div className="field editor-span2">
            <label className="field-label" htmlFor="editor-tags">
              Tags <span className="field-label__hint">— up to eight</span>
            </label>
            <div className="tag-input">
              {tags.map((tag) => (
                <span className="tag tag--removable" key={tag}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((entry) => entry !== tag))}
                    aria-label={`Remove ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="editor-tags"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={handleTagKey}
                onBlur={() => addTag(tagDraft)}
                placeholder={tags.length ? 'Add another…' : 'work, personal, finance…'}
                autoComplete="off"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="tag-suggestions">
                {suggestions.map((tag) => (
                  <button key={tag} type="button" className="tag-suggestion" onClick={() => addTag(tag)}>
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field editor-span2">
            <label className="field-label" htmlFor="editor-notes">
              Notes <span className="field-label__hint">— optional</span>
            </label>
            <textarea
              id="editor-notes"
              className="textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything you want to remember about this item."
              rows={2}
            />
          </div>

          <div className="field editor-span2">
            <div className="custom-head">
              <span className="field-label">Custom fields</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addCustom}>
                <Plus size={13} /> Add field
              </button>
            </div>
            {custom.length === 0 ? (
              <p className="custom-hint">
                Add extra values like a recovery email, port, or license key.
              </p>
            ) : (
              <div className="custom-list">
                {custom.map((field) => (
                  <div className="custom-row" key={field.id}>
                    <input
                      className="input"
                      value={field.label}
                      onChange={(event) => updateCustom(field.id, { label: event.target.value })}
                      placeholder="Label"
                      aria-label="Custom field label"
                    />
                    <input
                      className={`input${field.secret ? ' input--mono' : ''}`}
                      value={field.value}
                      onChange={(event) => updateCustom(field.id, { value: event.target.value })}
                      placeholder="Value"
                      aria-label="Custom field value"
                      type={field.secret ? 'password' : 'text'}
                    />
                    <div className="custom-row__actions">
                      <button
                        type="button"
                        className={`input-action${field.secret ? ' is-on' : ''}`}
                        onClick={() => updateCustom(field.id, { secret: !field.secret })}
                        aria-label={field.secret ? 'Mark as visible' : 'Mark as secret'}
                        title={field.secret ? 'Hidden in detail view' : 'Hide in detail view'}
                      >
                        <LockKeyhole size={14} />
                      </button>
                      <button
                        type="button"
                        className="input-action"
                        onClick={() =>
                          setCustom((prev) => prev.filter((entry) => entry.id !== field.id))
                        }
                        aria-label="Remove custom field"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal__foot editor__foot">
          <span className="editor__secure">
            <LockKeyhole size={12} /> Encrypted with AES-256-GCM before it touches disk
          </span>
          <div className="modal__foot-actions">
            <button type="button" className="btn btn-ghost" onClick={closeEditor}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} />
              {existing ? 'Save changes' : 'Add to vault'}
            </button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  )
}
