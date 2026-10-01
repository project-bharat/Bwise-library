import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Contacts } from '@capacitor-community/contacts';

const CONTACTS_PERMISSION_ASKED = 'bwise_contacts_permission_asked_v1';
const NOTIFICATIONS_PERMISSION_ASKED = 'bwise_notifications_permission_asked_v1';

export async function requestInitialDevicePermissions() {
  if (!Capacitor.isNativePlatform()) return;
  const [contactsAsked, notificationsAsked] = await Promise.all([
    Preferences.get({ key: CONTACTS_PERMISSION_ASKED }),
    Preferences.get({ key: NOTIFICATIONS_PERMISSION_ASKED })
  ]);

  if (!contactsAsked.value) {
    try { await Contacts.requestPermissions(); } catch (error) {
      console.warn('[permissions] Contacts permission was not granted', error);
    } finally {
      await Preferences.set({ key: CONTACTS_PERMISSION_ASKED, value: 'true' });
    }
  }

  if (!notificationsAsked.value) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
    } catch (error) {
      console.warn('[permissions] Notification permission was not granted', error);
    } finally {
      await Preferences.set({ key: NOTIFICATIONS_PERMISSION_ASKED, value: 'true' });
    }
  }
}

export async function getDeviceContacts() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Device contacts are available in the Android app.');
  }
  const permission = await Contacts.requestPermissions();
  if (permission?.contacts === 'denied') {
    throw new Error('Contacts permission is denied. Enable it in Android Settings to select a reader.');
  }

  const result = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
      emails: true,
      postalAddresses: true
    }
  });

  return (result?.contacts || []).map((contact) => {
    const name = contact.name?.display || contact.displayName || [
      contact.name?.given,
      contact.name?.middle,
      contact.name?.family
    ].filter(Boolean).join(' ');
    const phone = (contact.phones || []).find(item => item.number)?.number || '';
    const email = (contact.emails || []).find(item => item.address)?.address || '';
    const address = (contact.postalAddresses || []).find(item => item.street || item.city);
    const addressText = address
      ? [address.street, address.city, address.region, address.postcode, address.country].filter(Boolean).join(', ')
      : '';
    return { name: String(name || '').trim(), phone: String(phone || ''), email: String(email || ''), address: addressText };
  }).filter(contact => contact.name).sort((a, b) => a.name.localeCompare(b.name));
}
