import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'
import { THEMES } from './utils/themes.ts'

// Load every die font up front, so switching theme never shows a fallback. The bundled
// stylesheet (with the @font-face rules) is applied before this module script runs.
for (const { font } of THEMES) document.fonts?.load(`16px '${font}'`).catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
