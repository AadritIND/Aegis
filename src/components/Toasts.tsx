import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useStore } from '../store'

const icons = {
  success: Check,
  info: Info,
  error: AlertTriangle,
}

export function Toasts() {
  const { toasts, dismissToast } = useStore()

  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className={`toast toast--${toast.tone}`}
            >
              <span className="toast__icon">
                <Icon size={16} strokeWidth={2.4} />
              </span>
              <div className="toast__body">
                <div className="toast__title">{toast.title}</div>
                {toast.detail && <div className="toast__detail">{toast.detail}</div>}
              </div>
              <button
                type="button"
                className="toast__close"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
              <span className="toast__bar" />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
