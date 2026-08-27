/**
 * React entry for the extension side panel / overlay iframe.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { isOverlayFrame } from './hooks/use-overlay-resize'
import './styles.css'

if (isOverlayFrame()) {
  document.documentElement.classList.add('is-overlay')
  document.body.classList.add('is-overlay')
}

const root = document.getElementById('root')
if (!root) {
  throw new Error('Page2Design side panel root is missing.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
