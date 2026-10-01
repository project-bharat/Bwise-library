import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = () => Capacitor.isNativePlatform();

export async function getItem(key) {
  try {
    if (isNative()) { const { value } = await Preferences.get({ key }); return value; }
    return window.localStorage.getItem(key);
  } catch (e) { return null; }
}

export async function setItem(key, value) {
  try {
    if (isNative()) await Preferences.set({ key, value });
    else window.localStorage.setItem(key, value);
  } catch (e) { /* ignore */ }
}
