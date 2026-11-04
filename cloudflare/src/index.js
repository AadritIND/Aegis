const ASSETS = {
  windows: 'Aegis-Setup.exe',
  'mac-zip': 'Aegis-mac-universal.zip',
  'mac-dmg': 'Aegis-mac-universal.dmg',
}

const TAG_PATTERN = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/
const IMMUTABLE_SECONDS = 31536000
const LATEST_SECONDS = 300

function textResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function cacheHeaders(tag) {
  return tag === 'latest'
    ? `public, max-age=${LATEST_SECONDS}`
    : `public, max-age=${IMMUTABLE_SECONDS}, immutable`
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      })
    }

    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] !== 'dl' || parts.length < 2 || parts.length > 3) {
      return textResponse('Not found', 404)
    }

    let tag = 'latest'
    let assetKey
    if (parts.length === 2) {
      assetKey = parts[1]
    } else {
      tag = parts[1]
      assetKey = parts[2]
    }

    const assetName = ASSETS[assetKey]
    if (!assetName) return textResponse('Unknown asset', 404)
    if (tag !== 'latest' && !TAG_PATTERN.test(tag)) {
      return textResponse('Invalid version', 400)
    }

    const repo = env.REPO || 'AadritIND/Aegis'
    const originUrl =
      tag === 'latest'
        ? `https://github.com/${repo}/releases/latest/download/${assetName}`
        : `https://github.com/${repo}/releases/download/${tag}/${assetName}`

    const cache = caches.default
    const cacheKey = new Request(
      `https://aegis-downloads.internal/dl/${tag}/${assetKey}`,
      { method: 'GET' },
    )
    const range = request.headers.get('Range')

    // Serve whole-file requests from Cloudflare's edge cache when possible.
    if (request.method === 'GET' && !range) {
      const cached = await cache.match(cacheKey)
      if (cached) {
        const headers = new Headers(cached.headers)
        headers.set('Cache-Control', cacheHeaders(tag))
        headers.set('X-Aegis-Cache', 'HIT')
        return new Response(cached.body, { status: 200, headers })
      }
    }

    const upstreamHeaders = new Headers({
      'User-Agent': 'aegis-download-proxy',
    })
    if (range) upstreamHeaders.set('Range', range)

    let upstream
    try {
      upstream = await fetch(originUrl, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: 'follow',
      })
    } catch {
      return textResponse('Download temporarily unavailable', 502)
    }

    if (!upstream.ok && upstream.status !== 206) {
      return textResponse(`Download temporarily unavailable (${upstream.status})`, 502)
    }

    const headers = new Headers(upstream.headers)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', cacheHeaders(tag))
    headers.set('X-Aegis-Cache', 'MISS')
    headers.delete('Set-Cookie')
    headers.delete('Content-Security-Policy')
    headers.delete('X-Frame-Options')

    const response = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    })

    // Cache only complete GET responses; ranges are streamed straight through.
    if (request.method === 'GET' && !range) {
      ctx.waitUntil(
        cache.put(cacheKey, response.clone()).catch((error) => {
          // A cache miss must never break the download itself.
          console.error('cache.put failed', error)
        }),
      )
    }

    return response
  },
}
