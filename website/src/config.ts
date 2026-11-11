/* Single place to change anything the site links to or claims. */

const DOWNLOAD_BASE = 'https://aegis-downloads.aadritchandravanci23.workers.dev'

// Installer traffic goes through the Cloudflare Worker so every download is
// served from the nearest edge cache instead of GitHub's release host. The
// versioned URLs returned by /api/release are used whenever the API is live;
// these `latest` URLs are the offline fallback.
const DOWNLOADS = {
  windows: `${DOWNLOAD_BASE}/dl/latest/windows`,
  macZip: `${DOWNLOAD_BASE}/dl/latest/mac-zip`,
  macDmg: `${DOWNLOAD_BASE}/dl/latest/mac-dmg`,
  linuxAppImage: `${DOWNLOAD_BASE}/dl/latest/linux-appimage`,
  linuxDeb: `${DOWNLOAD_BASE}/dl/latest/linux-deb`,
}

export const SITE = {
  name: 'Aegis',
  tagline: 'The quiet vault for everything private.',
  url: 'https://aegissvault.vercel.app',
  version: '1.0.5',
  released: 'November 2026',
  // Repository / support links.
  repo: 'https://github.com/AadritIND/Aegis',
  support: 'https://github.com/AadritIND/Aegis/issues',
}

export type Platform = {
  id: 'windows' | 'macos' | 'linux'
  label: string
  detail: string
  file: string | null
  size: string
  status: 'ready' | 'building'
}

export const PLATFORMS: Platform[] = [
  {
    id: 'windows',
    label: 'Windows',
    detail: 'Windows 10 / 11 · x64 installer',
    file: `${DOWNLOADS.windows}`,
    size: '81 MB',
    status: 'ready',
  },
  {
    id: 'macos',
    label: 'macOS',
    detail: 'macOS 11+ · universal (Apple silicon & Intel)',
    file: `${DOWNLOADS.macZip}`,
    size: '171 / 177 MB',
    status: 'ready',
  },
  {
    id: 'linux',
    label: 'Linux',
    detail: 'Linux x64 · AppImage or Debian package',
    file: `${DOWNLOADS.linuxAppImage}`,
    size: '108 MB / 74 MB',
    status: 'ready',
  },
]

export const NAV = [
  { id: 'product', label: 'Product' },
  { id: 'security', label: 'Security' },
  { id: 'forge', label: 'Forge' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
]

export const FAQ = [
  {
    q: 'Where is my vault actually stored?',
    a: 'In one encrypted file inside your operating system’s application-data folder — aegis.vault. There is no server component, no sync account and no telemetry. Copying that file to a USB stick is a complete backup of everything you own.',
  },
  {
    q: 'What happens if I forget the master password?',
    a: 'Nothing can open the vault. The key is derived from your password with scrypt and the file is sealed with AES-256-GCM, so there is no reset link, no recovery phrase and no back door — not for us, not for anyone. That is the entire point, and the app says so before it lets you in.',
  },
  {
    q: 'Is autofill a browser extension?',
    a: 'Both. Aegis keeps its own private browser, and 1.0.5 adds a companion extension for Chrome, Edge, Brave and Arc. Install it from inside the app, pair it with a six-digit code, and it fills or saves logins over a loopback connection. There is no cloud relay and no copy of the vault in the browser.',
  },
  {
    q: 'What can I keep in it besides passwords?',
    a: 'Logins, API keys, payment cards, secure notes and identities. API keys carry their own fields — endpoint, environment, scope — and cards are stored with the number masked until you reveal it. Every item type has its own editor and glyph so a twelve-item vault still reads at a glance.',
  },
  {
    q: 'Does it work offline?',
    a: 'It only works offline. Aegis never needs a network connection for anything except the optional breach check you trigger yourself, and even that only ever sends a five-character hash prefix — never a password, never a username.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing. Aegis is a local-first desktop application with no accounts to bill and no servers to pay for. There is no free tier to be upsold from because there is no paid tier to move you to.',
  },
]

/* The installers live on the GitHub release, not in this repository, and are
   cached at Cloudflare's edge by the download Worker. These values are only
   the offline fallback: the page replaces them with the latest release
   metadata from /api/release as soon as the backend responds, and checksums
   are shown only for that live metadata. */
export const RELEASE = {
  windows: {
    file: `${DOWNLOADS.windows}`,
    size: '81 MB',
  },
  macos: {
    zip: {
      file: `${DOWNLOADS.macZip}`,
      size: '171 MB',
    },
    dmg: {
      file: `${DOWNLOADS.macDmg}`,
      size: '177 MB',
    },
  },
  linux: {
    appImage: {
      file: `${DOWNLOADS.linuxAppImage}`,
      size: '108 MB',
    },
    deb: {
      file: `${DOWNLOADS.linuxDeb}`,
      size: '74 MB',
    },
  },
}
