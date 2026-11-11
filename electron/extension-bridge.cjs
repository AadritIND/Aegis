/*
 * Aegis browser bridge.
 *
 * A deliberately small loopback HTTP service used by the packaged browser
 * companion. It binds to 127.0.0.1, accepts only extension origins, and
 * requires a pairing token created from a code shown inside an unlocked vault.
 * Credentials are returned one item at a time, only after a Fill request.
 */
'use strict'

const http = require('http')
const path = require('path')
const fs = require('fs')
const fsp = fs.promises
const crypto = require('crypto')

const HOST = '127.0.0.1'
const PORT = 47831
const CODE_TTL = 5 * 60 * 1000
const MAX_BODY = 256 * 1024
const EXTENSION_ORIGIN = /^(chrome|moz|safari-web)-extension:\/\//i

function createExtensionBridge({ app, getSession, saveData, focusWindow, lockVault }) {
  let server = null
  let lastError = ''
  let pairings = []
  let pairingsLoaded = false
  let pairingCode = null
  let pairingExpires = 0
  let pairAttempts = 0

  const pairingsFile = () => path.join(app.getPath('userData'), 'aegis-browsers.json')

  function cleanText(value, max) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : ''
  }

  function hashToken(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex')
  }

  async function loadPairings() {
    if (pairingsLoaded) return
    pairingsLoaded = true
    try {
      const raw = await fsp.readFile(pairingsFile(), 'utf8')
      const parsed = JSON.parse(raw)
      pairings = Array.isArray(parsed?.browsers)
        ? parsed.browsers.filter((entry) => entry && typeof entry.tokenHash === 'string')
        : []
    } catch (error) {
      if (error.code !== 'ENOENT') lastError = 'Could not read browser pairings.'
      pairings = []
    }
  }

  async function savePairings() {
    const file = pairingsFile()
    const tmp = `${file}.tmp`
    await fsp.mkdir(path.dirname(file), { recursive: true })
    const payload = JSON.stringify({ version: 1, browsers: pairings }, null, 2)
    await fsp.writeFile(tmp, payload, { mode: 0o600 })
    await fsp.rename(tmp, file)
  }

  function ensureCode() {
    if (!pairingCode || Date.now() >= pairingExpires) {
      pairingCode = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
      pairingExpires = Date.now() + CODE_TTL
      pairAttempts = 0
    }
    return pairingCode
  }

  function pairingFor(req) {
    const header = String(req.headers.authorization || '')
    if (!header.startsWith('Bearer ')) return null
    const hash = hashToken(header.slice(7).trim())
    const target = Buffer.from(hash)
    return (
      pairings.find((entry) => {
        try {
          const candidate = Buffer.from(entry.tokenHash)
          return candidate.length === target.length && crypto.timingSafeEqual(candidate, target)
        } catch {
          return false
        }
      }) || null
    )
  }

  function info() {
    const unlocked = Boolean(getSession())
    const code = unlocked ? ensureCode() : null
    return {
      running: Boolean(server),
      port: PORT,
      locked: !unlocked,
      code,
      codeExpiresAt: code ? pairingExpires : null,
      browsers: [...pairings]
        .sort((a, b) => Number(b.lastSeenAt || b.createdAt) - Number(a.lastSeenAt || a.createdAt))
        .map((entry) => ({
          id: entry.id,
          name: entry.name || 'Browser',
          createdAt: entry.createdAt,
          lastSeenAt: entry.lastSeenAt || null,
        })),
      error: lastError,
    }
  }

  function originAllowed(req) {
    const origin = String(req.headers.origin || '')
    return !origin || EXTENSION_ORIGIN.test(origin)
  }

  function headers(req) {
    const result = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }
    const origin = String(req.headers.origin || '')
    if (origin && EXTENSION_ORIGIN.test(origin)) {
      result['Access-Control-Allow-Origin'] = origin
      result['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
      result['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
      result['Access-Control-Allow-Private-Network'] = 'true'
      result['Vary'] = 'Origin'
    }
    return result
  }

  function send(res, status, payload, req) {
    if (res.writableEnded) return
    const body = JSON.stringify(payload)
    res.writeHead(status, headers(req))
    res.end(body)
  }

  function httpError(status, code, message) {
    const error = new Error(message)
    error.status = status
    error.code = code
    return error
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0
      const chunks = []
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_BODY) {
          reject(httpError(413, 'TOO_LARGE', 'Request body is too large.'))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => {
        if (!chunks.length) return resolve({})
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch {
          reject(httpError(400, 'BAD_JSON', 'Request body must be JSON.'))
        }
      })
      req.on('error', reject)
    })
  }

  function hostOf(value) {
    try {
      const url = new URL(/^https?:\/\//i.test(String(value)) ? String(value) : `https://${value}`)
      return url.hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return ''
    }
  }

  function cleanUrl(value) {
    try {
      const url = new URL(String(value))
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
      url.username = ''
      url.password = ''
      url.hash = ''
      return url.toString()
    } catch {
      return ''
    }
  }

  function sameSite(a, b) {
    if (!a || !b) return false
    return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)
  }

  function requireAuth(req) {
    const pairing = pairingFor(req)
    if (!pairing) throw httpError(401, 'NOT_PAIRED', 'This browser is not paired with Aegis.')
    const session = getSession()
    if (!session) throw httpError(423, 'LOCKED', 'Aegis is locked. Unlock the desktop app first.')
    pairing.lastSeenAt = Date.now()
    return { pairing, session }
  }

  function matchItems(session, value) {
    const host = hostOf(value)
    if (!host) return []
    return session.data.items
      .filter((item) => {
        if (!item || item.type !== 'login') return false
        const itemHost = hostOf(item.fields?.url)
        return sameSite(host, itemHost)
      })
      .sort((a, b) => Number(b.lastUsedAt || 0) - Number(a.lastUsedAt || 0))
      .map((item) => ({
        id: item.id,
        name: item.name || hostOf(item.fields?.url) || 'Saved login',
        username: item.fields?.username || '',
        url: item.fields?.url || '',
      }))
  }

  function addActivity(data, kind, item) {
    const entry = {
      id: crypto.randomUUID(),
      kind,
      itemId: item.id,
      itemName: item.name,
      at: Date.now(),
    }
    data.activity = [entry, ...(data.activity || [])].slice(0, 200)
  }

  async function route(req, res) {
    if (req.method === 'OPTIONS') {
      if (!originAllowed(req)) return send(res, 403, { error: 'Origin not allowed.', code: 'FORBIDDEN' }, req)
      res.writeHead(204, headers(req))
      return res.end()
    }
    if (!originAllowed(req)) {
      return send(res, 403, { error: 'Origin not allowed.', code: 'FORBIDDEN' }, req)
    }

    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`)
    const pathName = url.pathname
    const method = req.method || 'GET'

    if (method === 'GET' && pathName === '/v1/status') {
      const paired = Boolean(pairingFor(req))
      return send(
        res,
        200,
        {
          app: 'Aegis',
          version: app.getVersion(),
          locked: !getSession(),
          paired,
        },
        req,
      )
    }

    if (method === 'POST' && pathName === '/v1/pair') {
      if (!getSession()) throw httpError(423, 'LOCKED', 'Unlock Aegis before pairing a browser.')
      if (!pairingCode || Date.now() >= pairingExpires) {
        throw httpError(410, 'CODE_EXPIRED', 'That pairing code has expired. Ask Aegis for a new one.')
      }
      if (pairAttempts >= 12) {
        throw httpError(429, 'TOO_MANY_ATTEMPTS', 'Too many pairing attempts. Generate a new code.')
      }
      const body = await readJson(req)
      const code = cleanText(body.code, 12).replace(/\s+/g, '')
      if (code !== pairingCode) {
        pairAttempts += 1
        throw httpError(401, 'BAD_CODE', 'That pairing code is not correct.')
      }
      pairingCode = null
      pairingExpires = 0
      pairAttempts = 0
      const browser = cleanText(body.browser, 64) || 'Chromium browser'
      const token = `aegis_${crypto.randomBytes(32).toString('base64url')}`
      const entry = {
        id: crypto.randomUUID(),
        name: browser,
        tokenHash: hashToken(token),
        createdAt: Date.now(),
        lastSeenAt: null,
      }
      pairings.push(entry)
      await savePairings()
      return send(res, 200, { token, browser: entry.name, id: entry.id }, req)
    }

    if (method === 'POST' && pathName === '/v1/focus') {
      focusWindow()
      return send(res, 200, { ok: true }, req)
    }

    if (method === 'POST' && pathName === '/v1/lock') {
      requireAuth(req)
      lockVault()
      return send(res, 200, { ok: true }, req)
    }

    if (method === 'GET' && pathName === '/v1/matches') {
      const { session } = requireAuth(req)
      const items = matchItems(session, url.searchParams.get('url') || '')
      return send(res, 200, { items }, req)
    }

    if (method === 'POST' && pathName === '/v1/fill') {
      const { session } = requireAuth(req)
      const body = await readJson(req)
      const item = session.data.items.find((entry) => entry.id === cleanText(body.id, 80))
      if (!item || item.type !== 'login') {
        throw httpError(404, 'NOT_FOUND', 'That login is no longer in the vault.')
      }
      const pageHost = hostOf(body.url)
      const itemHost = hostOf(item.fields?.url)
      if (!sameSite(pageHost, itemHost)) {
        throw httpError(403, 'DOMAIN_MISMATCH', 'That login does not match this website.')
      }
      return send(
        res,
        200,
        {
          id: item.id,
          name: item.name,
          username: item.fields?.username || '',
          password: item.fields?.password || '',
        },
        req,
      )
    }

    if (method === 'POST' && pathName === '/v1/save') {
      const { session } = requireAuth(req)
      const body = await readJson(req)
      const pageUrl = cleanUrl(body.url)
      const pageHost = hostOf(pageUrl)
      if (!pageUrl || !pageHost) throw httpError(400, 'BAD_URL', 'A valid website address is required.')
      const username = cleanText(body.username, 512)
      const password = typeof body.password === 'string' ? body.password.slice(0, 4096) : ''
      if (!password) throw httpError(400, 'EMPTY_PASSWORD', 'A password is required to save a login.')
      const requestedName = cleanText(body.name, 100)
      const data = JSON.parse(JSON.stringify(session.data))
      data.updatedAt = Date.now()
      const existing = data.items.find(
        (item) =>
          item &&
          item.type === 'login' &&
          sameSite(pageHost, hostOf(item.fields?.url)) &&
          String(item.fields?.username || '').toLowerCase() === username.toLowerCase(),
      )

      if (existing) {
        existing.fields = { ...(existing.fields || {}), password }
        existing.updatedAt = data.updatedAt
        addActivity(data, 'updated', existing)
        await saveData(data)
        return send(res, 200, { action: 'updated', id: existing.id, name: existing.name }, req)
      }

      const name = requestedName || pageHost
      const item = {
        id: crypto.randomUUID(),
        type: 'login',
        name,
        favorite: false,
        tags: ['browser'],
        notes: '',
        fields: { url: pageUrl, username, password },
        custom: [],
        createdAt: data.updatedAt,
        updatedAt: data.updatedAt,
      }
      data.items = [item, ...(data.items || [])]
      addActivity(data, 'created', item)
      await saveData(data)
      return send(res, 200, { action: 'created', id: item.id, name: item.name }, req)
    }

    return send(res, 404, { error: 'Not found.', code: 'NOT_FOUND' }, req)
  }

  function start() {
    if (server) return Promise.resolve()
    return loadPairings().then(
      () =>
        new Promise((resolve) => {
          server = http.createServer((req, res) => {
            void route(req, res).catch((error) => {
              send(
                res,
                Number(error.status) || 500,
                {
                  error: error.message || 'Aegis bridge error.',
                  code: error.code || 'BRIDGE_ERROR',
                },
                req,
              )
            })
          })
          server.on('error', (error) => {
            lastError =
              error.code === 'EADDRINUSE'
                ? 'Port 47831 is already in use. Quit the other Aegis instance and restart.'
                : 'The browser bridge could not start.'
            try {
              server?.close()
            } catch {
              /* ignore */
            }
            server = null
            resolve()
          })
          server.listen(PORT, HOST, () => {
            lastError = ''
            resolve()
          })
        }),
    )
  }

  function stop() {
    if (!server) return
    try {
      server.close()
    } catch {
      /* already closed */
    }
    server = null
  }

  async function revoke(id) {
    const before = pairings.length
    pairings = pairings.filter((entry) => entry.id !== id)
    if (pairings.length !== before) await savePairings()
    return info()
  }

  async function clearAll() {
    pairings = []
    pairingCode = null
    pairingExpires = 0
    try {
      await fsp.rm(pairingsFile(), { force: true })
    } catch {
      /* ignore */
    }
    return info()
  }

  return {
    start,
    stop,
    info,
    newCode() {
      if (!getSession()) return info()
      pairingCode = null
      ensureCode()
      return info()
    },
    clearCode() {
      pairingCode = null
      pairingExpires = 0
      pairAttempts = 0
    },
    revoke,
    clearAll,
  }
}

module.exports = { createExtensionBridge }
