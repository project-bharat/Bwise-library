import en from './languages/en.json';
import mr from './languages/mr.json';
import hi from './languages/hi.json';

export const SUPPORTED_LANGUAGES = ['en', 'mr', 'hi'];
export const LANGUAGE_LABELS = { en: 'English', mr: 'मराठी', hi: 'हिंदी' };
const RESOURCES = { en, mr, hi };
const STORAGE_KEY = 'bwise-display-language';
let activeLanguage = 'en';
const listeners = new Set();

export function getLanguage() {
  if (typeof localStorage === 'undefined') return activeLanguage;
  const saved = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED_LANGUAGES.includes(saved) ? saved : activeLanguage;
}

export function setLanguage(language) {
  const normalized = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  activeLanguage = normalized;
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, normalized);
  listeners.forEach(listener => listener(normalized));
  return normalized;
}

export function subscribeLanguage(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function resolveKey(resource, key) {
  return String(key).split('.').reduce((value, part) => value && value[part], resource);
}

/** Translate a stable resource key. Missing translations fall back to English, then to the key. */
export function t(key, params = {}, language = getLanguage()) {
  const normalized = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const translated = resolveKey(RESOURCES[normalized], key);
  const fallback = resolveKey(RESOURCES.en, key);
  let value = typeof translated === 'string' ? translated : (typeof fallback === 'string' ? fallback : key);
  return value.replace(/{{\s*(\w+)\s*}}/g, (_, name) => params[name] == null ? '' : String(params[name]));
}

export function getLocale(language = getLanguage()) {
  return language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
}

export function formatLocaleNumber(value, options = {}, language = getLanguage()) {
  return new Intl.NumberFormat(getLocale(language), options).format(value);
}

export function formatLocaleDate(value, options = { dateStyle: 'medium' }, language = getLanguage()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return new Intl.DateTimeFormat(getLocale(language), options).format(date);
}
