import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { getItem } from './storage';
import { EMPTY_INITIAL_DATA } from '../utils';

const DATA_FILE = 'bwise-library-data.json';
const LEGACY_CACHE_KEY = 'bwise_payload_cache_v1';
let writeQueue = Promise.resolve();

const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePayload(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...clone(EMPTY_INITIAL_DATA),
    ...source,
    status: 'success',
    offline: false,
    config: { ...clone(EMPTY_INITIAL_DATA.config), ...(source.config || {}) },
    books: Array.isArray(source.books) ? source.books : [],
    people: Array.isArray(source.people) ? source.people : [],
    wishlist: Array.isArray(source.wishlist) ? source.wishlist : []
  };
}

async function readFile() {
  const result = await Filesystem.readFile({
    path: DATA_FILE,
    directory: Directory.Data,
    encoding: 'utf8'
  });
  return result.data;
}

async function writeFile(text) {
  await Filesystem.writeFile({
    path: DATA_FILE,
    directory: Directory.Data,
    data: text,
    encoding: 'utf8',
    recursive: true
  });
}

async function loadPayload() {
  if (!Capacitor.isNativePlatform()) {
    const raw = window.localStorage.getItem(DATA_FILE);
    if (raw) {
      try { return normalizePayload(JSON.parse(raw)); } catch (_) { /* reset invalid data */ }
    }
  } else {
    try {
      const raw = await readFile();
      if (raw) return normalizePayload(JSON.parse(raw));
    } catch (_) {
      // First launch: try migrating the old offline viewing cache.
    }
  }

  const legacy = await getItem(LEGACY_CACHE_KEY);
  if (legacy) {
    try {
      const migrated = normalizePayload(JSON.parse(legacy));
      await persistPayload(migrated);
      return migrated;
    } catch (_) { /* ignore invalid legacy cache */ }
  }

  const initial = normalizePayload(EMPTY_INITIAL_DATA);
  await persistPayload(initial);
  return initial;
}

async function persistPayload(payload) {
  const serialized = JSON.stringify(normalizePayload(payload));
  writeQueue = writeQueue.then(async () => {
    if (Capacitor.isNativePlatform()) {
      await writeFile(serialized);
    } else {
      window.localStorage.setItem(DATA_FILE, serialized);
    }
  });
  await writeQueue;
}

function nextId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function rebuildPeople(payload) {
  const peopleByName = new Map();
  payload.people.forEach(person => {
    if (person && person.name) {
      peopleByName.set(String(person.name).toLowerCase(), { ...person, records: [] });
    }
  });

  payload.books.forEach(book => {
    const name = String(book.person || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!peopleByName.has(key)) peopleByName.set(key, { name, phone: '', address: '', email: '', records: [] });
    const person = peopleByName.get(key);
    person.records.push({
      id: book.id,
      bookId: book.id,
      title: book.title,
      author: book.author,
      category: book.category,
      amount: book.amount,
      personStatus: book.personStatus || 'Holding',
      eventDate: book.eventDate,
      promiseReturnDate: book.promiseReturnDate || '',
      currentStatus: book.currentStatus,
      location: book.location
    });
  });

  payload.people = Array.from(peopleByName.values());
  return payload;
}

export async function getLocalPayload() {
  const payload = await loadPayload();
  return clone(rebuildPeople(payload));
}

export async function mutateLocal(method, args = []) {
  const payload = await loadPayload();
  const value = args[0];

  switch (method) {
    case 'getLibraryPayload':
      return clone(rebuildPeople(payload));

    case 'saveBook': {
      const book = { ...(value || {}) };
      const index = payload.books.findIndex(item => String(item.id) === String(book.id) && book.id !== '');
      if (index >= 0) payload.books[index] = { ...payload.books[index], ...book };
      else {
        book.id = book.id || nextId('book');
        payload.books.push(book);
      }
      break;
    }

    case 'addNewBook': {
      const book = { ...(value || {}), id: (value && value.id) || nextId('book') };
      payload.books.push(book);
      break;
    }

    case 'updateBookStatus': {
      const book = value || {};
      const index = payload.books.findIndex(item => String(item.id) === String(book.id));
      if (index >= 0) payload.books[index] = { ...payload.books[index], ...book };
      break;
    }

    case 'deleteBook': {
      const id = typeof value === 'object' ? value.id : value;
      payload.books = payload.books.filter(book => String(book.id) !== String(id));
      break;
    }

    case 'saveWishlistBook': {
      const item = { ...(value || {}) };
      const index = payload.wishlist.findIndex(record => String(record.id) === String(item.id) && item.id !== '');
      if (index >= 0) payload.wishlist[index] = { ...payload.wishlist[index], ...item };
      else {
        item.id = item.id || nextId('wish');
        payload.wishlist.push(item);
      }
      break;
    }

    case 'deleteWishlistBook': {
      const id = typeof value === 'object' ? value.id : value;
      payload.wishlist = payload.wishlist.filter(item => String(item.id) !== String(id));
      break;
    }

    case 'updatePerson':
    case 'addPerson': {
      const person = value || {};
      const oldName = String(person.oldName || '');
      const index = payload.people.findIndex(item =>
        String(item.name).toLowerCase() === String(oldName || person.name).toLowerCase()
      );
      const saved = { ...(index >= 0 ? payload.people[index] : {}), ...person, records: index >= 0 ? payload.people[index].records || [] : [] };
      delete saved.isNew;
      delete saved.oldName;
      if (index >= 0) payload.people[index] = saved;
      else payload.people.push(saved);
      if (oldName && oldName !== saved.name) {
        payload.books = payload.books.map(book => ({
          ...book,
          person: book.person === oldName ? saved.name : book.person,
          prevPerson: book.prevPerson === oldName ? saved.name : book.prevPerson
        }));
      }
      break;
    }

    case 'deletePerson': {
      const name = typeof value === 'object' ? value.name : value;
      payload.people = payload.people.filter(person => String(person.name) !== String(name));
      break;
    }

    case 'addAdminConfigItem': {
      const type = String(args[0] || '');
      const item = String(args[1] || '').trim();
      const configKey = ({
        Category: 'categories',
        Location: 'locations',
        Current_Status: 'currentStatuses',
        Current_Statuses: 'currentStatuses',
        Initial_Status: 'initialStatuses'
      })[type] || (type.toLowerCase().includes('categor') ? 'categories' : type.toLowerCase().includes('location') ? 'locations' : 'currentStatuses');
      if (item && !payload.config[configKey].includes(item)) payload.config[configKey].push(item);
      break;
    }

    case 'importAllSheetsBackupCsv': {
      const text = String(value || '');
      const rows = parseCsv(text);
      if (rows[0] && rows[0][0] === 'BWISE_FULL_BACKUP_V1' && rows[1] && rows[1][0] === 'payload_json') {
        const restored = normalizePayload(JSON.parse(rows[1][1] || '{}'));
        await persistPayload(restored);
        return clone(rebuildPeople(restored));
      }
      throw new Error('This CSV is not a B-wise full backup. Import a backup exported by this app.');
    }

    case 'exportAllSheetsBackupCsv': {
      const backup = clone(payload);
      delete backup.status;
      delete backup.offline;
      return [
        'BWISE_FULL_BACKUP_V1,1',
        `payload_json,"${JSON.stringify(backup).replace(/"/g, '""')}"`
      ].join('\r\n');
    }

    case 'exportBooksCsv':
      return recordsToCsv('Books', payload.books);
    case 'exportPersonsLedgerCsv':
      return recordsToCsv('People', payload.people);
    case 'exportLentSummaryCsv':
      return recordsToCsv('Lent', payload.books.filter(book => book.person || book.currentStatus === 'LENT'));

    default:
      throw new Error(`Unsupported local operation: ${method}`);
  }

  const saved = rebuildPeople(payload);
  await persistPayload(saved);
  return clone(saved);
}

function recordsToCsv(title, records) {
  const rows = [[title, 'Record JSON'], ...records.map(record => [title, JSON.stringify(record)])];
  return rows.map(row => row.map(cell => {
    const text = String(cell == null ? '' : cell);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\r\n');
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows;
}
