import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/components.css'
import './styles/design.css'
import './styles/glass.css'
import './styles/splash.css'
import { installSpotlight } from './lib/spotlight'
import { initPerf } from './lib/perf'
import App from './App.tsx'
import Splash from './components/Splash'

/* Installable app: the service worker is registered on the live site only, so development is never served from a cache. */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no worker: the site still works, it just cannot be installed or opened offline */
    })
  })
}

initPerf()
installSpotlight()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Splash />
  </StrictMode>,
)
