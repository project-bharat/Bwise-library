import { compactCover } from './coverImage';
import { isbn13 } from './isbn';

const cacheName = 'bwise-editions-v1';
const path = (isbn, kind) => new URL('/edition-cache/' + isbn + '/' + kind, location.origin).href;
const opening = () => globalThis.caches?.open(cacheName).catch(() => null);
const pending = new Map();

async function request(url, type = 'json') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('lookupUnavailable');
    return type === 'blob' ? await response.blob() : await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function findEdition(isbn) {
  const cache = await opening();
  const cached = await cache?.match(path(isbn, 'info'));
  if (cached) {
    const info = await cached.json();
    if (!info.coverData) {
      const image = await cache.match(path(isbn, 'cover'));
      if (image) info.coverData = await compactCover(await image.blob()).catch(() => null);
    }
    return info;
  }
  if (!navigator.onLine) throw new Error('lookupUnavailable');
  let info, image;
  try {
    const data = await request('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn);
    const volume = data.items?.map(item => item.volumeInfo).find(book =>
      book?.title && book.industryIdentifiers?.some(id => isbn13(id.identifier) === isbn));
    if (volume) {
      info = { title: volume.title, author: (volume.authors || []).join(', ') };
      image = volume.imageLinks?.thumbnail?.replace(/^http:/, 'https:');
    }
  } catch { /* Open Library also indexes editions by ISBN. */ }
  if (!info) {
    const data = await request('https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=ISBN:' + isbn);
    const edition = data['ISBN:' + isbn];
    if (!edition?.title) return null;
    info = { title: edition.title, author: (edition.authors || []).map(author => author.name).join(', ') };
    image = edition.cover?.medium;
  }
  if (image?.startsWith('https://')) {
    try {
      const blob = await request(image, 'blob');
      if (/^image\/(jpeg|png|webp)$/.test(blob.type) && blob.size < 2000000) {
        info.coverData = await compactCover(blob);
        await cache?.put(path(isbn, 'cover'), new Response(blob));
      }
    } catch { /* A missing cover does not prevent saving the edition. */ }
  }
  try { await cache?.put(path(isbn, 'info'), new Response(JSON.stringify(info))); } catch { /* Storage may be full. */ }
  return info;
}

export function lookupEdition(input) {
  const isbn = isbn13(input);
  if (!isbn) return Promise.reject(new Error('invalid'));
  if (!pending.has(isbn)) pending.set(isbn, findEdition(isbn).finally(() => pending.delete(isbn)));
  return pending.get(isbn);
}

export async function cachedCover(input) {
  const isbn = isbn13(input);
  if (!isbn) return null;
  const cache = await opening();
  const response = await cache?.match(path(isbn, 'cover'));
  return response && URL.createObjectURL(await response.blob());
}
