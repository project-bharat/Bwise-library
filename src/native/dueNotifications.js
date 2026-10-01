import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const ID_MIN = 1500000000;
const ID_RANGE = 400000000;
const ACTION_TYPE = 'BWISE_DUE_BOOK_ACTIONS';

function dateOnly(value) {
  if (!value) return null;
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = raw.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})$/);
  if (match) {
    const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(match[2].slice(0, 3).toLowerCase());
    if (month >= 0) return new Date(Number(match[3]), month, Number(match[1]));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function stableId(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ID_MIN + (Math.abs(hash >>> 0) % ID_RANGE);
}

function phoneFor(person, people) {
  const found = (people || []).find(item =>
    String(item.name || '').trim().toLowerCase() === String(person || '').trim().toLowerCase()
  );
  return String(found?.phone || '').replace(/\D/g, '');
}

function makeWhatsAppUrl(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  const international = digits.length === 10 ? `91${digits}` : digits;
  return international
    ? `https://wa.me/${international}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function registerDueNotificationActions() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [{
        id: ACTION_TYPE,
        actions: [
          { id: 'whatsapp', title: 'WhatsApp', foreground: true },
          { id: 'open', title: 'Open Library', foreground: true }
        ]
      }]
    });
  } catch (error) {
    console.warn('[notifications] Could not register notification actions', error);
  }

  await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const extra = event?.notification?.extra || {};
    if (event?.actionId === 'whatsapp' && extra.message) {
      window.location.href = makeWhatsAppUrl(extra.phone, extra.message);
    }
  });
}

export async function scheduleDueDateNotifications(payload) {
  if (!Capacitor.isNativePlatform()) return;
  const books = Array.isArray(payload?.books) ? payload.books : [];
  const people = Array.isArray(payload?.people) ? payload.people : [];
  const today = new Date();
  const todayKey = dayKey(today);
  const desired = [];

  books.forEach((book) => {
    const isHolding = String(book.currentStatus || '').toUpperCase() === 'LENT' &&
      String(book.personStatus || 'HOLDING').toUpperCase() === 'HOLDING' &&
      String(book.location || '').toLowerCase() === 'to person' &&
      Boolean(book.promiseReturnDate) && Boolean(book.person);
    if (!isHolding) return;

    const due = dateOnly(book.promiseReturnDate);
    if (!due || dayKey(due) < todayKey) return;
    const dueKey = dayKey(due);
    const person = String(book.person || '').trim();
    const phone = phoneFor(person, people);
    const message = `Hi ${person}, the book "${book.title || 'Book'}" borrowed from my library is due today (${dueKey}). Please return it when convenient. Thank you!`;
    const id = stableId(`${book.id || book.title}:${dueKey}`);
    const at = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9, 0, 0, 0);
    if (at.getTime() <= Date.now()) at.setTime(Date.now() + 15000);

    desired.push({
      id,
      title: `Book due: ${book.title || 'Library book'}`,
      body: `${person} • return date ${dueKey}`,
      schedule: { at },
      actionTypeId: ACTION_TYPE,
      extra: { phone, message, person, bookTitle: book.title || 'Library book', dueDate: dueKey }
    });
  });

  const pendingResult = await LocalNotifications.getPending();
  const pending = (pendingResult.notifications || []).filter(item => item.id >= ID_MIN && item.id < ID_MIN + ID_RANGE);
  const desiredIds = new Set(desired.map(item => item.id));
  const stale = pending.filter(item => !desiredIds.has(item.id));
  if (stale.length) await LocalNotifications.cancel({ notifications: stale.map(item => ({ id: item.id })) });

  const pendingById = new Map(pending.filter(item => desiredIds.has(item.id)).map(item => [item.id, item]));
  const toSchedule = [];
  for (const notification of desired) {
    const existing = pendingById.get(notification.id);
    if (existing) {
      const oldExtra = existing.extra || {};
      if (existing.title === notification.title &&
          existing.body === notification.body &&
          oldExtra.phone === notification.extra.phone &&
          oldExtra.message === notification.extra.message) continue;
      await LocalNotifications.cancel({ notifications: [{ id: notification.id }] });
    }

    if (notification.extra.dueDate === todayKey) {
      const sentKey = `bwise_due_notification_sent_${todayKey}_${notification.id}`;
      const sent = await Preferences.get({ key: sentKey });
      if (sent.value === 'true') continue;
      notification.extra.sentKey = sentKey;
    }
    toSchedule.push(notification);
  }

  if (toSchedule.length) {
    await LocalNotifications.schedule({ notifications: toSchedule });
    for (const notification of toSchedule) {
      if (notification.extra.sentKey) {
        await Preferences.set({ key: notification.extra.sentKey, value: 'true' });
      }
    }
  }
}
