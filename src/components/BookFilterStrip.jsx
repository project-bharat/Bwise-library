import React, { useEffect, useRef, useState } from 'react';
import { formatLocaleNumber } from '../i18n';
import { useTranslation } from '../i18n/useTranslation';

const chipStyle = 'min-h-8 shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre';
const idleStyle = 'border-sand/70 bg-white text-charcoal';
const activeStyle = 'border-forest/40 bg-forest/10 text-forest';

export default function BookFilterStrip({ groups, selections, onChange, onReset, openGroup, onOpenGroup }) {
  const { t, language } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef(null);
  const total = Object.values(selections).reduce((sum, items) => sum + items.length, 0);
  const group = groups.find(item => item.key === openGroup);
  const formatCount = value => formatLocaleNumber(value, {
    numberingSystem: language === 'en' ? 'latn' : 'deva',
  }, language);

  useEffect(() => {
    const element = dialog.current;
    if (openGroup) {
      if (!element.open) element.showModal();
    } else if (element.open) {
      element.close();
    }
  }, [openGroup]);

  const toggleOrClear = () => {
    if (total) {
      onReset();
      setExpanded(false);
    } else {
      setExpanded(value => !value);
    }
  };

  return (
    <div className="mb-3 flex min-w-0 items-center gap-2">
      <button
        type="button"
        className={`${chipStyle} ${total || expanded ? activeStyle : idleStyle}`}
        aria-expanded={expanded || total > 0}
        aria-controls="book-filter-groups"
        onClick={toggleOrClear}
      >
        <i aria-hidden="true" className={total ? 'fa-solid fa-xmark' : 'fa-solid fa-sliders'} />
        {total ? <>{t('year.clear')} <span className="rounded bg-black px-1.5 text-white">{formatCount(total)}</span></> : t('bookFilters.title')}
      </button>
      <div
        id="book-filter-groups"
        hidden={!expanded && !total}
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain hide-scrollbar"
      >
        <div className="flex w-max gap-2 px-0.5 py-1">
          {groups.map(({ key, label }) => {
            const count = selections[key]?.length ?? 0;
            return (
              <button
                key={key}
                type="button"
                aria-haspopup="dialog"
                className={`${chipStyle} ${count ? activeStyle : idleStyle}`}
                onClick={() => onOpenGroup(key)}
              >
                {label}
                {count > 0 && <span className="rounded bg-black px-1.5 text-white">{formatCount(count)}</span>}
                <i aria-hidden="true" className="fa-solid fa-chevron-down text-[9px]" />
              </button>
            );
          })}
        </div>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="book-filter-title"
        className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[75dvh] w-full max-w-xl overflow-hidden rounded-t-2xl border-0 bg-white p-0 text-charcoal backdrop:bg-black/45"
        onClose={() => onOpenGroup(null)}
        onClick={event => { if (event.target === event.currentTarget) onOpenGroup(null); }}
      >
        {group && (
          <div className="flex max-h-[75dvh] flex-col">
            <h2 id="book-filter-title" className="px-5 pb-2 pt-4 text-base font-black text-forest">{group.label}</h2>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5">
              {group.options.length === 0 && <p className="py-3 text-sm text-stone-600">{t('bookFilters.empty')}</p>}
              {group.options.map(value => (
                <label key={value} className="flex min-h-11 items-center gap-3 border-b border-sand/30 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selections[group.key]?.includes(value) ?? false}
                    onChange={() => onChange(group.key, value)}
                    className="h-4 w-4 shrink-0 accent-forest"
                  />
                  <span className="[overflow-wrap:anywhere]">{value}</span>
                </label>
              ))}
            </div>
            <div className="border-t border-sand/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => onOpenGroup(null)} className="min-h-11 w-full rounded-xl bg-forest px-4 text-sm font-bold text-white">
                {t('bookFilters.done')}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
