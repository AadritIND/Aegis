import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CloudOff,
  Copy,
  Database,
  Download,
  Fingerprint,
  KeyRound,
  Keyboard,
  Loader2,
  LockKeyhole,
  Palette,
  Puzzle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { useStore } from '../store'
import type { AccentName, ExtensionInfo, Settings } from '../types'
import { useUpdater } from '../lib/updater'
import { cn, initials } from '../lib/utils'

const ACCENTS: { id: AccentName; label: string; color: string }[] = [
  { id: 'mint', label: 'Mint', color: '#9ff5d2' },
  { id: 'iris', label: 'Iris', color: '#c4b0ff' },
  { id: 'amber', label: 'Amber', color: '#ffd49a' },
  { id: 'rose', label: 'Rose', color: '#ffb6c9' },
]

type PromptKind = 'export' | 'import' | 'change' | 'wipe'

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof UserRound
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('glass settings-card', className)}>
      <div className="settings-card__head">
        <span className="settings-card__icon">
          <Icon size={16} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-card__body">{children}</div>
    </section>
  )
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="setting-row">
      <div className="setting-row__text">
        <span className="setting-row__title">{title}</span>
        {description && <span className="setting-row__desc">{description}</span>}
      </div>
      <div className="setting-row__control">{children}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn('switch', checked && 'is-on')}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  )
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="keys">
      {keys.map((key) => (
        <kbd className="kbd" key={key}>
          {key}
        </kbd>
      ))}
    </span>
  )
}

export function SettingsPage() {
  const {
    profile,
    updateProfile,
    settings,
    updateSettings,
    info,
    isDesktop,
    exportBackup,
    importBackup,
    changeMasterPassword,
    wipeVault,
    copy,
    addToast,
  } = useStore()
  const [name, setName] = useState(profile.name)
  const [prompt, setPrompt] = useState<PromptKind | null>(null)
  const [extension, setExtension] = useState<ExtensionInfo | null>(null)
  const [extensionBusy, setExtensionBusy] = useState(false)
  const [extensionError, setExtensionError] = useState('')
  const updater = useUpdater()

  useEffect(() => {
    setName(profile.name)
  }, [profile.name])

  const loadExtension = async () => {
    if (!isDesktop) return
    try {
      setExtension(await window.vault.extensionInfo())
      setExtensionError('')
    } catch (error) {
      setExtensionError(error instanceof Error ? error.message : 'The browser bridge is unavailable.')
    }
  }

  useEffect(() => {
    if (!isDesktop) return
    let live = true
    window.vault
      .extensionInfo()
      .then((next) => {
        if (live) setExtension(next)
      })
      .catch((error) => {
        if (live) setExtensionError(error instanceof Error ? error.message : 'The browser bridge is unavailable.')
      })
    return () => {
      live = false
    }
  }, [isDesktop])

  const updateBusy = updater.checking || updater.state.status === 'checking'
  const updateAction = () => {
    if (updater.state.status === 'downloaded') {
      updater.install()
      return
    }
    if (updater.state.status === 'available') {
      updater.download()
      return
    }
    void (async () => {
      const next = await updater.check()
      if (!next) {
        addToast({ title: 'Update check failed', detail: 'Try again in a moment.', tone: 'error' })
        return
      }
      if (next.status === 'none') {
        addToast({
          title: 'You’re up to date',
          detail: `Aegis ${next.currentVersion} is the latest release.`,
          tone: 'success',
        })
      } else if (next.status === 'disabled') {
        addToast({
          title: 'Updates use installed builds',
          detail: next.reason || 'Build a release to test the updater.',
          tone: 'info',
        })
      } else if (next.status === 'error') {
        addToast({
          title: 'Update check failed',
          detail: next.error || 'Could not reach GitHub.',
          tone: 'error',
        })
      }
    })()
  }

  const updateLabel = updater.checking
    ? 'Checking…'
    : updater.state.status === 'downloaded'
      ? 'Installed on restart'
      : updater.state.status === 'available'
        ? 'Download update'
        : updater.state.status === 'downloading'
          ? `Downloading ${updater.state.progress ?? 0}%`
          : 'Check now'

  const updateSummary =
    updater.state.status === 'available'
      ? `Aegis ${updater.state.version} is available.`
      : updater.state.status === 'downloading'
        ? `Downloading the next release in the background.`
        : updater.state.status === 'downloaded'
          ? 'The update is ready — restart to install it.'
          : updater.state.status === 'none'
            ? 'You’re on the latest published release.'
            : updater.state.status === 'error'
              ? updater.state.error || 'The last check failed.'
              : updater.state.status === 'disabled'
                ? updater.state.reason || 'Available in installed builds.'
                : 'Checks automatically after launch and every six hours.'

  const saveName = () => {
    updateProfile(name.trim())
    addToast({ title: 'Profile updated', detail: 'Stored inside your encrypted vault.', tone: 'success' })
  }

  const prepareExtension = async () => {
    setExtensionBusy(true)
    setExtensionError('')
    try {
      const result = await window.vault.extensionInstall()
      await loadExtension()
      addToast({
        title: 'Extension prepared',
        detail: `Load the unpacked folder from ${result.path}.`,
        tone: 'success',
      })
    } catch (error) {
      setExtensionError(
        error instanceof Error && error.message === 'EXTENSION_DESKTOP_ONLY'
          ? 'The extension installer is available in the desktop app.'
          : 'Could not prepare the extension folder.',
      )
    } finally {
      setExtensionBusy(false)
    }
  }

  const newPairingCode = async () => {
    setExtensionBusy(true)
    try {
      setExtension(await window.vault.extensionNewCode())
      setExtensionError('')
    } catch {
      setExtensionError('Could not generate a new pairing code.')
    } finally {
      setExtensionBusy(false)
    }
  }

  const copyPairingCode = () => {
    if (!extension?.code) return
    const code = extension.code.replace(/(\d{3})(\d{3})/, '$1 $2')
    void copy(code, { label: 'Pairing code' })
  }

  const revokeBrowser = async (id: string, browserName: string) => {
    setExtensionBusy(true)
    try {
      setExtension(await window.vault.extensionRevoke(id))
      addToast({ title: 'Browser unpaired', detail: browserName, tone: 'info' })
    } catch {
      setExtensionError('Could not revoke that browser.')
    } finally {
      setExtensionBusy(false)
    }
  }

  const modifier = info?.platform === 'darwin' ? '⌘' : 'Ctrl'
  const shortcuts = [
    { keys: [modifier, 'K'], label: 'Quick search from anywhere in Aegis' },
    { keys: [modifier, 'N'], label: 'Add a new vault item' },
    { keys: [modifier, 'G'], label: 'Open the password forge' },
    { keys: [modifier, 'L'], label: 'Lock the vault immediately' },
    { keys: [modifier, 'Shift', 'Space'], label: 'Summon Aegis and quick fill' },
    { keys: ['Esc'], label: 'Close the active dialog' },
  ]

  const autoLockOptions = [1, 2, 5, 10, 15, 30, 60]
  const clipboardOptions = [
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 0, label: 'Never clear' },
  ]

  return (
    <>
      <header className="page-head">
        <div className="page-head__left">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            Preferences · local only
          </div>
          <h1 className="page-title">Make Aegis feel like yours.</h1>
          <p className="page-sub">
            Every setting is stored inside your encrypted vault. No account, no sync, no outside
            eyes.
          </p>
        </div>
        <div className="page-actions">
          <span className="pill pill--accent">
            <CloudOff size={11} /> zero telemetry
          </span>
        </div>
      </header>

      <div className="settings-grid">
        <SettingsCard
          icon={UserRound}
          title="Profile"
          description="A name for the greeting, nothing more."
          className="settings-profile"
        >
          <div className="profile-row">
            <span className="profile-avatar">{initials(profile.name) || 'A'}</span>
            <div className="profile-fields">
              <label className="field-label" htmlFor="profile-name">
                Display name
              </label>
              <input
                id="profile-name"
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="What should we call you?"
                maxLength={40}
              />
            </div>
            <button
              type="button"
              className="btn btn-clay"
              onClick={saveName}
              disabled={name.trim() === profile.name}
            >
              Save
            </button>
          </div>
          <p className="settings-note">
            <LockKeyhole size={11} /> Your name is encrypted with the rest of your vault.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={Palette}
          title="Appearance"
          description="Tune the atmosphere to your taste."
          className="settings-appearance"
        >
          <div className="accent-row">
            {ACCENTS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                className={cn('accent-swatch', settings.accent === accent.id && 'is-active')}
                style={{ '--swatch': accent.color } as React.CSSProperties}
                onClick={() => updateSettings({ accent: accent.id })}
                aria-pressed={settings.accent === accent.id}
              >
                <span className="accent-swatch__dot" />
                <span>{accent.label}</span>
                {settings.accent === accent.id && <Check size={11} />}
              </button>
            ))}
          </div>
          <div className="settings-rows">
            <SettingRow title="Reduce motion" description="Calm the ambient animations.">
              <Toggle
                label="Reduce motion"
                checked={settings.reduceMotion}
                onChange={(next) => updateSettings({ reduceMotion: next })}
              />
            </SettingRow>
            <SettingRow title="Compact density" description="Slightly tighter spacing across the app.">
              <Toggle
                label="Compact density"
                checked={settings.compact}
                onChange={(next) => updateSettings({ compact: next })}
              />
            </SettingRow>
            <SettingRow title="Show strength in lists" description="Mini password health bars on each row.">
              <Toggle
                label="Show strength"
                checked={settings.showStrength}
                onChange={(next) => updateSettings({ showStrength: next })}
              />
            </SettingRow>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Fingerprint}
          title="Security"
          description="How quickly Aegis closes itself off."
          className="settings-security"
        >
          <div className="settings-rows">
            <SettingRow title="Auto-lock" description="Locks the vault after this much idle time.">
              <div className="select-wrap">
                <select
                  className="select"
                  value={settings.autoLockMinutes}
                  onChange={(event) =>
                    updateSettings({ autoLockMinutes: Number(event.target.value) })
                  }
                  aria-label="Auto-lock timeout"
                >
                  {autoLockOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes === 60 ? '1 hour' : `${minutes} minute${minutes === 1 ? '' : 's'}`}
                    </option>
                  ))}
                </select>
              </div>
            </SettingRow>
            <SettingRow title="Clipboard clearing" description="Sensitive copies are wiped after this long.">
              <div className="select-wrap">
                <select
                  className="select"
                  value={settings.clipboardSeconds}
                  onChange={(event) =>
                    updateSettings({ clipboardSeconds: Number(event.target.value) })
                  }
                  aria-label="Clipboard clearing timeout"
                >
                  {clipboardOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </SettingRow>
            <SettingRow
              title="Lock when Aegis loses focus"
              description="Leaving the app instantly seals the vault."
            >
              <Toggle
                label="Lock on blur"
                checked={settings.lockOnBlur}
                onChange={(next) => updateSettings({ lockOnBlur: next })}
              />
            </SettingRow>
            <SettingRow
              title="Breach intelligence"
              description="Allow anonymous checks against known breach data."
            >
              <Toggle
                label="Breach checks"
                checked={settings.breachCheck}
                onChange={(next) => updateSettings({ breachCheck: next })}
              />
            </SettingRow>
          </div>
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPrompt('change')}
            >
              <KeyRound size={13} /> Change master password
            </button>
            <span className="settings-note">
              Re-derives your key with scrypt and re-encrypts the vault.
            </span>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Database}
          title="Data & backup"
          description="Everything lives on this device."
          className="settings-data"
        >
          <div className="data-actions">
            <button type="button" className="data-action" onClick={() => setPrompt('export')}>
              <span className="data-action__icon">
                <Download size={16} />
              </span>
              <span>
                <b>Export encrypted backup</b>
                <small>Portable .aegis file, sealed with its own password.</small>
              </span>
            </button>
            <button type="button" className="data-action" onClick={() => setPrompt('import')}>
              <span className="data-action__icon">
                <Upload size={16} />
              </span>
              <span>
                <b>Restore a backup</b>
                <small>Replace this vault with a previous encrypted export.</small>
              </span>
            </button>
          </div>
          <div className="vault-path">
            <span className="field-label">Vault file</span>
            <code>{info?.vaultPath || (isDesktop ? 'Loading…' : 'Browser preview — not saved to disk')}</code>
          </div>
          <p className="settings-note">
            <ShieldCheck size={11} /> AES-256-GCM encryption, scrypt key derivation. There is no
            cloud copy to recover.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={Keyboard}
          title="Shortcuts"
          description="Move fast without leaving the keyboard."
          className="settings-shortcuts"
        >
          <div className="shortcut-list">
            {shortcuts.map((shortcut) => (
              <div className="shortcut-row" key={shortcut.label}>
                <span>{shortcut.label}</span>
                <Keys keys={shortcut.keys} />
              </div>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Puzzle}
          title="Browser extension"
          description="Autofill and save logins from Chrome, Edge, Brave or Arc."
          className="settings-extension"
        >
          {!isDesktop ? (
            <p className="settings-note">
              <Puzzle size={11} /> The companion installer is available in the installed desktop app.
            </p>
          ) : (
            <>
              <div className="extension-state">
                <span
                  className={cn(
                    'extension-dot',
                    extension?.running && !extension.locked && 'is-live',
                    extension?.locked && 'is-locked',
                  )}
                />
                <div>
                  <b>{extension?.running ? 'Bridge ready' : 'Bridge unavailable'}</b>
                  <small>
                    {extension?.error
                      ? extension.error
                      : extension?.locked
                        ? 'Unlock the vault to pair a browser or fill a login.'
                        : 'Only this computer can reach the paired browser bridge.'}
                  </small>
                </div>
                <span className="pill mono">127.0.0.1:{extension?.port || 47831}</span>
              </div>

              {extensionError && <p className="extension-error">{extensionError}</p>}

              {extension && !extension.locked && extension.code && (
                <div className="extension-code">
                  <div>
                    <span className="field-label">Pairing code</span>
                    <b>{extension.code.replace(/(\d{3})(\d{3})/, '$1 $2')}</b>
                    <small>Expires in five minutes · enter it in the extension popup</small>
                  </div>
                  <div className="extension-code__actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={copyPairingCode}>
                      <Copy size={12} /> Copy
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => void newPairingCode()}
                      disabled={extensionBusy}
                    >
                      <RefreshCw size={12} className={extensionBusy ? 'spin' : undefined} /> New
                    </button>
                  </div>
                </div>
              )}

              <div className="settings-actions">
                <button
                  type="button"
                  className="btn btn-clay"
                  onClick={() => void prepareExtension()}
                  disabled={extensionBusy}
                >
                  {extensionBusy ? <Loader2 size={13} className="spin" /> : <Puzzle size={13} />}
                  {extensionBusy ? 'Preparing…' : 'Prepare extension'}
                </button>
                <span className="settings-note">
                  Copies the extension to Downloads/Aegis Browser Extension and opens it. Chrome,
                  Edge, Brave and Arc can load it unpacked.
                </span>
              </div>

              <ol className="extension-steps">
                <li>
                  <span className="mono">01</span>
                  <p>Open <code>chrome://extensions</code> (or <code>edge://extensions</code>) and turn on Developer mode.</p>
                </li>
                <li>
                  <span className="mono">02</span>
                  <p>Choose <b>Load unpacked</b> and select the prepared <b>Aegis Browser Extension</b> folder.</p>
                </li>
                <li>
                  <span className="mono">03</span>
                  <p>Pin Aegis, open its popup, and enter the pairing code shown above. One code pairs one browser.</p>
                </li>
              </ol>

              {extension?.browsers.length ? (
                <div className="extension-browsers">
                  <span className="field-label">Paired browsers</span>
                  {extension.browsers.map((browser) => (
                    <div className="extension-browser" key={browser.id}>
                      <Puzzle size={12} />
                      <span>
                        <b>{browser.name}</b>
                        <small>
                          Paired {new Date(browser.createdAt).toLocaleDateString()}
                          {browser.lastSeenAt ? ` · last used ${new Date(browser.lastSeenAt).toLocaleDateString()}` : ''}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void revokeBrowser(browser.id, browser.name)}
                        aria-label={`Unpair ${browser.name}`}
                        title="Unpair browser"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="settings-note">No browser is paired yet.</p>
              )}
            </>
          )}
        </SettingsCard>

        <div className="settings-side">
          <SettingsCard
            icon={ShieldCheck}
            title="About Aegis"
            description="A quiet vault, built with care."
            className="settings-about"
          >
            <div className="about-badges">
              <span className="pill pill--accent">
                <LockKeyhole size={10} /> AES-256-GCM
              </span>
              <span className="pill">scrypt · 32k</span>
              <span className="pill">
                <CloudOff size={10} /> No cloud
              </span>
            </div>
            <div className="about-rows">
              <div>
                <span>Version</span>
                <b>{info?.version || '1.0.5'}</b>
              </div>
              <div>
                <span>Runtime</span>
                <b>{isDesktop ? `Electron ${info?.electron || ''}` : 'Browser preview'}</b>
              </div>
              <div>
                <span>Platform</span>
                <b>{info?.platform || '—'}</b>
              </div>
            </div>
            <div className="about-update">
              <div className="about-update__text">
                <span>Updates</span>
                <small>{updateSummary}</small>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={updateAction}
                disabled={updateBusy || updater.state.status === 'downloading'}
              >
                <RefreshCw size={13} className={updateBusy ? 'spin' : undefined} />
                {updateLabel}
              </button>
            </div>
            <p className="about-note">
              No accounts, no analytics, no remote logging. Your master password never leaves this
              machine, and neither does your vault.
            </p>
          </SettingsCard>

          <SettingsCard
            icon={AlertTriangle}
            title="Danger zone"
            description="Irreversible, by design."
            className="settings-danger"
          >
            <p className="danger-text">
              Erasing removes the encrypted vault file from this device. Without your master
              password, there is no way back.
            </p>
            <button type="button" className="btn btn-danger btn-block" onClick={() => setPrompt('wipe')}>
              <Trash2 size={14} /> Erase this vault
            </button>
          </SettingsCard>
        </div>
      </div>

      <AnimatePresence>
        {prompt && (
          <SettingsPrompt
            key={prompt}
            kind={prompt}
            onClose={() => setPrompt(null)}
            onExport={exportBackup}
            onImport={importBackup}
            onChangePassword={changeMasterPassword}
            onWipe={wipeVault}
            addToast={addToast}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function SettingsPrompt({
  kind,
  onClose,
  onExport,
  onImport,
  onChangePassword,
  onWipe,
  addToast,
}: {
  kind: PromptKind
  onClose: () => void
  onExport: (password: string) => Promise<{ cancelled: boolean; path?: string }>
  onImport: (password: string) => Promise<boolean>
  onChangePassword: (current: string, next: string) => Promise<void>
  onWipe: () => Promise<void>
  addToast: (toast: { title: string; detail?: string; tone: 'success' | 'info' | 'error' }) => void
}) {
  const [password, setPassword] = useState('')
  const [next, setNext] = useState('')
  const [current, setCurrent] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const config = {
    export: {
      eyebrow: 'Encrypted backup',
      title: 'Export your vault',
      desc: 'Choose a password for the backup file. Store it separately from your master password.',
      submit: 'Choose destination',
      icon: Download,
    },
    import: {
      eyebrow: 'Restore',
      title: 'Import a backup',
      desc: 'This replaces the current contents of your vault. Enter the backup password to decrypt it.',
      submit: 'Choose backup file',
      icon: Upload,
    },
    change: {
      eyebrow: 'Master password',
      title: 'Re-key your vault',
      desc: 'Changing the master password re-encrypts every secret. Your old password stops working immediately.',
      submit: 'Change password',
      icon: KeyRound,
    },
    wipe: {
      eyebrow: 'Danger zone',
      title: 'Erase this vault',
      desc: 'Every secret will be permanently deleted. There is no recovery, no cloud copy, no undo.',
      submit: 'Erase everything',
      icon: Trash2,
    },
  }[kind]

  const Icon = config.icon

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (kind === 'export') {
      if (password.length < 8) return setError('Use at least 8 characters for the backup password.')
      if (password !== confirm) return setError('The passwords do not match.')
      setBusy(true)
      try {
        const result = await onExport(password)
        if (!result.cancelled) {
          addToast({
            title: 'Backup exported',
            detail: result.path || 'Encrypted backup saved.',
            tone: 'success',
          })
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'The backup could not be exported.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (kind === 'import') {
      if (!password) return setError('Enter the backup password.')
      setBusy(true)
      try {
        const done = await onImport(password)
        if (!done) {
          onClose()
          return
        }
        onClose()
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        setError(
          message === 'BAD_PASSWORD'
            ? 'That password does not open this backup.'
            : message === 'INVALID_BACKUP'
              ? 'That file is not a valid Aegis backup.'
              : message || 'The backup could not be restored.',
        )
      } finally {
        setBusy(false)
      }
      return
    }
    if (kind === 'change') {
      if (!current) return setError('Enter your current master password.')
      if (next.length < 10) return setError('Use at least 10 characters for the new password.')
      if (next !== confirm) return setError('The new passwords do not match.')
      if (next === current) return setError('The new password must be different.')
      setBusy(true)
      try {
        await onChangePassword(current, next)
        onClose()
      } catch (err) {
        const message = err instanceof Error ? err.message : ''
        setError(
          message === 'BAD_PASSWORD'
            ? 'Your current password is not correct.'
            : message === 'WEAK_MASTER_PASSWORD'
              ? 'Use at least 10 characters.'
              : message || 'The password could not be changed.',
        )
      } finally {
        setBusy(false)
      }
      return
    }
    if (phrase.trim().toUpperCase() !== 'ERASE') {
      setError('Type ERASE exactly to confirm.')
      return
    }
    setBusy(true)
    try {
      await onWipe()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The vault could not be erased.')
    } finally {
      setBusy(false)
    }
  }

  const danger = kind === 'wipe'

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.form
        className="modal glass prompt"
        onSubmit={submit}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
      >
        <div className="modal__head">
          <div className="prompt__head">
            <span className={cn('prompt__icon', danger && 'is-danger')}>
              <Icon size={18} />
            </span>
            <div>
              <div className="eyebrow">
                <span className="eyebrow__dot" />
                {config.eyebrow}
              </div>
              <h2 className="modal__title">{config.title}</h2>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <p className="prompt__desc">{config.desc}</p>

        <div className="prompt__fields">
          {kind === 'export' && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="prompt-password">
                  Backup password
                </label>
                <input
                  id="prompt-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="prompt-confirm">
                  Confirm backup password
                </label>
                <input
                  id="prompt-confirm"
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Type it once more"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {kind === 'import' && (
            <div className="field">
              <label className="field-label" htmlFor="prompt-password">
                Backup password
              </label>
              <input
                id="prompt-password"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="The password used when exporting"
                autoFocus
                autoComplete="off"
              />
            </div>
          )}

          {kind === 'change' && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="prompt-current">
                  Current master password
                </label>
                <input
                  id="prompt-current"
                  className="input"
                  type="password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  autoFocus
                  autoComplete="current-password"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="prompt-next">
                  New master password
                </label>
                <input
                  id="prompt-next"
                  className="input"
                  type="password"
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                  placeholder="At least 10 characters"
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="prompt-confirm">
                  Confirm new password
                </label>
                <input
                  id="prompt-confirm"
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {kind === 'wipe' && (
            <div className="field">
              <label className="field-label" htmlFor="prompt-phrase">
                Type ERASE to confirm
              </label>
              <input
                id="prompt-phrase"
                className="input mono"
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                placeholder="ERASE"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {error && <div className="field-error">{error}</div>}

        <div className="modal__foot">
          <span className="settings-note">
            <LockKeyhole size={11} /> Local-only operation
          </span>
          <div className="modal__foot-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={cn('btn', danger ? 'btn-danger' : 'btn-primary')}
              disabled={busy}
            >
              {busy ? <Loader2 size={14} className="spin" /> : null}
              {config.submit}
            </button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  )
}
