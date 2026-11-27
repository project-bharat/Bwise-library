import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';

export default function AccountModal({ configured, setupReason, user, onClose, onSignIn, onSignOut }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message || t('legacy.Account action failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl border border-sand/40">
        <div className="flex justify-between items-center border-b border-sand/40 pb-2 mb-3">
          <h2 className="text-sm font-black uppercase text-forest">{t('legacy.Google Account')}</h2>
          <button onClick={onClose} className="text-stone-500 p-1" title={t('legacy.Close')}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {!configured ? (
          <p className="text-xs text-stone-600">
            {setupReason === 'firebase'
              ? t('legacy.Firebase configuration is missing.')
              : setupReason === 'client'
                ? t('legacy.Google web client ID is missing.')
                : t('legacy.Google sign-in could not be initialized.')}
          </p>
        ) : user ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-600">
              {t('legacy.Signed in as')} <strong className="text-charcoal">{user.email || user.displayName}</strong>
            </p>
            <p className="text-xs text-stone-500">{t('legacy.Drive sync is not available yet.')}</p>
            <button
              onClick={() => handleAction(onSignOut)}
              disabled={busy}
              className="w-full rounded-lg bg-forest text-white py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {busy ? t('legacy.Signing out...') : t('legacy.Sign out')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-stone-600">{t('legacy.Your library remains on this device.')}</p>
            <button
              onClick={() => handleAction(onSignIn)}
              disabled={busy}
              className="w-full rounded-lg bg-forest text-white py-2.5 text-xs font-bold disabled:opacity-50"
            >
              {busy ? t('legacy.Signing in...') : t('legacy.Sign in with Google')}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
      </div>
    </div>
  );
}
