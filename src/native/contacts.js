import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';

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
