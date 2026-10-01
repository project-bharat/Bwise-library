/**
 * Local-first compatibility layer for the existing UI.
 * The google.script.run shape is retained so existing forms work, but every
 * read/write is handled by the on-device database. No Google Sheet is required.
 */
import { mutateLocal } from './localDb';

function makeRunner(onSuccess, onFailure) {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'withSuccessHandler') return (fn) => makeRunner(fn, onFailure);
      if (prop === 'withFailureHandler') return (fn) => makeRunner(onSuccess, fn);
      return (...args) => {
        mutateLocal(String(prop), args)
          .then((result) => { if (onSuccess) onSuccess(result); })
          .catch((error) => {
            console.error('[localDb]', prop, error);
            if (onFailure) onFailure(error);
          });
      };
    }
  });
}

export function installGasShim() {
  window.google = { script: { run: makeRunner() } };
}
