import React from 'react';
import ReactDOM from 'react-dom/client';
import html2pdf from 'html2pdf.js';

// Offline-bundled fonts & icons (replaces the Google Fonts / Font Awesome CDN links)
import '@fontsource/mukta/300.css';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
import '@fontsource/mukta/800.css';
import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import '@fontsource/noto-sans-devanagari/900.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';

import App from './App';
import { installGasShim } from './native/gasShim';
import { initNative } from './native/init';

window.html2pdf = html2pdf;
installGasShim();      // google.script.run -> Apps Script Web App (Google Sheet)
initNative();          // status bar, external links, splash

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
