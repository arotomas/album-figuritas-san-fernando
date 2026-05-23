import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppErrorBoundary } from './components/qa/AppErrorBoundary.jsx'
import { syncQaModeFromUrl } from './utils/qaMode'
import './lib/supabase.js'
import './styles/index.css'

syncQaModeFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
