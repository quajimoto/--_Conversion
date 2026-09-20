import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// If accessed via direct path (e.g. /evaluation), redirect to hash route (#/evaluation)
if (window.location.pathname && window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  const path = window.location.pathname.replace(/^\//, '');
  window.history.replaceState(null, '', '/#/' + path + window.location.search + window.location.hash);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
