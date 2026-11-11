import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  MousePointerClick,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useStore } from '../store'
import type { VaultItem } from '../types'
import { hostOf, normaliseUrl } from '../lib/utils'
import { TypeGlyph } from '../components/TypeGlyph'

const WebviewTag = 'webview' as unknown as React.ElementType

export function AutofillPage() {
  const { items, copy, isDesktop, addToast, markUsed, logActivity } = useStore()
  const [address, setAddress] = useState('')
  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const webviewRef = useRef<any>(null)

  const logins = useMemo(
    () => items.filter((item) => item.type === 'login' && item.fields.url),
    [items],
  )

  const host = hostOf(address)
  const match = useMemo(() => {
    if (!host) return null
    return (
      logins.find((login) => {
        const loginHost = hostOf(login.fields.url)
        if (!loginHost) return false
        return (
          host === loginHost ||
          host.endsWith(`.${loginHost}`) ||
          loginHost.endsWith(`.${host}`)
        )
      }) || null
    )
  }, [host, logins])

  useEffect(() => {
    const element = webviewRef.current
    if (!element || !targetUrl || !isDesktop) return
    const onNavigate = (event: any) => {
      if (event?.url) setAddress(event.url)
    }
    const onStart = () => setLoading(true)
    const onStop = () => setLoading(false)
    const onFail = (event: any) => {
      setLoading(false)
      if (event?.errorCode !== -3) {
        setLoadError('That page could not be loaded. Check the address and try again.')
      }
    }
    const onReady = () => setLoadError('')
    element.addEventListener('did-navigate', onNavigate)
    element.addEventListener('did-navigate-in-page', onNavigate)
    element.addEventListener('did-start-loading', onStart)
    element.addEventListener('did-stop-loading', onStop)
    element.addEventListener('did-fail-load', onFail)
    element.addEventListener('dom-ready', onReady)
    return () => {
      element.removeEventListener('did-navigate', onNavigate)
      element.removeEventListener('did-navigate-in-page', onNavigate)
      element.removeEventListener('did-start-loading', onStart)
      element.removeEventListener('did-stop-loading', onStop)
      element.removeEventListener('did-fail-load', onFail)
      element.removeEventListener('dom-ready', onReady)
    }
  }, [targetUrl, isDesktop])

  const openBrowser = (raw: string) => {
    const url = normaliseUrl(raw.trim())
    if (!url) return
    setLoadError('')
    setAddress(url)
    if (targetUrl === url) {
      webviewRef.current?.reload?.()
    } else {
      setTargetUrl(url)
    }
  }

  const fillLogin = async () => {
    if (!match) {
      addToast({
        title: 'No login for this site',
        detail: 'Save a login with this website in your vault first.',
        tone: 'info',
      })
      return
    }
    if (!isDesktop) {
      addToast({
        title: 'Desktop only',
        detail: 'The secure browser lives in the Aegis desktop app.',
        tone: 'info',
      })
      return
    }
    const element = webviewRef.current
    if (!element) {
      addToast({
        title: 'Open a page first',
        detail: 'Load a sign-in page, then Aegis can fill it.',
        tone: 'info',
      })
      return
    }
    const username = match.fields.username || ''
    const password = match.fields.password || ''
    const script = `(() => {
      const setValue = (el, value) => {
        if (!el) return;
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const all = [...document.querySelectorAll('input')].filter(el => el.offsetParent !== null);
      const pass = all.find(el => el.type === 'password') || document.querySelector('input[type=password]');
      const user = all.find(el => {
        const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
        return ac === 'username' || ac === 'email' || el.type === 'email' || /user|email|login/i.test(el.name + ' ' + el.id);
      }) || all.find(el => el.type === 'text');
      setValue(user, ${JSON.stringify(username)});
      setValue(pass, ${JSON.stringify(password)});
      if (user) user.focus(); else if (pass) pass.focus();
      return { user: Boolean(user), pass: Boolean(pass) };
    })()`
    try {
      const result = await element.executeJavaScript(script, true)
      markUsed(match)
      logActivity('autofilled', match)
      if (result?.pass || result?.user) {
        addToast({
          title: `Filled ${match.name}`,
          detail: 'Your vault stayed out of the page. Only the fields received the values.',
          tone: 'success',
        })
      } else {
        addToast({
          title: 'No sign-in fields found',
          detail: 'This page doesn’t expose a login form Aegis can fill.',
          tone: 'info',
        })
      }
    } catch {
      addToast({
        title: 'Could not fill this page',
        detail: 'The site may block script injection.',
        tone: 'error',
      })
    }
  }

  const prepareExtension = async () => {
    try {
      const result = await window.vault.extensionInstall()
      addToast({
        title: 'Extension prepared',
        detail: `Load the unpacked folder from ${result.path}.`,
        tone: 'success',
      })
    } catch {
      addToast({
        title: 'Desktop app only',
        detail: 'Open the installed Aegis app to prepare the browser extension.',
        tone: 'info',
      })
    }
  }

  const copyField = (item: VaultItem, key: 'username' | 'password') => {
    const value = item.fields[key]
    if (!value) return
    void copy(value, {
      label: key === 'username' ? 'Username' : 'Password',
      item,
      sensitive: key === 'password',
    })
  }

  const suggestions = logins.slice(0, 4)

  return (
    <>
      <header className="page-head">
        <div className="page-head__left">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            Domain-matched · on demand only
          </div>
          <h1 className="page-title">Fill without friction.</h1>
          <p className="page-sub">
            A private browser built into Aegis. Open a sign-in page, match a credential by domain,
            and fill it without ever exposing the rest of your vault.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => void prepareExtension()}>
            <Puzzle size={12} /> Browser extension
          </button>
          <span className="pill pill--accent">
            <ShieldCheck size={11} /> isolated session
          </span>
        </div>
      </header>

      <div className="autofill-grid">
        <section className="glass browser">
          <div className="browser__bar">
            <div className="browser__url">
              <LockKeyhole size={13} className="browser__url-icon" />
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openBrowser(address)
                }}
                placeholder="Paste a sign-in URL, e.g. github.com/login"
                aria-label="Browser address"
                spellCheck={false}
              />
              {loading && <Loader2 size={13} className="spin browser__spinner" />}
            </div>
            <button
              type="button"
              className="btn btn-clay btn-sm"
              onClick={() => openBrowser(address)}
              disabled={!address.trim()}
            >
              <Globe2 size={13} /> Open
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm browser__fill"
              onClick={() => void fillLogin()}
              disabled={!match}
            >
              <Zap size={13} />
              {match ? `Fill ${match.name}` : 'Fill login'}
            </button>
            <button
              type="button"
              className="icon-btn icon-btn--glass"
              onClick={() => address && void window.vault.openExternal(normaliseUrl(address))}
              aria-label="Open in system browser"
              title="Open in system browser"
              disabled={!address}
            >
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="browser__tabbar">
            <span className="browser__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="browser__tab">
              <LockKeyhole size={10} />
              {host || 'New private tab'}
            </span>
            {match && (
              <span className="browser__match">
                <Sparkles size={11} /> {match.name} matched
              </span>
            )}
          </div>

          <div className="browser__viewport">
            {targetUrl ? (
              isDesktop ? (
                <WebviewTag
                  ref={webviewRef}
                  className="browser__webview"
                  src={targetUrl}
                  partition="persist:aegis-browser"
                  webpreferences="contextIsolation=yes,nodeIntegration=no,spellcheck=yes"
                />
              ) : (
                <div className="browser__welcome">
                  <span className="browser__welcome-orb">
                    <Globe2 size={26} />
                  </span>
                  <h3>Secure browser preview</h3>
                  <p>
                    The embedded browser runs inside the Aegis desktop app. In this browser preview,
                    matching, copying and the rest of your vault still work.
                  </p>
                  <span className="browser__preview">{targetUrl}</span>
                </div>
              )
            ) : (
              <div className="browser__welcome">
                <span className="browser__welcome-orb">
                  <Globe2 size={26} />
                </span>
                <h3>Your browser, without the exposure.</h3>
                <p>
                  Aegis only injects the matched username and password when you press Fill. Pages
                  never see your vault, your other secrets, or this session.
                </p>
                {suggestions.length > 0 ? (
                  <div className="browser__suggestions">
                    {suggestions.map((login) => (
                      <button
                        key={login.id}
                        type="button"
                        className="browser__suggestion"
                        onClick={() => openBrowser(login.fields.url)}
                      >
                        <TypeGlyph type="login" size="sm" />
                        <span>
                          <b>{login.name}</b>
                          <small>{hostOf(login.fields.url)}</small>
                        </span>
                        <ExternalLink size={12} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="browser__preview">Save a login to see site shortcuts here.</span>
                )}
              </div>
            )}
            {loadError && <div className="browser__error">{loadError}</div>}
          </div>

          <div className="browser__foot">
            <span>
              <ShieldCheck size={12} /> Remote pages are sandboxed and cannot read your vault.
            </span>
            <span className="browser__foot-match">
              {match ? (
                <>
                  <KeyRound size={12} /> {match.fields.username || 'Login ready'}
                </>
              ) : (
                'No domain match'
              )}
            </span>
          </div>
        </section>

        <div className="autofill-side">
          <section className="glass hotkey-card">
            <div className="tile-head">
              <div>
                <div className="tile-eyebrow">Summon anywhere</div>
                <h3 className="tile-title">Quick fill hotkey</h3>
              </div>
              <MousePointerClick size={15} className="tile-star" />
            </div>
            <div className="hotkey-keys">
              <kbd className="kbd">Ctrl</kbd>
              <span>+</span>
              <kbd className="kbd">Shift</kbd>
              <span>+</span>
              <kbd className="kbd">Space</kbd>
            </div>
            <p className="hotkey-text">
              Brings Aegis forward from anywhere and opens the quick-copy palette. Hit enter on a
              login to copy its password instantly.
            </p>
            <div className="hotkey-status">
              <span className={`hotkey-status__dot${isDesktop ? ' is-live' : ''}`} />
              {isDesktop ? 'Global shortcut registered' : 'Available in the desktop app'}
            </div>
            <div className="hotkey-lock">
              <kbd className="kbd">Ctrl</kbd>
              <kbd className="kbd">Shift</kbd>
              <kbd className="kbd">L</kbd>
              <span>locks everything instantly</span>
            </div>
          </section>

          <section className="glass autofill-logins">
            <div className="tile-head">
              <div>
                <div className="tile-eyebrow">Ready to fill</div>
                <h3 className="tile-title">Saved logins</h3>
              </div>
              <span className="pill">{logins.length}</span>
            </div>
            {logins.length === 0 ? (
              <div className="empty empty--inline">
                <span className="empty__orb">
                  <KeyRound size={18} />
                </span>
                <span className="empty__title">No websites yet</span>
                <span className="empty__text">Add a login with a website to enable matching.</span>
              </div>
            ) : (
              <div className="login-list">
                {logins.slice(0, 5).map((login) => (
                  <div className="login-row" key={login.id}>
                    <button
                      type="button"
                      className="login-row__main"
                      onClick={() => openBrowser(login.fields.url)}
                      title={`Open ${hostOf(login.fields.url)}`}
                    >
                      <TypeGlyph type="login" size="sm" />
                      <span className="login-row__text">
                        <span className="login-row__name">{login.name}</span>
                        <span className="login-row__sub">
                          {login.fields.username || hostOf(login.fields.url)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => copyField(login, 'username')}
                      aria-label="Copy username"
                      title="Copy username"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => copyField(login, 'password')}
                      aria-label="Copy password"
                      title="Copy password"
                    >
                      <LockKeyhole size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="autofill-features">
        <div className="glass feature-card">
          <span className="feature-card__icon">
            <Globe2 size={16} />
          </span>
          <div>
            <h4>Domain-aware matches</h4>
            <p>Only logins whose saved website matches the page you open ever become eligible.</p>
          </div>
        </div>
        <div className="glass feature-card">
          <span className="feature-card__icon">
            <ShieldCheck size={16} />
          </span>
          <div>
            <h4>Nothing leaves the page</h4>
            <p>Injection happens in an isolated browser session with no bridge to your vault.</p>
          </div>
        </div>
        <div className="glass feature-card">
          <span className="feature-card__icon">
            <Zap size={16} />
          </span>
          <div>
            <h4>Clipboard that forgets</h4>
            <p>Copied passwords clear themselves after the timeout you choose in Settings.</p>
          </div>
        </div>
      </div>
    </>
  )
}
