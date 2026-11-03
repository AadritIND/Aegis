/* Renders the Aegis app icon to build/icon.png. */
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

app.disableHardwareAcceleration()

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 512px; height: 512px; background: transparent; overflow: hidden; }
  .tile {
    position: absolute; inset: 16px; border-radius: 118px; overflow: hidden;
    background: radial-gradient(90% 80% at 20% 0%, #123233 0%, #0a121c 45%, #06090f 100%);
    border: 1px solid rgba(255,255,255,.14);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.12), inset 0 -40px 80px rgba(0,0,0,.45);
    display: grid; place-items: center;
  }
  .blob { position: absolute; border-radius: 50%; filter: blur(56px); }
  .a { width: 330px; height: 330px; left: -90px; top: -100px; background: rgba(116, 245, 207, .5); }
  .b { width: 300px; height: 300px; right: -110px; bottom: -120px; background: rgba(112, 158, 255, .45); }
  .c { width: 190px; height: 190px; right: -40px; top: -50px; background: rgba(176, 140, 255, .28); }
  .shield { position: relative; z-index: 1; filter: drop-shadow(0 26px 38px rgba(0,0,0,.45)); }
  .rim { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(150deg, rgba(255,255,255,.12), transparent 35%, transparent 70%, rgba(255,255,255,.05)); }
</style>
</head>
<body>
  <div class="tile">
    <span class="blob a"></span>
    <span class="blob b"></span>
    <span class="blob c"></span>
    <svg class="shield" width="300" height="300" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="5" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stop-color="#b6ffdf" />
          <stop offset="0.55" stop-color="#8fe3ff" />
          <stop offset="1" stop-color="#b9a8ff" />
        </linearGradient>
        <linearGradient id="s" x1="9" y1="7" x2="23" y2="24" gradientUnits="userSpaceOnUse">
          <stop stop-color="rgba(255,255,255,.55)" />
          <stop offset="1" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d="M16 2.2 27.5 6.6v8.2c0 6.7-4.7 11.9-11.5 15.2C9.2 26.7 4.5 21.5 4.5 14.8V6.6L16 2.2Z" fill="url(#g)" stroke="rgba(255,255,255,.5)" stroke-width=".55" />
      <path d="M16 2.2 27.5 6.6v8.2c0 6.7-4.7 11.9-11.5 15.2C9.2 26.7 4.5 21.5 4.5 14.8V6.6L16 2.2Z" fill="url(#s)" opacity=".4" />
      <circle cx="16" cy="14" r="3.5" fill="#08120f" fill-opacity=".8" />
      <path d="M16 16.8v5" stroke="#08120f" stroke-opacity=".8" stroke-width="2.5" stroke-linecap="round" />
      <path d="M8.4 8 15.4 5.4" stroke="rgba(255,255,255,.55)" stroke-width=".85" stroke-linecap="round" />
    </svg>
    <span class="rim"></span>
  </div>
</body>
</html>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512,
    height: 512,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
    },
  })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  await new Promise((resolve) => setTimeout(resolve, 900))
  const image = await win.webContents.capturePage()
  fs.mkdirSync(path.join(process.cwd(), 'build'), { recursive: true })
  fs.writeFileSync(path.join(process.cwd(), 'build', 'icon.png'), image.toPNG())
  console.log('icon written', image.getSize())
  win.destroy()
  app.quit()
})
