const REPO = 'AadritIND/Aegis'
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`
const LATEST_DOWNLOAD = `https://github.com/${REPO}/releases/latest/download`
const CACHE_TTL_MS = 5 * 60 * 1000

export const ASSETS = {
  windows: {
    name: 'Aegis-Setup.exe',
    label: 'Windows x64',
    query: 'windows',
    bytes: 85251193,
    sha256: '9817b61468695c751d4cc5a646042bc5bf870d324bd3f025294c3f509541bd5a',
  },
  macZip: {
    name: 'Aegis-mac-universal.zip',
    label: 'Universal .zip',
    query: 'mac-zip',
    bytes: 178824395,
    sha256: 'dacc017de30ca542a3c0a98727785bece0ce51a11a71c5bfe4272c4970e5bb23',
  },
  macDmg: {
    name: 'Aegis-mac-universal.dmg',
    label: 'Universal .dmg',
    query: 'mac-dmg',
    bytes: 185262689,
    sha256: 'beb9019b4638148b1b514ac2fd946d6d118d1ed00164ac16be2018315c4ba1ad',
  },
}

const ASSET_BY_QUERY = Object.fromEntries(
  Object.entries(ASSETS).map(([key, asset]) => [asset.query, key]),
)

let cached = null

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}

function formatReleased(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function fallbackAsset(key) {
  const asset = ASSETS[key]
  return {
    key,
    name: asset.name,
    label: asset.label,
    file: `/api/download?asset=${asset.query}`,
    size: formatSize(asset.bytes),
    bytes: asset.bytes,
    sha256: asset.sha256,
  }
}

export function fallbackRelease() {
  return {
    version: '1.0.3',
    released: 'November 2026',
    tag: 'v1.0.3',
    source: 'fallback',
    assets: {
      windows: fallbackAsset('windows'),
      macZip: fallbackAsset('macZip'),
      macDmg: fallbackAsset('macDmg'),
    },
  }
}

function normalize(release) {
  const assets = {}
  const urls = {}

  for (const [key, asset] of Object.entries(ASSETS)) {
    const found = Array.isArray(release.assets)
      ? release.assets.find((entry) => entry && entry.name === asset.name)
      : null
    if (!found || typeof found.browser_download_url !== 'string') continue

    const bytes = Number(found.size)
    assets[key] = {
      key,
      name: asset.name,
      label: asset.label,
      file: `/api/download?asset=${asset.query}`,
      size: Number.isFinite(bytes) ? formatSize(bytes) : '',
      bytes: Number.isFinite(bytes) ? bytes : null,
      sha256: typeof found.digest === 'string' ? found.digest.replace(/^sha256:/, '') : '',
    }
    urls[key] = found.browser_download_url
  }

  if (Object.keys(assets).length !== Object.keys(ASSETS).length) {
    throw new Error('GitHub release is missing one or more installer assets')
  }

  const tag = String(release.tag_name || '')
  const version = tag.replace(/^v/, '')
  if (!version) throw new Error('GitHub release has no version tag')

  return {
    release: {
      version,
      released: formatReleased(release.published_at),
      tag,
      source: 'github',
      assets,
    },
    urls,
  }
}

export async function getLatestRelease() {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'aegis-site',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(RELEASE_API, {
    headers,
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error(`GitHub release request failed with ${response.status}`)
  }

  const value = normalize(await response.json())
  cached = { at: Date.now(), value }
  return value
}

export async function getDownloadTarget(query) {
  const key = typeof query === 'string' ? ASSET_BY_QUERY[query] : undefined
  if (!key) return null

  try {
    const { urls } = await getLatestRelease()
    if (urls[key]) return urls[key]
  } catch {
    // Fall back to GitHub's stable `latest` redirect below.
  }

  return `${LATEST_DOWNLOAD}/${ASSETS[key].name}`
}
