import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Browser } from '@capacitor/browser';

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#1E3535' });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (e) { /* ignore */ }
  // WhatsApp / LinkedIn / GitHub links opened with window.open() -> system browser / app
  window.open = (url) => { if (url) Browser.open({ url: String(url) }); return null; };
  try { await SplashScreen.hide(); } catch (e) { /* ignore */ }
}
