import type { CSSProperties } from 'react'
import { Braces, CreditCard, IdCard, KeyRound, NotebookText } from 'lucide-react'
import type { ItemType } from '../types'
import { TYPES } from '../lib/fields'
import { cn } from '../lib/utils'

export const TYPE_ICONS = {
  login: KeyRound,
  apikey: Braces,
  card: CreditCard,
  note: NotebookText,
  identity: IdCard,
}

export function TypeGlyph({
  type,
  size = 'md',
  className,
}: {
  type: ItemType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const Icon = TYPE_ICONS[type]
  const meta = TYPES[type]
  return (
    <span
      className={cn('glyph', size === 'sm' && 'glyph--sm', size === 'lg' && 'glyph--lg', className)}
      style={
        {
          '--glyph-bg': meta.gradient,
          '--glyph-color': meta.color,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <Icon strokeWidth={1.8} />
    </span>
  )
}
