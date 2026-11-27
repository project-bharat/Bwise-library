import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { getItemStrict } from './storage';
import { getLocalDateKey, EMPTY_INITIAL_DATA } from '../utils';
import { parseFullBackup, validateBackupPayload } from './backupFormat';
import { validateAnnualReadingGoal } from '../utils/progress';

const DATA_FILE = 'bwise-library-data.json';
const BACKUP_FILE = `${DATA_FILE}.bak`;
const TEMP_FILE = `${DATA_FILE}.tmp`;
const LEGACY_CACHE_KEY = 'bwise_payload_cache_v1';
let writeQueue = Promise.resolve();
let mutationQueue = Promise.resolve();

const clone = (value) => JSON.parse(JSON.stringify(value));

function normalizePayload(value) {
  const source = value && typeof value === 'object' ? value : {};
  const books = Array.isArray(source.books) ? source.books : [];
  const readingCompletions = Array.isArray(source.readingCompletions)
    ? source.readingCompletions.filter(item => item && typeof item === 'object' && item.bookId != null)
    : [];
  const knownCompletionIds = new Set(readingCompletions.map(item => String(item.bookId)));
  books.forEach(book => {
    const bookId = String(book?.id || '');
    if (bookId && isFinishedReading(book.readingStatus) && !knownCompletionIds.has(bookId)) {
      readingCompletions.push({ bookId, completedAt: '', legacy: true });
      knownCompletionIds.add(bookId);
    }
  });
  return {
    ...clone(EMPTY_INITIAL_DATA),
    ...source,
    schemaVersion: Math.max(2, Number(source.schemaVersion) || 1),
    status: 'success',
    offline: false,
    config: { ...clone(EMPTY_INITIAL_DATA.config), ...(source.config || {}) },
    books,
    people: Array.isArray(source.people) ? source.people : [],
    wishlist: Array.isArray(source.wishlist) ? source.wishlist : [],
    readingCompletions
  };
}

function isFinishedReading(status) {
  return ['FINISHED', 'DONE'].includes(String(status || '').toUpperCase());
}

function dataFilename(suffix) {
  return `${DATA_FILE}.${suffix}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

async function fileExists(path) {
  if (!Capacitor.isNativePlatform()) {
    return window.localStorage.getItem(path) !== null;
  }
  const { files } = await Filesystem.readdir({ path: '', directory: Directory.Data });
  return (files || []).some(file => file.name === path);
}

async function readStoredFile(path) {
  if (!Capacitor.isNativePlatform()) return window.localStorage.getItem(path);
  if (!(await fileExists(path))) return null;
  const result = await Filesystem.readFile({ path, directory: Directory.Data, encoding: 'utf8' });
  return result.data;
}

async function writeStoredFile(path, text) {
  if (!Capacitor.isNativePlatform()) {
    window.localStorage.setItem(path, text);
    return;
  }

  await Filesystem.writeFile({
    path,
    directory: Directory.Data,
    data: text,
    encoding: 'utf8',
    recursive: true
  });
}

async function removeStoredFile(path) {
  if (!Capacitor.isNativePlatform()) {
    window.localStorage.removeItem(path);
    return;
  }
  if (await fileExists(path)) await Filesystem.deleteFile({ path, directory: Directory.Data });
}

function validateStoredPayload(raw) {
  return normalizePayload(validateBackupPayload(JSON.parse(raw)));
}

async function quarantineStoredFile(raw) {
  await writeStoredFile(dataFilename('corrupt'), raw);
}

async function replacePayloadFile(serialized, rotateBackup) {
  await writeStoredFile(TEMP_FILE, serialized);
  const current = await readStoredFile(DATA_FILE);

  if (current !== null && rotateBackup) {
    try {
      validateStoredPayload(current);
      await writeStoredFile(BACKUP_FILE, current);
    } catch (_) {
      await quarantineStoredFile(current);
    }
  }

  try {
    await removeStoredFile(DATA_FILE);
    if (Capacitor.isNativePlatform()) {
      await Filesystem.rename({ from: TEMP_FILE, to: DATA_FILE, directory: Directory.Data });
    } else {
      const temporary = window.localStorage.getItem(TEMP_FILE);
      if (temporary === null) throw new Error('The temporary library snapshot is missing.');
      window.localStorage.setItem(DATA_FILE, temporary);
      window.localStorage.removeItem(TEMP_FILE);
    }
  } catch (error) {
    if (!(await fileExists(DATA_FILE))) {
      const backup = await readStoredFile(BACKUP_FILE);
      if (backup !== null) await writeStoredFile(DATA_FILE, backup);
    }
    throw error;
  }
}

async function persistPayload(payload, { rotateBackup = true } = {}) {
  const normalized = normalizePayload(payload);
  delete normalized.recoveryNotice;
  const serialized = JSON.stringify(normalized);
  writeQueue = writeQueue.catch(() => {}).then(() => replacePayloadFile(serialized, rotateBackup));
  await writeQueue;
}

async function loadPayload() {
  const raw = await readStoredFile(DATA_FILE);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      const payload = normalizePayload(validateBackupPayload(parsed));
      const needsMigration = Number(parsed.schemaVersion || 1) < 2 ||
        !Array.isArray(parsed.readingCompletions) ||
        payload.readingCompletions.length > parsed.readingCompletions.length;
      if (needsMigration) await persistPayload(payload);
      return payload;
    } catch (error) {
      await quarantineStoredFile(raw);
      const backup = await readStoredFile(BACKUP_FILE);
      if (backup === null) {
        throw new Error(`Library data is unreadable. A damaged copy was preserved; restore a backup to continue. ${error.message}`);
      }
      try {
        const recovered = validateStoredPayload(backup);
        await persistPayload(recovered, { rotateBackup: false });
        recovered.recoveryNotice = 'Recovered library from local backup';
        return recovered;
      } catch (backupError) {
        throw new Error(`Library data and its local backup are unreadable. Restore a verified backup to continue. ${backupError.message}`);
      }
    }
  }

  const backup = await readStoredFile(BACKUP_FILE);
  if (backup !== null) {
    try {
      const recovered = validateStoredPayload(backup);
      await persistPayload(recovered, { rotateBackup: false });
      recovered.recoveryNotice = 'Recovered library from local backup';
      return recovered;
    } catch (error) {
      throw new Error(`The local library backup is unreadable. Restore a verified backup to continue. ${error.message}`);
    }
  }

  const legacy = await getItemStrict(LEGACY_CACHE_KEY);
  if (legacy) {
    let migrated;
    try {
      migrated = validateStoredPayload(legacy);
    } catch (error) {
      throw new Error(`The previous local library cache is unreadable and was not replaced. ${error.message}`);
    }
    await persistPayload(migrated, { rotateBackup: false });
    return migrated;
  }

  const initial = normalizePayload(EMPTY_INITIAL_DATA);
  await persistPayload(initial, { rotateBackup: false });
  return initial;
}

function nextId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function recordFinishedBook(payload, book, completedAt) {
  const bookId = String(book.id || '');
  if (!bookId) return;
  const index = payload.readingCompletions.findIndex(item => String(item.bookId) === bookId);
  if (index >= 0) {
    const existing = payload.readingCompletions[index];
    if (completedAt && existing.completedAt !== completedAt) {
      payload.readingCompletions[index] = { ...existing, completedAt, legacy: false };
    }
    return;
  }
  payload.readingCompletions.push({ bookId, completedAt: completedAt || '' });
}

function rebuildPeople(payload) {
  const peopleByName = new Map();
  payload.people.forEach(person => {
    if (person && person.name) {
      peopleByName.set(String(person.name).toLowerCase(), { ...person, records: [] });
    }
  });

  payload.books.forEach(book => {
    const name = String(book.person || (String(book.personStatus || '').toLowerCase() === 'returned' ? book.prevPerson : '') || '').trim();
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
  const result = clone(rebuildPeople(payload));
  if (payload.recoveryNotice) result.recoveryNotice = payload.recoveryNotice;
  return result;
}

async function mutateLocalNow(method, args = []) {
  if (method === 'importFullBackup') {
    const restored = normalizePayload(parseFullBackup(String(args[0] || '')));
    rebuildPeople(restored);
    await persistPayload(restored);
    return clone(restored);
  }

  const payload = await loadPayload();
  const value = args[0];

  switch (method) {
    case 'getLibraryPayload':
      return clone(rebuildPeople(payload));

    case 'saveBook': {
      const book = { ...(value || {}) };
      const index = payload.books.findIndex(item => String(item.id) === String(book.id) && book.id !== '');
      if (index >= 0) {
        const previous = payload.books[index];
        const merged = { ...previous, ...book };
        const trackedFields = ['currentStatus', 'readingStatus', 'location', 'person', 'personStatus', 'promiseReturnDate'];
        const changed = trackedFields.some(field =>
          String(previous[field] || '') !== String(merged[field] || '')
        );
        const journey = Array.isArray(previous.journey) ? [...previous.journey] : [];
        if (isFinishedReading(merged.readingStatus) && !isFinishedReading(previous.readingStatus)) {
          recordFinishedBook(payload, merged, merged.finishedAt || getLocalDateKey());
        }
        if (changed) {
          const today = getLocalDateKey();
          const reading = merged.readingStatus ? ` · Reading: ${merged.readingStatus}` : '';
          const borrower = merged.person ? ` · Reader: ${merged.person}` : '';
          const due = merged.promiseReturnDate ? ` · Due: ${merged.promiseReturnDate}` : '';
          journey.push({
            journeyId: nextId('journey'),
            changeDate: merged.eventDate || today,
            newStatus: merged.currentStatus || previous.currentStatus || 'Status Updated',
            readingStatus: merged.readingStatus || '',
            location: merged.location || 'At Home',
            person: merged.person || '',
            personStatus: merged.personStatus || '',
            promiseReturnDate: merged.promiseReturnDate || '',
            notes: `Updated status to ${merged.currentStatus || 'current stage'}${reading}${borrower}${due}`
          });
        }
        payload.books[index] = { ...merged, journey };
      } else {
        book.id = book.id || nextId('book');
        if (isFinishedReading(book.readingStatus)) recordFinishedBook(payload, book, book.finishedAt || getLocalDateKey());
        payload.books.push({ ...book, journey: Array.isArray(book.journey) ? book.journey : [] });
      }
      break;
    }

    case 'addNewBook': {
      const book = { ...(value || {}), id: (value && value.id) || nextId('book') };
      if (isFinishedReading(book.readingStatus)) recordFinishedBook(payload, book, book.finishedAt || getLocalDateKey());
      payload.books.push(book);
      break;
    }

    case 'updateBookStatus': {
      const book = value || {};
      const index = payload.books.findIndex(item => String(item.id) === String(book.id));
      if (index >= 0) {
        const previous = payload.books[index];
        const merged = { ...previous, ...book };
        const trackedFields = ['currentStatus', 'readingStatus', 'location', 'person', 'personStatus', 'promiseReturnDate'];
        const changed = trackedFields.some(field =>
          String(previous[field] || '') !== String(merged[field] || '')
        );
        const journey = Array.isArray(previous.journey) ? [...previous.journey] : [];
        if (isFinishedReading(merged.readingStatus) && !isFinishedReading(previous.readingStatus)) {
          recordFinishedBook(payload, merged, merged.finishedAt || getLocalDateKey());
        }
        if (changed) {
          const today = getLocalDateKey();
          journey.push({
            journeyId: nextId('journey'),
            changeDate: merged.eventDate || today,
            newStatus: merged.currentStatus || previous.currentStatus || 'Status Updated',
            readingStatus: merged.readingStatus || '',
            location: merged.location || 'At Home',
            person: merged.person || '',
            personStatus: merged.personStatus || '',
            promiseReturnDate: merged.promiseReturnDate || '',
            notes: `Updated status to ${merged.currentStatus || 'current stage'}${merged.readingStatus ? ` · Reading: ${merged.readingStatus}` : ''}${merged.person ? ` · Reader: ${merged.person}` : ''}${merged.promiseReturnDate ? ` · Due: ${merged.promiseReturnDate}` : ''}`
          });
        }
        payload.books[index] = { ...merged, journey };
      }
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
      const rawStatus = String(item.status || '').toLowerCase().trim();
      const isInPossession = rawStatus.includes('in possession') && !rawStatus.includes('not in possession');

      if (isInPossession) {
        // Promote the wishlist row into inventory and remove the wishlist record in one local transaction.
        const titleKey = String(item.title || '').trim().toLowerCase();
        const existingIndex = payload.books.findIndex(book =>
          String(book.title || '').trim().toLowerCase() === titleKey
        );
        const today = getLocalDateKey();
        if (existingIndex >= 0) {
          const existing = payload.books[existingIndex];
          const wasWishlistOnly =
            String(existing.readingStatus || '').toUpperCase() === 'WISHLISTED' ||
            String(existing.currentStatus || '').toUpperCase() === 'WISHLISTED';
          if (wasWishlistOnly) {
            payload.books[existingIndex] = {
              ...existing,
              title: item.title || existing.title,
              author: item.author || existing.author || 'Unknown',
              category: item.category || existing.category || 'Literature',
              language: item.language || existing.language || 'English',
              amount: Number(item.amount) || 0,
              initialStatus: item.initialStatus || 'Purchased',
              currentStatus: item.currentStatus || 'COLLECTED',
              readingStatus: 'UNREAD',
              location: existing.location || (String(item.currentStatus || '').toUpperCase() === 'LENT' ? 'To Person' : String(item.currentStatus || '').toUpperCase() === 'LOST' ? 'Unknown' : 'At Home'),
              bookInDate: existing.bookInDate || today,
              eventDate: today,
              notes: item.notes || existing.notes || '',
              person: '',
              personStatus: 'Returned'
            };
          }
        } else {
          payload.books.push({
            id: nextId('book'),
            title: String(item.title || '').trim(),
            author: item.author || 'Unknown',
            category: item.category || 'Literature',
            language: item.language || 'English',
            amount: Number(item.amount) || 0,
            initialStatus: item.initialStatus || 'Purchased',
            currentStatus: item.currentStatus || 'COLLECTED',
            readingStatus: 'UNREAD',
            location: String(item.currentStatus || '').toUpperCase() === 'LENT' ? 'To Person' : String(item.currentStatus || '').toUpperCase() === 'LOST' ? 'Unknown' : 'At Home',
            bookInDate: today,
            eventDate: today,
            person: '',
            personStatus: 'Returned',
            promiseReturnDate: '',
            notes: item.notes || '',
            journey: []
          });
        }
        // Remove the source wishlist row. Existing inventory with the same title is not duplicated.
        payload.wishlist = payload.wishlist.filter(record => String(record.id) !== String(item.id));
      } else if (index >= 0) {
        payload.wishlist[index] = { ...payload.wishlist[index], ...item };
      } else {
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
      payload.books = payload.books.map(book => ({
        ...book,
        person: book.person === name ? '' : book.person,
        prevPerson: book.prevPerson === name ? '' : book.prevPerson
      }));
      break;
    }

    case 'deleteAdminConfigItem': {
      const type = String(args[0] || '');
      const item = String(args[1] || '').trim();
      const configKey = ({ Category: 'categories', Location: 'locations', Current_Status: 'currentStatuses', Current_Statuses: 'currentStatuses', Initial_Status: 'initialStatuses' })[type] || (type.toLowerCase().includes('categor') ? 'categories' : type.toLowerCase().includes('location') ? 'locations' : 'currentStatuses');
      payload.config[configKey] = (payload.config[configKey] || []).filter(value => String(value) !== item);
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

    case 'saveReadingGoal': {
      const goal = args[0] || {};
      const year = Number(goal.year);
      if (!Number.isInteger(year) || year < 2000 || year > 9999) {
        throw new Error('The reading-goal year is invalid.');
      }
      payload.config.readingGoal = { year, target: validateAnnualReadingGoal(goal.target) };
      break;
    }

    case 'exportFullBackup': {
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

// Serialize complete read-modify-write operations so rapid edits cannot overwrite each other.
export function mutateLocal(method, args = []) {
  const operation = () => mutateLocalNow(method, args);
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.catch(() => {});
  return result;
}
