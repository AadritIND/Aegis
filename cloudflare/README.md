# Aegis download Worker

A small Cloudflare Worker that puts a global cache in front of the GitHub Releases installers.
GitHub remains the source of truth; the Worker fetches the current asset and serves it from the
nearest Cloudflare edge instead of making every visitor download from GitHub's release host.

## Routes

| Route | Asset |
| --- | --- |
| `/dl/windows` | `Aegis-Setup.exe` |
| `/dl/mac-zip` | `Aegis-mac-universal.zip` |
| `/dl/mac-dmg` | `Aegis-mac-universal.dmg` |
| `/dl/linux-appimage` | `Aegis-Linux-x86_64.AppImage` |
| `/dl/linux-deb` | `Aegis-Linux-x86_64.deb` |
| `/dl/<tag>/<asset>` | The same assets pinned to a release tag, e.g. `/dl/v1.0.5/windows` |

`latest` routes cache for five minutes. Versioned routes are cached immutably, so a new release
gets a fresh URL and never serves a stale installer. Range requests are streamed through to
GitHub so resumable downloads keep working.

The Worker only accepts the five whitelisted asset names and tags matching `v<major>.<minor>.<patch>`,
so it cannot be used as an open proxy.

## Deploy

```bash
cd cloudflare
npm install
npx wrangler login   # one-time
npx wrangler deploy
```

The deployed URL is printed by Wrangler. It is also referenced in:

- `website/server/release.js` (`DOWNLOAD_BASE`)
- `website/src/config.ts` (offline fallback)

To use a different hostname, set `DOWNLOAD_BASE` in Vercel and update the fallback constant in
`website/src/config.ts`, then redeploy the site.

## Verify

```bash
curl -I https://aegis-downloads.aadritchandravanci23.workers.dev/dl/v1.0.5/windows
curl -r 0-1048575 -o NUL -w "%{http_code} %{speed_download}\n" \
  https://aegis-downloads.aadritchandravanci23.workers.dev/dl/v1.0.5/windows
```

A full request should return `200` with `Content-Disposition: attachment` and the installer's
`Content-Length`; a range request should return `206` with `Content-Range`.
