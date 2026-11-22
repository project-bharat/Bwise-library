import React, { useEffect, useState } from 'react';
import { formatLocaleDate, getLocale } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import { libraryPremium } from '../native/premium';
import { restoreCloudLibrary } from '../native/localDb';
import { isNative } from '../native/storage';

const preview = { monthly: '₹29', yearly: '₹265', lifetime: '₹2,049' };
const primary = 'min-h-12 w-full rounded-xl bg-forest px-4 py-2 text-sm font-black text-white disabled:opacity-45';
const secondary = 'min-h-11 rounded-xl border border-forest/20 px-4 py-2 text-sm font-bold text-forest disabled:opacity-45';
const knownErrors = new Set(['billingUnavailable', 'pending', 'requiresPro', 'googleSetup', 'reconnect',
  'backupConflict', 'noBackup', 'tooLarge', 'invalidBackup', 'driveUnavailable']);

export default function PremiumFlow({ screen, onScreen, onRestored, state, onState }) {
  const { t, language } = useTranslation();
  const [plan, setPlan] = useState('yearly');
  const [products, setProducts] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [restore, setRestore] = useState(null);

  useEffect(() => {
    if (screen !== 'plans' || !isNative()) return;
    let current = true;
    libraryPremium.products().then(result => { if (current) setProducts(result); })
      .catch(() => { if (current) setProducts({}); });
    return () => { current = false; };
  }, [screen]);

  const run = async action => {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      const key = error?.message;
      if (key !== 'cancelled') setMessage(knownErrors.has(key) ? key : 'driveUnavailable');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setMessage('');
    setRestore(null);
    onScreen(null);
  };

  if (!screen) return null;

  if (screen === 'prompt') {
    return (
      <div className="fixed inset-0 z-[65] grid place-items-center bg-black/45 p-5" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="premium-prompt-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
          <i aria-hidden="true" className="fa-solid fa-cloud-arrow-up mb-4 text-3xl text-ochre" />
          <h2 id="premium-prompt-title" className="text-2xl font-black text-forest">{t('premium.promptTitle')}</h2>
          <p className="mt-2 text-sm text-stone-600">{t('premium.promptDetail')}</p>
          <button type="button" className={`${primary} mt-5`} onClick={() => onScreen('plans')}>{t('premium.get')}</button>
          <button type="button" className="mt-2 min-h-11 w-full text-sm font-bold text-forest" onClick={close}>{t('premium.later')}</button>
        </section>
      </div>
    );
  }

  const selected = products[plan];
  const terms = selected
    ? t(plan === 'lifetime' ? 'premium.once' : 'premium.renews', {
      price: selected.price, period: t(plan === 'monthly' ? 'premium.perMonth' : 'premium.perYear'),
    })
    : t('premium.unavailable');
  const yearly = products.yearly;
  const monthly = products.monthly;
  const bestValue = yearly && monthly
    ? yearly.currency === monthly.currency && yearly.micros < monthly.micros * 12
    : !yearly && !monthly;
  const cloud = screen === 'cloud';

  return (
    <section role="dialog" aria-modal="true" aria-labelledby="premium-title" className="fixed inset-0 z-[65] mx-auto flex max-w-xl flex-col bg-gradient-to-b from-[#D6E9DD] via-[#F6F4EA] to-white text-charcoal">
      <header className="flex shrink-0 items-center justify-between border-b border-forest/10 bg-white px-5 py-3">
        <h2 id="premium-title" className="flex items-center gap-2 text-xl font-black text-forest">{!cloud && <i className="fa-solid fa-crown text-[#B48129]" />}{t(cloud ? 'premium.cloud' : 'premium.title')}</h2>
        <button type="button" className="grid h-11 w-11 place-items-center text-lg text-forest" aria-label={t('legacy.Close')} onClick={close} disabled={busy}>
          <i aria-hidden="true" className="fa-solid fa-xmark" />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {cloud ? (
          <>
            <ul className="space-y-3 rounded-2xl bg-white p-4 text-sm">{['featureData', 'featureAuto', 'featureRestore'].map(key => <li key={key} className="flex gap-3"><i className="fa-solid fa-check text-forest" />{t('premium.' + key)}</li>)}</ul>
            {!state.pro ? (
              <button type="button" className={primary} onClick={() => onScreen('plans')}>{t('year.connectPro')}</button>
            ) : state.account ? (
              <div className="space-y-3 rounded-2xl bg-white p-4">
                <p className="break-all font-bold text-forest">{state.account}</p>
                <label className="flex min-h-11 items-center justify-between gap-3 font-bold text-forest">
                  {t('premium.auto')}
                  <input type="checkbox" checked={state.auto} disabled={busy} className="h-5 w-5 accent-forest"
                    onChange={event => { const enabled = event.target.checked; run(async () => onState(await libraryPremium.autoBackup({ enabled }))); }} />
                </label>
                <p className="text-sm text-stone-600">{state.synced
                  ? t('premium.lastSync', { date: formatLocaleDate(state.synced, { dateStyle: 'medium', timeStyle: 'short' }, language) })
                  : t('premium.neverSynced')}</p>
                <button type="button" className={primary} disabled={busy} onClick={() => run(async () => {
                  onState(await libraryPremium.backupNow()); setMessage('backupDone');
                })}>{t('premium.backupNow')}</button>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} disabled={busy} onClick={() => run(async () => setRestore(await libraryPremium.cloudBackup()))}>{t('premium.restore')}</button>
                  <button type="button" className={secondary} disabled={busy} onClick={() => run(async () => {
                    await libraryPremium.unlink();
                    onState({ pro: true, account: '', auto: false, synced: 0 });
                  })}>{t('premium.disconnect')}</button>
                  {(message === 'reconnect' || state.error === 'reconnect') && (
                    <button type="button" className={secondary} disabled={busy} onClick={() => run(async () => onState(await libraryPremium.link()))}>{t('premium.connect')}</button>
                  )}
                </div>
              </div>
            ) : (
              <button type="button" className={primary} disabled={busy} onClick={() => run(async () => onState(await libraryPremium.link()))}>{t('premium.connect')}</button>
            )}
            {restore && (
              <div className="space-y-2 rounded-2xl border border-ochre/40 bg-white p-4">
                <p className="text-sm font-bold text-forest">{t('premium.restoreConfirm', {
                  date: formatLocaleDate(restore.backup.modifiedTime, { dateStyle: 'medium', timeStyle: 'short' }, language),
                })}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} disabled={busy} onClick={() => setRestore(null)}>{t('legacy.Cancel')}</button>
                  <button type="button" className={secondary} disabled={busy} onClick={() => run(async () => {
                    const { data, serialized } = await restoreCloudLibrary(restore.backup.payload);
                    onRestored(data);
                    setRestore(null);
                    onState(await libraryPremium.restored({ account: restore.account, version: restore.backup.version, serialized }));
                    setMessage('restored');
                  })}>{t('premium.restore')}</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-forest to-[#096960] p-5 text-white">
              <div className="mb-3 flex items-center gap-3"><img src="/horizontal-logo.png" alt="B-wise Library" className="h-9 w-auto object-contain" /><span className="rounded bg-[#EDD294] px-2 py-1 text-xs font-black text-forest">Premium</span></div>
              <p className="text-lg font-black">{t('premium.promptTitle')}</p>
              <p className="mt-1 text-sm text-white/85">{t('premium.promptDetail')}</p>
            </div>
            <fieldset className="space-y-4">
              <legend className="sr-only">{t('premium.title')}</legend>
              {Object.keys(preview).map(key => {
                const product = products[key];
                const daily = product?.micros && product.currency
                  ? new Intl.NumberFormat(getLocale(language), { style: 'currency', currency: product.currency })
                    .format(product.micros / 1e6 / (key === 'monthly' ? 30 : 365))
                  : null;
                return (
                  <label key={key} className={`relative flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 ${plan === key ? 'border-forest ring-1 ring-forest' : 'border-forest/15'}`}>
                    <input type="radio" name="premium-plan" checked={plan === key} onChange={() => setPlan(key)} className="shrink-0 accent-forest" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-forest">{t(`premium.${key}`)}</span>
                      <span className="block text-xs text-stone-600">{t(`premium.${key}Detail`)}</span>
                      {key === 'yearly' && bestValue && <span className="absolute -top-2.5 right-3 rounded bg-[#EDD294] px-2 text-xs font-bold text-forest">{t('premium.best')}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-base font-black text-forest">{product?.price || preview[key]}</span>
                      {daily && <span className="text-xs text-stone-600">{t('premium.daily', { price: daily })}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div className="rounded-2xl bg-white p-4">
              <h3 className="font-black text-forest">{t('premium.included')}</h3>
              <ul className="mt-2 space-y-2 text-sm text-stone-700">
                {['featureAuto', 'featureRestore', 'featureData'].map(key => (
                  <li key={key} className="flex items-baseline gap-2"><i aria-hidden="true" className="fa-solid fa-check text-forest" />{t(`premium.${key}`)}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-stone-600">{t('premium.free')}</p>
            </div>
          </>
        )}
        {(message || (cloud && state.error)) && <p role="status" className="rounded-xl bg-white p-3 text-sm text-forest">{t(`premium.${message || state.error}`)}</p>}
        {busy && <p role="status" className="text-sm text-forest">{t('premium.working')}</p>}
      </div>
      {!cloud && (
        <footer className="shrink-0 space-y-2 border-t border-forest/10 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center">
          <button type="button" className={primary} disabled={busy || (!state.pro && !selected)} onClick={() => run(async () => {
            const next = state.pro ? state : await libraryPremium.buy({ plan });
            onState(next);
            if (next.pro) onScreen('cloud');
          })}>{t(state.pro ? 'premium.cloud' : 'premium.buy')}</button>
          {state.pro || <p className="text-xs text-stone-600">{terms}</p>}
          {isNative() && !state.pro && (
            <button type="button" className="min-h-11 px-2 text-sm font-bold text-forest" disabled={busy} onClick={() => run(async () => {
              const next = await libraryPremium.status();
              onState(next);
              if (next.pro) onScreen('cloud');
              else setMessage('noPurchase');
            })}>{t('premium.restorePurchase')}</button>
          )}
        </footer>
      )}
    </section>
  );
}
