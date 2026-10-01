import React, { useState, useEffect } from 'react';
import { loadConfig, saveConfig } from '../../native/config';

// NEW (native app only): links the app to the user's Google Sheet backend (Apps Script Web App)
export default function SyncSettingsModal({ onClose, onSuccess }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfig().then(c => { setUrl(c.url || ''); setToken(c.token || ''); });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim() || !token.trim()) { setError('Both fields are required.'); return; }
    if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(url.trim())) {
      setError('URL must be the Apps Script Web App link ending with /exec');
      return;
    }
    setError('');
    setSaving(true);
    await saveConfig({ url: url.trim(), token: token.trim() });
    google.script.run
      .withSuccessHandler((payload) => { setSaving(false); onSuccess(payload); })
      .withFailureHandler((err) => { setSaving(false); setError('Connection failed: ' + ((err && err.message) || 'check URL / token')); })
      .getLibraryPayload(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl border border-sand/40">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h2 className="text-xs font-black uppercase text-forest">Google Sheet Sync Settings</h2>
          <button onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-[9px] font-black uppercase text-stone-500">Web App URL (…/exec) *</label>
            <input type="url" required value={url} onChange={e => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" className="w-full bg-alabaster border rounded p-2" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-stone-500">API Token *</label>
            <input type="password" required value={token} onChange={e => setToken(e.target.value)} placeholder="Script property API_TOKEN" className="w-full bg-alabaster border rounded p-2" />
          </div>
          {error && <p className="text-[10px] font-bold text-rose-700">{error}</p>}
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95">
            {saving ? 'Connecting...' : 'Save & Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
