import { compactCover } from '../../coverImage';
import { canScan, scanEdition } from '../../native/shelfScanner';
import { categoryLabel } from '../../genres';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n/useTranslation';

import { lookupEdition } from '../../bookMetadata';
import { isbn13 } from '../../isbn';

// DIALOG 1: EDIT BOOK DETAILS (With Location Dropdown, Default Current_Status='My Collection')
export default function BookDetailsModal({ isNew, initial, config, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [isbn, setIsbn] = useState(initial.isbn || '');
  const [rating, setRating] = useState(initial.rating || '');
  const [tags, setTags] = useState((initial.tags || []).join(', '));
  const [feedback, setFeedback] = useState('');
  const lookupId = useRef(0);
  useEffect(() => () => { lookupId.current++; }, []);
  const [coverData, setCover] = useState(initial.coverData || '');
  const [coverBusy, setCoverBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  async function scan() {
    setScanBusy(true);
    try {
      const { isbn: scanned } = await scanEdition(t('shelf.scan'));
      if (!scanned) return;
      const code = isbn13(scanned);
      if (!code) { setFeedback('invalid'); return; }
      setIsbn(code);
      await lookup(code);
    } catch { setFeedback('camera'); }
    finally { setScanBusy(false); }
  }
  useEffect(() => {
    if (isNew && isbn13(initial.isbn) && !initial.title) lookup(initial.isbn);
  }, []);
  async function lookup(code) {
    const id = ++lookupId.current;
    setFeedback('loading');
    try {
      const result = await lookupEdition(code);
      if (lookupId.current !== id) return;
      if (result) {
        if (result.coverData) setCover(value => value || result.coverData);
        setTitle(value => value.trim() ? value : result.title);
        setAuthor(value => value.trim() ? value : result.author);
      }
      setFeedback(result ? 'found' : 'missing');
    } catch {
      if (lookupId.current === id) setFeedback('offline');
    }
  }
  const [title, setTitle] = useState(initial.title || '');
  const [author, setAuthor] = useState(initial.author || '');
  const [category, setCategory] = useState(initial.category || (config.categories && config.categories[0]) || 'Literature');
  const [language, setLanguage] = useState(initial.language || 'English');
  const [amount, setAmount] = useState(initial.amount || '');
  const [initialStatus, setInitialStatus] = useState(initial.initialStatus || 'Purchased');
  const [location, setLocation] = useState(initial.location || 'At Home');
  const [bookInDate, setBookInDate] = useState(initial.bookInDate || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(initial.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() && !isbn13(isbn)) return alert(t('legacy.Book title is required'));
    if (isbn.trim() && !isbn13(isbn)) return alert(t('shelf.invalid'));
    setIsSubmitting(true);
    const payload = {
      ...initial,
      coverData,
      isbn: isbn13(isbn),
      rating: rating ? Number(rating) : null,
      tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))],
      id: isNew ? '' : initial.id,
      bookInDate: bookInDate,
      title: title.trim() || isbn13(isbn),
      metadataStatus: !title.trim() || (initial.metadataStatus === 'pending' && title.trim() === isbn13(isbn))
        ? 'pending' : undefined,
      author: author.trim() || 'Unknown',
      category,
      language,
      amount: parseFloat(amount) || 0,
      initialStatus,
      location: location,
      notes: notes.trim(),
      currentStatus: isNew ? 'My Collection' : (initial.currentStatus || 'My Collection'),
      readingStatus: isNew ? 'UNREAD' : (initial.readingStatus || 'UNREAD'),
      person: initial.person || '',
      eventDate: initial.eventDate || bookInDate,
      promiseReturnDate: initial.promiseReturnDate || ''
    };
    if (window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(() => setIsSubmitting(false)).saveBook(payload);
    } else {
      setTimeout(() => onSuccess(null), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5">
      <div className="bg-white w-full max-w-sm rounded-xl p-3.5 shadow-2xl border border-sand/40 max-h-[90dvh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-sand/40 pb-1.5 mb-2.5">
          <h2 className="text-xs font-black uppercase text-forest tracking-wide">
            {isNew ? t('legacy.New Book Entry') : t('legacy.Edit Book Details')}
          </h2>
          {isNew && canScan && <button type="button" disabled={scanBusy} className="ml-auto mr-2 rounded-lg bg-ochre px-3 py-2 text-xs font-bold text-white" onClick={scan}><i className="fa-solid fa-barcode mr-2" />{t('shelf.scan')}</button>}
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1" title={t('legacy.Close (Esc)')}><i className="fa-solid fa-xmark text-sm"></i></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 text-xs">
          <div>
            <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Book Title')} *</label>
            <input type="text" required={!isbn13(isbn)} autoFocus value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1.5 font-bold text-xs" />
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2">
            {coverData ? <img alt="" className="h-12 w-9 object-contain" src={coverData} /> : <i className="fa-solid fa-image text-ochre" />}
            {t('meta.cover')}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={coverBusy} onChange={async e => {
              const file = e.target.files?.[0];
              if (!file) return;
              setCoverBusy(true);
              try { setCover(await compactCover(file)); }
              catch { setFeedback('coverError'); }
              finally { setCoverBusy(false); }
            }} />
          </label>
          <label className="block font-bold">ISBN <input value={isbn} onChange={e => { lookupId.current++; setFeedback(''); setIsbn(e.target.value); }} className="w-full rounded border bg-alabaster p-1.5" /></label>
          {isbn13(isbn) && <button type="button" disabled={feedback === 'loading'} className="font-bold text-ochre" onClick={() => lookup(isbn)}>{t('meta.lookup')}</button>}
          {feedback && <p role="status">{t((['invalid','camera'].includes(feedback) ? 'shelf.' : 'meta.') + feedback)}</p>}
          <div className="flex gap-2">
            <label>{t('meta.rating')}<select className="block rounded border p-1" value={rating} onChange={e => setRating(e.target.value)}>
              <option value="">—</option>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ★</option>)}</select></label>
            <label className="flex-1">{t('meta.tags')}<input className="block w-full rounded border p-1" value={tags} onChange={e => setTags(e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Author')}</label><input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs" /></div>
            <div><label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Amount (₹)')}</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs" /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Category')}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs">
                {((config && config.categories) || []).map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Language')}</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs">
                <option>{t('legacy.Marathi')}</option><option>{t('legacy.Hindi')}</option><option>{t('legacy.English')}</option><option>Sanskrit</option><option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Initial Status')}</label>
              <select value={initialStatus} onChange={e => setInitialStatus(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs">
                {((config && config.initialStatuses) || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Location')}</label>
              <select value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs font-bold text-forest">
                {((config && config.locations) || ['At Home', 'At Office', 'To Person']).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Book In Date')}</label>
            <input type="date" value={bookInDate} onChange={e => setBookInDate(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs" />
          </div>

          <div>
            <label className="text-[8px] font-black uppercase text-stone-500">{t('legacy.Notes')}</label>
            <input type="text" placeholder={t('legacy.Notes')} value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1 text-xs" />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button type="button" onClick={onClose} className="w-1/3 py-2 bg-stone-100 text-stone-700 font-bold rounded text-xs uppercase active:scale-95">{t('legacy.Cancel')}</button>
            <button type="submit" disabled={isSubmitting || coverBusy || scanBusy || feedback === 'loading'} className="w-2/3 py-2 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95 shadow">
              {isSubmitting ? 'Saving...' : 'Save Book Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
