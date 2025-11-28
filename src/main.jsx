import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' // Importante para que Tailwind funcione

// --- OPCIÓN 1: Sistema de Gestión (App Principal) ---
import App from './App.jsx'

// --- OPCIÓN 2: Verificador de Correlativas (Herramienta Nueva) ---
//import CorrelativasChecker from './CorrelativasChecker.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* PARA USAR EL SISTEMA: Descomenta <App /> y comenta <CorrelativasChecker />
        PARA USAR EL VERIFICADOR: Descomenta <CorrelativasChecker /> y comenta <App /> 
    */}
    
    <App />
    {/*<CorrelativasChecker /> */}
    
  </React.StrictMode>,
)
