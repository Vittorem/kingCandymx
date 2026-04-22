import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css';
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
    // Configured to autoUpdate, this checks for updates and immediately reload
    registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
