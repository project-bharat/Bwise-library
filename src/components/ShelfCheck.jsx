import React, { useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useTranslation } from '../i18n/useTranslation';
import { isbn13 } from '../isbn';

const scanner = registerPlugin('ShelfScanner');
const fold = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const button = 'rounded-lg bg-forest px-4 py-2 font-bold text-white';
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
      const result = await scanner.scan({ prompt: t('shelf.scan') });
      if (result.isbn) check(result.isbn, true);
    } catch { setError('camera'); }
    finally { setScanning(false); }
  }
  function add(book = {}) {
    onAdd({ title: book.title, author: book.author, category: book.category, language: book.language, isbn: isbn13(book.isbn) || edition });
  }
  function results(label, items) {
    return items.length > 0 && <section className="space-y-2"><h2 className="font-bold">{t('shelf.' + label)}</h2>{items.map(book =>
      <article key={book.id} className="rounded-xl bg-white p-3"><b>{book.title}</b><p>{book.author}</p><p>{[book.location, book.currentStatus, book.person].filter(Boolean).join(' · ')}</p>
        <button className="mt-2 font-bold text-ochre" onClick={() => add(book)}>{t('shelf.copy')}</button></article>)}</section>;
  }
  return <section className="space-y-4 text-forest"><h1 className="text-xl font-black">{t('shelf.title')}</h1>
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); check(input); }}>
      <input aria-label={t('shelf.lookup')} placeholder={t('shelf.lookup')} className="w-full rounded-lg border p-2" value={input} onChange={e => {setInput(e.target.value);setQuery('');setError('');}} />
      <div className="flex gap-2"><button className={button} disabled={!input.trim()}>{t('shelf.check')}</button>
      {Capacitor.getPlatform() === 'android' && <button type="button" disabled={scanning} className={button} onClick={scan}>{t('shelf.scan')}</button>}</div>
    </form>
    {error && <p role="alert">{t('shelf.' + error)}</p>}
    {results('exact',exact)}{results('possible',related)}
    {query && !exact.length && !related.length && <p>{t('shelf.none')}</p>}
    {edition && !exact.length && <button className={button} onClick={() => add()}>{t('legacy.New Book Entry')}</button>}
  </section>;
}
