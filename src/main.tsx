import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// La mateixa veu tipogràfica que el portfoli (alexartazcoz.github.io)
import '@fontsource-variable/archivo'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
