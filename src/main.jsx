/**
 * Ponto de entrada da aplicação React
 * Configura o root e renderiza o componente principal
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Renderiza a aplicação no elemento root do HTML
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
