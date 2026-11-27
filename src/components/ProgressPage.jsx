import React, { useEffect, useMemo, useState } from 'react';
import { formatLocaleNumber } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';
import {
  normalizeAnnualReadingGoal,
  READING_BADGES,
  summarizeReadingProgress,
  validateAnnualReadingGoal
} from '../utils/progress';

const badgeAssets = import.meta.glob('../../resources/brand/Bwise_Brand_Assets/badges/badge_*.png', {
  eager: true,
  query: '?url',
  import: 'default'
});

export default function ProgressPage({ completions, readingGoal, onSaveGoal }) {
  const { t, language } = useTranslation();
  const year = new Date().getFullYear();
  const goal = normalizeAnnualReadingGoal(readingGoal, year);
  const progress = useMemo(() => summarizeReadingProgress(completions, year), [completions, year]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [draftGoal, setDraftGoal] = useState(String(goal));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftGoal(String(goal));
  }, [goal]);

  const progressPercent = Math.min(100, Math.round((progress.finishedThisYear / goal) * 100));
  const nextBadge = READING_BADGES.find(badge => progress.lifetimeFinished < badge.threshold);

  const saveGoal = async (event) => {
    event.preventDefault();
    setError('');
    let target;
    try {
      target = validateAnnualReadingGoal(draftGoal);
    } catch (validationError) {
      setError(t('progress.invalidGoal'));
      return;
    }

    setSaving(true);
    try {
      await onSaveGoal({ year, target });
      setEditingGoal(false);
    } catch (saveError) {
      setError(saveError.message || t('progress.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 pb-6" aria-labelledby="progress-title">
      <header className="px-1">
        <h1 id="progress-title" className="text-xl font-black text-forest">{t('progress.title')}</h1>
        <p className="mt-1 text-sm text-stone-600">{t('progress.encouragement')}</p>
      </header>

      <div className="rounded-2xl bg-gradient-to-br from-[#1E3535] to-[#047372] p-4 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/75">{t('progress.readingYear', { year })}</p>
            <p className="mt-2 text-3xl font-black">
              {formatLocaleNumber(progress.finishedThisYear, {}, language)}
              <span className="ml-1 text-base font-semibold text-white/70">/ {formatLocaleNumber(goal, {}, language)}</span>
            </p>
            <p className="mt-1 text-sm text-white/85">{t('progress.booksFinishedThisYear')}</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingGoal(value => !value); setError(''); }}
            className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-bold"
          >
            {editingGoal ? t('common.cancel') : t('progress.setGoal')}
          </button>
        </div>

        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-black/25"
          role="progressbar"
          aria-label={t('progress.annualGoalProgress')}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(progress.finishedThisYear, goal)}
        >
          <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-white/80">
          {t('progress.goalProgress', {
            count: formatLocaleNumber(progress.finishedThisYear, {}, language),
            goal: formatLocaleNumber(goal, {}, language)
          })}
        </p>

        {editingGoal && (
          <form onSubmit={saveGoal} className="mt-4 rounded-xl bg-white/10 p-3">
            <label htmlFor="annual-reading-goal" className="block text-xs font-bold">{t('progress.goalLabel')}</label>
            <div className="mt-2 flex gap-2">
              <input
                id="annual-reading-goal"
                type="number"
                min="1"
                max="5000"
                step="1"
                inputMode="numeric"
                value={draftGoal}
                onChange={event => setDraftGoal(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/40 bg-white px-3 py-2 text-sm font-bold text-forest"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-white px-4 py-2 text-xs font-black text-forest disabled:opacity-60"
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-white/75">{t('progress.goalRange')}</p>
            {error && <p role="alert" className="mt-2 text-xs font-semibold text-amber-100">{error}</p>}
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-sand/60 bg-white p-4 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-forest">{t('progress.milestones')}</h2>
            <p className="mt-1 text-xs text-stone-600">{t('progress.lifetimeCount', {
              count: formatLocaleNumber(progress.lifetimeFinished, {}, language)
            })}</p>
          </div>
          {nextBadge
            ? <p className="text-right text-xs font-semibold text-ochre">{t('progress.toNextBadge', {
              count: formatLocaleNumber(nextBadge.threshold - progress.lifetimeFinished, {}, language)
            })}</p>
            : <p className="text-right text-xs font-semibold text-emerald-700">{t('progress.allBadgesEarned')}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {READING_BADGES.map(badge => {
            const earned = progress.lifetimeFinished >= badge.threshold;
            const state = earned ? '' : '_locked';
            const source = `../../resources/brand/Bwise_Brand_Assets/badges/${badge.asset}${state}.png`;
            return (
              <article
                key={badge.asset}
                className={`rounded-xl border p-2 text-center ${earned ? 'border-emerald-200 bg-emerald-50/60' : 'border-stone-200 bg-stone-50'}`}
                aria-label={`${t(badge.label)}: ${earned ? t('progress.earned') : t('progress.locked')}`}
              >
                <img
                  src={badgeAssets[source]}
                  alt={t(badge.label)}
                  loading="lazy"
                  className="mx-auto aspect-square w-full max-w-36 object-contain"
                />
                <p className="mt-1 text-sm font-extrabold text-charcoal">{t(badge.label)}</p>
                <p className={`text-xs font-bold ${earned ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {earned ? t('progress.earned') : t('progress.locked')}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
