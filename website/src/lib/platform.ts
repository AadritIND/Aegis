export type PlatformId = 'windows' | 'macos' | 'linux'

export function detectPlatform(): PlatformId {
  if (typeof navigator === 'undefined') return 'windows'
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  const hint = `${uaData?.platform ?? ''} ${navigator.userAgent}`
  if (/Mac|iPhone|iPad|iPod/i.test(hint)) return 'macos'
  if (/Linux|X11|CrOS/i.test(hint) && !/Android/i.test(hint)) return 'linux'
  return 'windows'
}
