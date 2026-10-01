/**
 * Re-creates `google.script.run` (Apps Script HtmlService client API) on top of
 * an HTTPS call to the Apps Script Web App (backend/ApiBridge.gs -> doPost).
 * The original UI code therefore runs UNCHANGED:
 *   google.script.run.withSuccessHandler(ok).withFailureHandler(err).saveBook(payload)
 * Google Sheets stays the single source of truth; the last payload is cached for offline viewing.
 */
import { loadConfig } from './config';
import { getItem, setItem } from './storage';

const CACHE_KEY = 'bwise_payload_cache_v1';

async function callRemote(fn, args) {
  const cfg = await loadConfig();
  if (!cfg.url || !cfg.token) {
    throw new Error('Server not set up. Open menu > Sync Settings.');
  }
  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: cfg.token, fn: fn, args: args || [] }),
      redirect: 'follow'
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch (e) { throw new Error('Bad server response. Deploy the Web App with access = Anyone.'); }
    if (!json.ok) throw new Error(json.error || 'Server error');
    const data = json.data;
    if (data && data.status === 'success' && data.books) {
      setItem(CACHE_KEY, JSON.stringify(data));
    }
    return data;
  } catch (err) {
    if (fn === 'getLibraryPayload') {
      const raw = await getItem(CACHE_KEY);
      if (raw) {
        try { const cached = JSON.parse(raw); cached.offline = true; return cached; } catch (e) { /* ignore */ }
      }
    }
    const msg = String((err && err.message) || err);
    if (/failed to fetch|network|load failed|timeout/i.test(msg)) throw new Error('No connection');
    throw err;
  }
}

function makeRunner(onSuccess, onFailure) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'withSuccessHandler') return (fn) => makeRunner(fn, onFailure);
      if (prop === 'withFailureHandler') return (fn) => makeRunner(onSuccess, fn);
      return (...args) => {
        callRemote(String(prop), args)
          .then((r) => { if (onSuccess) onSuccess(r); })
          .catch((e) => { console.error('[gasShim]', prop, e); if (onFailure) onFailure(e); });
      };
    }
  });
}

export function installGasShim() {
  window.google = { script: { run: makeRunner() } };
}
