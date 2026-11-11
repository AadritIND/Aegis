import { getDownloadTarget } from '../server/release.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const raw = req.query?.asset
  const asset = Array.isArray(raw) ? raw[0] : raw
  const target = await getDownloadTarget(asset)

  if (!target) {
    res.status(400).json({
      error: 'Unknown asset',
      assets: ['windows', 'mac-zip', 'mac-dmg', 'linux-appimage', 'linux-deb'],
    })
    return
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.setHeader('Location', target)
  res.status(302).end()
}
