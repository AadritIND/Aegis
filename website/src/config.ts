/* Single place to change anything the site links to or claims. */

export const SITE = {
  name: 'Aegis',
  tagline: 'The quiet vault for everything private.',
  version: '1.0.0',
  released: 'October 2026',
  // Repository / support links — point these at the real destinations when they exist.
  repo: 'https://github.com/',
  support: 'mailto:hello@aegis.example',
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
  /** platforms whose build ships more than one artifact (e.g. two Mac chips) */
  variants?: ReleaseArtifact[]
}

export const PLATFORMS: Platform[] = [
  {
    id: 'windows',
    label: 'Windows',
    detail: 'Windows 10 / 11 · x64 installer',
    file: '/downloads/Aegis-Setup-1.0.0.exe',
    size: '81 MB',
    status: 'ready',
  },
  {
    id: 'macos',
    label: 'macOS',
    detail: 'macOS 11+ · Apple silicon & Intel',
    file: '/downloads/Aegis-1.0.0-mac-arm64.zip',
    size: '99 / 104 MB',
    status: 'ready',
    variants: [
      {
        label: 'Apple silicon',
        file: '/downloads/Aegis-1.0.0-mac-arm64.zip',
        size: '99 MB',
        sha256: '46b4f5051c701c1c17ba0a1e3d07019af4843c124cce31b049a0bd7a92ae4996',
      },
      {
        label: 'Intel',
        file: '/downloads/Aegis-1.0.0-mac-x64.zip',
        size: '104 MB',
        sha256: 'b294d39da5853ebddeb848c0f5fe9c1e3f88060fff4f43f55d192ba6e7eae55b',
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

/* Real artifacts produced by `npm run dist` (Windows) and `npm run dist:mac`
   (macOS) in the app project.
   Hosting note: keep the binaries next to the site (public/downloads) or move them
   to a release bucket / GitHub release and point the `file` fields at those URLs.
   Static hosts will not carry 80–105 MB assets. */
export const RELEASE = {
  windows: {
    file: '/downloads/Aegis-Setup-1.0.0.exe',
    size: '81 MB',
    sha256: 'af4f013f91c8212542c469383c3147cbf17e1f865172a642a399cbad4222778b',
  },
  macos: {
    arm64: {
      file: '/downloads/Aegis-1.0.0-mac-arm64.zip',
      size: '99 MB',
      sha256: '46b4f5051c701c1c17ba0a1e3d07019af4843c124cce31b049a0bd7a92ae4996',
    },
    x64: {
      file: '/downloads/Aegis-1.0.0-mac-x64.zip',
      size: '104 MB',
      sha256: 'b294d39da5853ebddeb848c0f5fe9c1e3f88060fff4f43f55d192ba6e7eae55b',
    },
  },
}
