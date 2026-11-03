import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/sora'
import '@fontsource-variable/jetbrains-mono'
import './styles/base.css'
import './styles/app.css'
import App from './App'
import { StoreProvider } from './store'
import { mockBridge } from './lib/mock'

if (!window.vault) {
  window.vault = mockBridge
}

document.documentElement.dataset.accent = 'mint'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
)
