import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};
const googleWebClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '';

let auth = null;
let setupPromise = null;

export function initializeAccountAuth() {
  if (!setupPromise) {
    setupPromise = (async () => {
      const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
      if (missing.length) {
        return { configured: false, auth: null, reason: 'firebase' };
      }

      if (Capacitor.isNativePlatform()) {
        if (!googleWebClientId) {
          return { configured: false, auth: null, reason: 'client' };
        }
        await GoogleSignIn.initialize({ clientId: googleWebClientId });
      }

      const app = getApps().find(item => item.name === 'bwise-library') || initializeApp(config, 'bwise-library');
      auth = getAuth(app);
      return { configured: true, auth, reason: '' };
    })();
  }
  return setupPromise;
}

export function observeAccount(callback) {
  if (!auth) throw new Error('Google sign-in is not initialized.');
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Google sign-in is not initialized.');

  if (Capacitor.isNativePlatform()) {
    const result = await GoogleSignIn.signIn();
    if (!result.idToken) throw new Error('Google sign-in did not return an ID token.');
    return signInWithCredential(auth, GoogleAuthProvider.credential(result.idToken));
  }

  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutAccount() {
  if (!auth) throw new Error('Google sign-in is not initialized.');
  await signOut(auth);
  if (Capacitor.isNativePlatform()) await GoogleSignIn.signOut();
}
