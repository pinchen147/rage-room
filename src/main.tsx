import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './ui/DevErrorOverlay'
import './styles.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

// No StrictMode: it double-invokes effects, double-initialising the physics
// world and WebGL context in R3F. Correctness > the dev-only checks here.
createRoot(container).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
