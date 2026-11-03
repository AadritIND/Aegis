import type { ItemType } from '../types'

export interface FieldDef {
  key: string
  label: string
  placeholder?: string
  secret?: boolean
  multiline?: boolean
  full?: boolean
  mono?: boolean
  hint?: string
  inputMode?: 'text' | 'email' | 'url' | 'tel' | 'numeric'
}

export interface TypeMeta {
  label: string
  plural: string
  short: string
  description: string
  color: string
  gradient: string
  fields: FieldDef[]
  secretKey?: string
}

export const TYPE_ORDER: ItemType[] = ['login', 'apikey', 'card', 'note', 'identity']

export const TYPES: Record<ItemType, TypeMeta> = {
  login: {
    label: 'Login',
    plural: 'Logins',
    short: 'LOG',
    description: 'Sites and apps you sign into',
    color: '#9ff5d2',
    gradient: 'linear-gradient(145deg, rgba(159,245,210,.22), rgba(72,186,255,.08))',
    secretKey: 'password',
    fields: [
      { key: 'url', label: 'Website', placeholder: 'github.com', inputMode: 'url' },
      {
        key: 'username',
        label: 'Email or username',
        placeholder: 'you@example.com',
        inputMode: 'email',
      },
      { key: 'password', label: 'Password', placeholder: '••••••••••••', secret: true },
      {
        key: 'totp',
        label: 'One-time secret',
        placeholder: 'otpauth://… or BASE32',
        mono: true,
        full: true,
        hint: 'Optional · adds a live 2FA code',
      },
    ],
  },
  apikey: {
    label: 'API key',
    plural: 'API keys',
    short: 'KEY',
    description: 'Credentials for services and bots',
    color: '#b7a4ff',
    gradient: 'linear-gradient(145deg, rgba(183,164,255,.24), rgba(255,129,210,.07))',
    secretKey: 'secret',
    fields: [
      { key: 'keyId', label: 'Key ID / public key', placeholder: 'ak_live_…', mono: true },
      {
        key: 'environment',
        label: 'Environment',
        placeholder: 'production',
      },
      { key: 'secret', label: 'Secret key', placeholder: 'Paste the secret', secret: true, full: true },
      {
        key: 'scopes',
        label: 'Scopes / permissions',
        placeholder: 'read:users, write:tokens',
        full: true,
      },
      {
        key: 'endpoint',
        label: 'Dashboard or docs',
        placeholder: 'https://dashboard.stripe.com',
        inputMode: 'url',
        full: true,
      },
    ],
  },
  card: {
    label: 'Card',
    plural: 'Cards',
    short: 'CRD',
    description: 'Payment cards, kept offline',
    color: '#ffd39b',
    gradient: 'linear-gradient(145deg, rgba(255,211,155,.24), rgba(255,129,129,.07))',
    secretKey: 'cvv',
    fields: [
      { key: 'cardholder', label: 'Cardholder', placeholder: 'Name on card' },
      { key: 'brand', label: 'Network', placeholder: 'Visa' },
      { key: 'number', label: 'Card number', placeholder: '•••• •••• •••• ••••', secret: true, full: true },
      { key: 'expiry', label: 'Expiry', placeholder: 'MM / YY' },
      { key: 'cvv', label: 'Security code', placeholder: '•••', secret: true },
    ],
  },
  note: {
    label: 'Note',
    plural: 'Notes',
    short: 'NTE',
    description: 'Encrypted freeform thoughts',
    color: '#9cc9ff',
    gradient: 'linear-gradient(145deg, rgba(156,201,255,.22), rgba(122,109,255,.08))',
    fields: [
      {
        key: 'body',
        label: 'Note',
        placeholder: 'Recovery phrases, onboarding steps, anything private…',
        multiline: true,
        full: true,
      },
    ],
  },
  identity: {
    label: 'Identity',
    plural: 'Identities',
    short: 'ID',
    description: 'Personal details for forms',
    color: '#ffb3c7',
    gradient: 'linear-gradient(145deg, rgba(255,179,199,.22), rgba(255,146,102,.07))',
    fields: [
      { key: 'fullName', label: 'Full name', placeholder: 'Alex Rivera' },
      { key: 'email', label: 'Email', placeholder: 'alex@example.com', inputMode: 'email' },
      { key: 'phone', label: 'Phone', placeholder: '+1 555 010 2048', inputMode: 'tel' },
      { key: 'dob', label: 'Date of birth', placeholder: '1994-08-12' },
      {
        key: 'address',
        label: 'Address',
        placeholder: 'Street, city, postal code, country',
        multiline: true,
        full: true,
      },
    ],
  },
}

export const TAGS_SUGGESTIONS = ['work', 'personal', 'finance', 'dev', 'client', 'shared', '2fa']

export function emptyFields(type: ItemType): Record<string, string> {
  return Object.fromEntries(TYPES[type].fields.map((field) => [field.key, '']))
}

export function secretItems(items: { fields: Record<string, string>; type: ItemType }[]) {
  return items
    .map((item) => ({ type: item.type, value: item.fields[TYPES[item.type].secretKey || ''] }))
    .filter((entry): entry is { type: ItemType; value: string } => Boolean(entry.value))
}
