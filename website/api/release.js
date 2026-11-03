import { fallbackRelease, getLatestRelease } from '../server/release.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { release } = await getLatestRelease()
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.setHeader('X-Aegis-Release-Source', release.source)
    res.status(200).json(release)
  } catch {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.setHeader('X-Aegis-Release-Source', 'fallback')
    res.status(200).json(fallbackRelease())
  }
}
