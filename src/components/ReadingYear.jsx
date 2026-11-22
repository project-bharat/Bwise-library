import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { getLocale } from '../i18n';

export default function ReadingYear({ books }) {
  const { t, language } = useTranslation();
  const now = new Date();
  const year = now.getFullYear();
  const key = 'bwise-reading-goal-' + year;
  const [goal, setGoal] = useState(() => Number(localStorage.getItem(key)) || 0);
  const [draft, setDraft] = useState(goal || '');
  const months = Array(12).fill(0);
  const today = now.toLocaleDateString('sv-SE');
  for (const book of books) {
    let finished = false;
    for (const entry of Array.isArray(book?.journey) ? book.journey : []) {
      if (!entry) continue;
      const stage = entry.readingStatus || entry.newStatus;
      const complete = ['DONE', 'FINISHED'].includes(String(stage).toUpperCase());
      if (complete && !finished && String(entry.changeDate).startsWith(year + '-')) {
        const month = Number(entry.changeDate.slice(5, 7));
        if (month >= 1 && month <= 12 && entry.changeDate.slice(0, 10) <= today) {
          months[month - 1]++;
          break;
        }
      }
      if (entry.readingStatus || complete) finished = complete;
    }
  }
  const total = months.reduce((sum, count) => sum + count, 0);
  const locale = getLocale(language);
  const number = value => value.toLocaleString(locale, { numberingSystem: language === 'en' ? 'latn' : 'deva' });
  const monthName = new Intl.DateTimeFormat(locale, { month: 'short' });
  const elapsed = (now - new Date(year, 0, 1)) / (new Date(year + 1, 0, 1) - new Date(year, 0, 1));
  return <section className="space-y-4">
    <header><h1 className="text-2xl font-black text-forest">{t('year.title')}</h1><p className="text-sm text-stone-600">{t('year.detail')}</p></header>
    <div className="space-y-3 rounded-2xl bg-forest p-5 text-white">
      <p className="text-sm">{number(year)}</p>
      <p className="text-3xl font-black">{number(total)}{goal > 0 && ' / ' + number(goal)}</p>
      {goal > 0 && <><progress className="w-full accent-amber-300" value={Math.min(total, goal)} max={goal} /><p>{t(total >= goal ? 'year.reached' : total >= Math.floor(goal * elapsed) ? 'year.onPace' : 'year.behind')}</p></>}
    </div>
    <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); const value = Number(draft); localStorage.setItem(key, String(value)); setGoal(value); }}>
      <label className="flex-1 text-sm font-bold">{t('year.goal')}<input required type="number" min="1" max="9999" step="1" value={draft} onChange={e => setDraft(e.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
      <button className="rounded-lg bg-forest px-4 py-2 text-white">{t('year.save')}</button>
    </form>
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-3">{months.map((count, index) => <div key={index} className="rounded-lg bg-alabaster p-2 text-center"><span className="block text-xs">{monthName.format(new Date(year,index,1))}</span><b>{number(count)}</b></div>)}</div>
  </section>;
}
