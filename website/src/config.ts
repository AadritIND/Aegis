/* Single place to change anything the site links to or claims. */

const LATEST_RELEASE = 'https://github.com/AadritIND/Aegis/releases/latest/download'

export const SITE = {
  name: 'Aegis',
  tagline: 'The quiet vault for everything private.',
  version: '1.0.3',
  released: 'November 2026',
  // Repository / support links.
  repo: 'https://github.com/AadritIND/Aegis',
  support: 'https://github.com/AadritIND/Aegis/issues',
}

export type ReleaseArtifact = {
  label: string
  file: string
  size: string
  sha256: string
}

export type Platform = {
  id: 'windows' | 'macos' | 'linux'
  label: string
  detail: string
  file: string | null
  size: string
  status: 'ready' | 'building'
  /** platforms whose build ships more than one artifact */
  variants?: ReleaseArtifact[]
}

export const PLATFORMS: Platform[] = [
  {
    id: 'windows',
    label: 'Windows',
    detail: 'Windows 10 / 11 · x64 installer',
    file: `${LATEST_RELEASE}/Aegis-Setup.exe`,
    size: '81 MB',
    status: 'ready',
  },
  {
    id: 'macos',
    label: 'macOS',
    detail: 'macOS 11+ · universal (Apple silicon & Intel)',
    file: `${LATEST_RELEASE}/Aegis-mac-universal.zip`,
    size: '171 / 177 MB',
    status: 'ready',
    variants: [
      {
        label: 'Universal .zip',
        file: `${LATEST_RELEASE}/Aegis-mac-universal.zip`,
        size: '171 MB',
        sha256: 'dacc017de30ca542a3c0a98727785bece0ce51a11a71c5bfe4272c4970e5bb23',
      },
      {
        label: 'Universal .dmg',
        file: `${LATEST_RELEASE}/Aegis-mac-universal.dmg`,
        size: '177 MB',
        sha256: 'beb9019b4638148b1b514ac2fd946d6d118d1ed00164ac16be2018315c4ba1ad',
      },
    ],
  },
  {
    id: 'linux',
    label: 'Linux',
    detail: 'AppImage · Debian & Fedora families',
    file: null,
    size: '',
    status: 'building',
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
    a: 'Aegis ships its own secure browser window. Logins are matched by domain and only ever filled when you explicitly ask for them, which means no content script is sitting inside the pages you browse. A companion extension is on the roadmap for people who want their everyday browser.',
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

/* The installers live on the GitHub release, not in this repository, so the
   buttons always serve the same build electron-updater offers. Version and
   digests below describe v1.0.3; refresh them when the site copy should name
   a newer build. */
export const RELEASE = {
  windows: {
    file: `${LATEST_RELEASE}/Aegis-Setup.exe`,
    size: '81 MB',
    sha256: '9817b61468695c751d4cc5a646042bc5bf870d324bd3f025294c3f509541bd5a',
  },
  macos: {
    zip: {
      file: `${LATEST_RELEASE}/Aegis-mac-universal.zip`,
      size: '171 MB',
      sha256: 'dacc017de30ca542a3c0a98727785bece0ce51a11a71c5bfe4272c4970e5bb23',
    },
    dmg: {
      file: `${LATEST_RELEASE}/Aegis-mac-universal.dmg`,
      size: '177 MB',
      sha256: 'beb9019b4638148b1b514ac2fd946d6d118d1ed00164ac16be2018315c4ba1ad',
    },
  },
}
