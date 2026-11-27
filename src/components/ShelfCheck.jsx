import React, { useState } from 'react';
import { canScan, scanEdition } from '../native/shelfScanner';
import { useTranslation } from '../i18n/useTranslation';
import { isbn13 } from '../isbn';


const fold = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const button = 'rounded-xl px-4 py-2.5 font-bold disabled:opacity-50';
export default function ShelfCheck({ books, onAdd }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const edition = isbn13(query);
  const inventory = books.filter(book => book && book.currentStatus !== 'WISHLISTED');
  const exact = edition ? inventory.filter(book => isbn13(book.isbn) === edition) : [];
  const reference = exact[0];
  const related = query ? inventory.filter(book => reference
    ? isbn13(book.isbn) !== edition && fold(book.title) === fold(reference.title) && fold(book.author) === fold(reference.author)
    : !edition && [book.title, book.author].some(text => fold(text).includes(fold(query)))) : [];
  function check(value, barcode = false) {
    setInput(value);
    if ((barcode || /^[\d\sXx-]+$/.test(value)) && !isbn13(value)) {
      setError('invalid'); setQuery(''); return;
    }
    setError(''); setQuery(value.trim());
  }
  async function scan() {
    setScanning(true);
    try {
      const result = await scanEdition(t('shelf.scan'));
      if (result.isbn) check(result.isbn, true);
    } catch { setError('camera'); }
    finally { setScanning(false); }
  }
  function add(book = {}) {
    onAdd({ coverData: book.coverData, title: book.title, author: book.author, category: book.category, language: book.language, isbn: isbn13(book.isbn) || edition });
  }
  function results(label, items) {
    return items.length > 0 && <section className="space-y-2"><h2 className="font-bold text-emerald-800"><i className="fa-solid fa-bookmark mr-2" />{t('shelf.' + label)}</h2>{items.map(book =>
      <article key={book.id} className="rounded-xl bg-white p-3"><b>{book.title}</b><p>{book.author}</p><p>{[book.location, book.currentStatus, book.person].filter(Boolean).join(' · ')}</p>
        <button className="mt-2 font-bold text-ochre" onClick={() => add(book)}>{t('shelf.copy')}</button></article>)}</section>;
  }
  return <section className="space-y-4 text-forest"><h1 className="flex items-center gap-3 text-xl font-black"><i className="fa-solid fa-book-open text-ochre" />{t('shelf.title')}</h1>
    <form className="space-y-3 rounded-2xl border border-sand/40 bg-white p-4 shadow-sm" onSubmit={e => { e.preventDefault(); check(input); }}>
      <label htmlFor="shelf-query" className="block text-xs font-bold text-stone-600">{t('shelf.lookup')}</label>
      <input id="shelf-query" className="w-full rounded-lg border p-2" value={input} onChange={e => {setInput(e.target.value);setQuery('');setError('');}} />
      <div className="flex gap-2"><button className={button + " bg-forest text-white"} disabled={!input.trim()} ><i className="fa-solid fa-magnifying-glass mr-2" />{t('shelf.check')}</button>
      {canScan && <button type="button" disabled={scanning} className={button + " bg-teal-100 text-teal-900"} onClick={scan}><i className="fa-solid fa-barcode mr-2" />{t('shelf.scan')}</button>}</div>
    </form>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800"><i aria-hidden="true" className="fa-solid fa-circle-exclamation mr-2" />{t('shelf.' + error)}</p>}
    {results('exact',exact)}{results('possible',related)}
    {query && !exact.length && !related.length && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4"><i className="fa-solid fa-circle-info mr-2 text-amber-700" />{t('shelf.none')}</p>}
    {edition && !exact.length && <button className={button + " bg-ochre text-white"} onClick={() => add()} ><i className="fa-solid fa-plus mr-2" />{t('legacy.New Book Entry')}</button>}
  </section>;
}
