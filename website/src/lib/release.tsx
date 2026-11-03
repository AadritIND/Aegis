import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { RELEASE, SITE } from '../config'

export type ReleaseAsset = {
  key: string
  name: string
  label: string
  file: string
  size: string
  bytes: number | null
  sha256: string
}

export type LatestRelease = {
  version: string
  released: string
  tag: string
  source: 'github' | 'fallback'
  assets: {
    windows: ReleaseAsset
    macZip: ReleaseAsset
    macDmg: ReleaseAsset
  }
}

const FALLBACK: LatestRelease = {
  version: SITE.version,
  released: SITE.released,
  tag: `v${SITE.version}`,
  source: 'fallback',
  assets: {
    windows: {
      key: 'windows',
      name: 'Aegis-Setup.exe',
      label: 'Windows x64',
      file: RELEASE.windows.file,
      size: RELEASE.windows.size,
      bytes: 85251193,
      sha256: RELEASE.windows.sha256,
    },
    macZip: {
      key: 'macZip',
      name: 'Aegis-mac-universal.zip',
      label: 'Universal .zip',
      file: RELEASE.macos.zip.file,
      size: RELEASE.macos.zip.size,
      bytes: 178824395,
      sha256: RELEASE.macos.zip.sha256,
    },
    macDmg: {
      key: 'macDmg',
      name: 'Aegis-mac-universal.dmg',
      label: 'Universal .dmg',
      file: RELEASE.macos.dmg.file,
      size: RELEASE.macos.dmg.size,
      bytes: 185262689,
      sha256: RELEASE.macos.dmg.sha256,
    },
  },
}

const ReleaseContext = createContext<LatestRelease>(FALLBACK)

function isLatestRelease(value: unknown): value is LatestRelease {
  if (!value || typeof value !== 'object') return false
  const candidate = value as {
    version?: unknown
    released?: unknown
    assets?: unknown
  }
  if (typeof candidate.version !== 'string' || typeof candidate.released !== 'string') return false
  if (!candidate.assets || typeof candidate.assets !== 'object') return false

  const assets = candidate.assets as Record<string, { file?: unknown; sha256?: unknown; size?: unknown }>
  return (['windows', 'macZip', 'macDmg'] as const).every((key) => {
    const asset = assets[key]
    return Boolean(
      asset &&
        typeof asset.file === 'string' &&
        typeof asset.sha256 === 'string' &&
        typeof asset.size === 'string',
    )
  })
}

export function ReleaseProvider({ children }: { children: ReactNode }) {
  const [release, setRelease] = useState<LatestRelease>(FALLBACK)

  useEffect(() => {
    if (!import.meta.env.PROD) return
    let live = true

    fetch('/api/release', { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (live && isLatestRelease(data)) setRelease(data)
      })
      .catch(() => {
        // The local fallback keeps every download path usable if the API is down.
      })

    return () => {
      live = false
    }
  }, [])

  return <ReleaseContext.Provider value={release}>{children}</ReleaseContext.Provider>
}

export function useRelease() {
  return useContext(ReleaseContext)
}
