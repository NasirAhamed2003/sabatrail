import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './styles/tokens.css'
import './index.css'
import './components/ui/ui.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { PlansProvider } from './lib/plans.tsx'
import { StartPointProvider } from './lib/startPoint.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <StartPointProvider>
            <PlansProvider>
              <App />
            </PlansProvider>
          </StartPointProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
