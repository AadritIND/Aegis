import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/jetbrains-mono'

import './styles/base.css'
import './styles/boot.css'
import './styles/hero.css'
import './styles/sections.css'
import './styles/sections-b.css'
import './styles/anatomy.css'
import './styles/responsive.css'
import './styles/polish.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ReleaseProvider } from './lib/release'

const container = document.getElementById('root')
if (!container) throw new Error('missing #root')

createRoot(container).render(
  <StrictMode>
    <ReleaseProvider>
      <App />
    </ReleaseProvider>
  </StrictMode>,
)
