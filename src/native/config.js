import { getItem, setItem } from './storage';

// Optional build-time defaults (GitHub Actions: repo variable GAS_URL, secret GAS_TOKEN)
const DEFAULTS = {
  url: import.meta.env.VITE_GAS_URL || '',
  token: import.meta.env.VITE_GAS_TOKEN || ''
};
const KEY = 'bwise_cfg_v1';

export async function loadConfig() {
  const raw = await getItem(KEY);
  if (raw) {
    try {
      const c = JSON.parse(raw);
      return { url: c.url || DEFAULTS.url, token: c.token || DEFAULTS.token };
    } catch (e) { /* fall through */ }
  }
  return { ...DEFAULTS };
}

export async function saveConfig(cfg) {
  await setItem(KEY, JSON.stringify({ url: String(cfg.url || '').trim(), token: String(cfg.token || '').trim() }));
}

export async function isConfigured() {
  const c = await loadConfig();
  return !!(c.url && c.token);
}
