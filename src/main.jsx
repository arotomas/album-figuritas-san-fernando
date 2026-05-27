import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppErrorBoundary } from './components/qa/AppErrorBoundary.jsx'
import { syncQaFromUrl } from './qa/qaCore'
import './lib/supabase.js'
import './styles/index.css'
import { bootLog, bootWarn } from './utils/bootLog.js'
import { initPwaInstallCapture } from './utils/pwaInstallController.js'

bootLog('main entry')
try {
  initPwaInstallCapture()
} catch (error) {
  bootWarn('initPwaInstallCapture threw — continuing boot', error?.message)
}
syncQaFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
