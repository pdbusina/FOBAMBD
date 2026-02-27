import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css' // Importante para que Tailwind funcione

// --- OPCIÓN 1: Sistema de Gestión (App Principal) ---
import App from './App.jsx'

// --- OPCIÓN 2: Verificador de Correlativas (Herramienta Nueva) ---
//import CorrelativasChecker from './CorrelativasChecker.jsx'


window.onerror = function (msg, url, line, col, error) {
  var div = document.createElement('div');
  div.style.color = 'red';
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.background = 'white';
  div.style.zIndex = '9999';
  div.innerHTML = '<h1>ERROR CRÍTICO:</h1><pre>' + msg + '\n' + url + ':' + line + ':' + col + '\n' + (error ? error.stack : '') + '</pre>';
  document.body.appendChild(div);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* PARA USAR EL SISTEMA: Descomenta <App /> y comenta <CorrelativasChecker />
        PARA USAR EL VERIFICADOR: Descomenta <CorrelativasChecker /> y comenta <App /> 
    */}

    <App />
    {/*<CorrelativasChecker /> */}

  </React.StrictMode>,
)
