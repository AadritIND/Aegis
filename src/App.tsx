import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store'
import type { Page } from './types'
import { Background } from './components/Background'
import { LogoMark } from './components/Logo'
import { NavBar } from './components/NavBar'
import { Toasts } from './components/Toasts'
import { CommandPalette } from './components/CommandPalette'
import { ItemEditor } from './components/ItemEditor'
import { AuditModal } from './components/AuditModal'
import { Dashboard } from './pages/Dashboard'
import { VaultPage } from './pages/Vault'
import { GeneratorPage } from './pages/Generator'
import { AutofillPage } from './pages/Autofill'
import { SettingsPage } from './pages/Settings'
import { Gate } from './pages/Gate'
import { UpdatePopup } from './components/UpdatePopup'

function BootScreen() {
  return (
    <div className="boot">
      <div className="boot__mark">
        <span className="boot__pulse boot__pulse--a" />
        <span className="boot__pulse boot__pulse--b" />
        <LogoMark size={62} />
      </div>
      <span className="boot__title">Aegis</span>
      <span className="boot__sub">Opening your vault</span>
      <span className="boot__bar">
        <span />
      </span>
    </div>
  )
}

function Shell() {
  const {
    editor,
    auditOpen,
    openEditor,
    openPalette,
    paletteOpen,
    lock,
  } = useStore()
  const [page, setPage] = useState<Page>('home')
  const scrollRef = useRef<HTMLDivElement>(null)

  const navigate = useCallback((next: Page) => {
    setPage(next)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (editor.open || auditOpen) return
      const key = event.key.toLowerCase()
      if (key === 'k') {
        event.preventDefault()
        openPalette()
        return
      }
      if (paletteOpen) return
      if (key === 'n') {
        event.preventDefault()
        openEditor(null, 'login')
      } else if (key === 'g') {
        event.preventDefault()
        navigate('generator')
      } else if (key === 'l') {
        event.preventDefault()
        lock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [auditOpen, editor.open, lock, navigate, openEditor, openPalette, paletteOpen])

  return (
    <>
      <div className="app" ref={scrollRef}>
        <div className="top-fade" aria-hidden="true" />
        <NavBar page={page} onNavigate={navigate} />
        <main className="stage">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              className="page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {page === 'home' && <Dashboard onNavigate={navigate} />}
              {page === 'vault' && <VaultPage />}
              {page === 'generator' && <GeneratorPage />}
              {page === 'autofill' && <AutofillPage />}
              {page === 'settings' && <SettingsPage />}
            </motion.div>
          </AnimatePresence>
        </main>

        <CommandPalette onNavigate={navigate} />

        <AnimatePresence>
          {editor.open && (
            <ItemEditor key={`${editor.itemId || 'new'}-${editor.type}`} />
          )}
        </AnimatePresence>
        <AnimatePresence>{auditOpen && <AuditModal key="audit" />}</AnimatePresence>
      </div>
      <Toasts />
    </>
  )
}

export default function App() {
  const { phase } = useStore()

  return (
    <>
      <Background />
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'boot' && (
          <motion.div
            key="boot"
            className="phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <BootScreen />
          </motion.div>
        )}
        {(phase === 'locked' || phase === 'onboarding') && (
          <motion.div
            key={phase}
            className="phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.995 }}
            transition={{ duration: 0.4 }}
          >
            <Gate mode={phase} />
          </motion.div>
        )}
        {phase === 'unlocked' && (
          <motion.div
            key="shell"
            className="phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
          >
            <Shell />
          </motion.div>
        )}
      </AnimatePresence>
      <UpdatePopup />
    </>
  )
}
