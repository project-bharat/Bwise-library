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
installGasShim();      // legacy UI API shape -> local-first on-device database
initNative();          // status bar, external links, splash

class AppRenderBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('[B-wise render error]', error); }
  render() {
    if (this.state.error) return <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,background:'linear-gradient(145deg,#123D3B 0%,#047372 52%,#0A5550 100%)',color:'#fff',fontFamily:'sans-serif',textAlign:'center'}}><div><h1 style={{fontSize:22,marginBottom:8}}>B-wise Library</h1><p style={{fontSize:14}}>The library screen could not be loaded.</p><p style={{fontSize:12,opacity:.8,marginTop:8}}>Close and reopen the app. If this continues, export your backup if available and share the error with support.</p><button style={{marginTop:16,padding:'10px 16px',borderRadius:8,background:'#fff',color:'#123D3B'}} onClick={() => window.location.reload()}>Reload app</button></div></main>;
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppRenderBoundary><App /></AppRenderBoundary>);
