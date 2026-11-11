# Aegis Browser Companion

A Chromium Manifest V3 extension that fills and saves logins from the Aegis desktop app.
It talks only to the app on `http://127.0.0.1:47831`; there is no cloud service and the
extension never receives the vault file or master password.

## Install from Aegis

1. Install and open Aegis, then unlock your vault.
2. Go to **Settings → Browser extension**.
3. Press **Prepare extension**. Aegis copies this folder to Downloads and opens it.
4. In Chrome, Edge, Brave or Arc, open `chrome://extensions`, enable **Developer mode**,
   choose **Load unpacked**, and select the **Aegis Browser Extension** folder.
5. Pin the Aegis companion. Open its popup and enter the six-digit pairing code shown in
   Aegis. The code expires after five minutes; use **New code** if needed.

The unpacked install is intentional: Chrome does not allow a desktop application to
silently add an extension outside the Web Store or an enterprise policy. Once the
extension is published to a store, the same popup flow works without developer mode.

## Use

- Open the popup on a sign-in page to see domain-matched logins.
- Press **Fill**, or use `Alt+Shift+F` / right-click → **Fill with Aegis**.
- Auto-save is on by default. Turn it off in the popup or the extension settings page.
- Unpair from the popup, the options page, or Aegis → Settings → Browser extension.

## Security model

- The local bridge binds to `127.0.0.1` only.
- Pairing requires a code displayed inside an unlocked Aegis vault.
- Aegis stores only a SHA-256 hash of each browser token, never the token itself.
- The bridge refuses requests while the vault is locked and rejects web-page origins.
- The extension stores its token in `chrome.storage.local`; it does not store credentials.
- Credentials are returned only for the one item the user chooses to fill.
- Auto-save stores the submitted credential in the encrypted vault on this computer.

## Files

- `manifest.json` — Manifest V3 definition
- `background.js` — loopback client, pairing, fill/save orchestration
- `content.js` — login-form detection, field filling, auto-save capture
- `popup.html/css/js` — paired-browser UI
- `options.html/css/js` — auto-save and connection settings
- `icons/` — 16, 32, 48 and 128 pixel marks
