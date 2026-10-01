import React, { useState } from 'react';
import { getDeviceContacts } from '../../native/contacts';

export default function PersonFormModal({ isNew, initial, onClose, onSuccess }) {
  const [name, setName] = useState(initial.name || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [address, setAddress] = useState(initial.address || '');
  const [email, setEmail] = useState(initial.email || '');
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleChooseContact = async () => {
    setLoadingContacts(true);
    setContactError('');
    try {
      const deviceContacts = await getDeviceContacts();
      setContacts(deviceContacts);
      setShowContacts(true);
      if (!deviceContacts.length) setContactError('No contacts with names were found on this device.');
    } catch (error) {
      setContactError(error?.message || 'Unable to read device contacts.');
    } finally {
      setLoadingContacts(false);
    }
  };

  const chooseContact = (contact) => {
    setName(contact.name || '');
    setPhone(contact.phone || '');
    setEmail(contact.email || '');
    setAddress(contact.address || '');
    setShowContacts(false);
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.name} ${contact.phone} ${contact.email}`.toLowerCase().includes(contactSearch.toLowerCase().trim())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const p = { isNew, oldName: initial.name || '', name: name.trim(), phone, address, email };
    if (window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(() => setSaving(false)).updatePerson(p);
    } else {
      setTimeout(() => onSuccess(null), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl border border-sand/40">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h2 className="text-xs font-black uppercase text-forest">{isNew ? 'Add Reader Profile' : 'Edit Reader Profile'}</h2>
          <button onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <button type="button" onClick={handleChooseContact} disabled={loadingContacts} className="w-full py-2 rounded-lg border border-ochre/40 bg-ochre/5 text-forest font-bold flex items-center justify-center gap-2">
            <i className="fa-solid fa-address-book"></i>{loadingContacts ? 'Loading device contacts…' : 'Choose from device contacts'}
          </button>
          {contactError && <p role="status" className="text-[10px] text-rose-700">{contactError}</p>}
          {showContacts && (
            <div className="rounded-lg border border-sand/60 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-black text-forest">Device contacts ({filteredContacts.length})</p>
                <button type="button" onClick={() => setShowContacts(false)} className="px-2 py-1 text-stone-500">Close</button>
              </div>
              <input type="search" value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search name or phone" className="w-full bg-alabaster border rounded p-2" />
              <div className="max-h-40 overflow-y-auto divide-y divide-sand/30">
                {filteredContacts.slice(0, 100).map((contact, index) => (
                  <button type="button" key={`${contact.name}-${contact.phone}-${index}`} onClick={() => chooseContact(contact)} className="w-full text-left py-2 px-1 hover:bg-alabaster">
                    <span className="block font-bold text-forest">{contact.name}</span>
                    <span className="block text-[10px] text-stone-500">{contact.phone || contact.email || 'No phone number'}</span>
                  </button>
                ))}
                {!filteredContacts.length && <p className="py-3 text-center text-stone-500">No matching contacts.</p>}
              </div>
            </div>
          )}
          <div><label className="text-[9px] font-black uppercase text-stone-500">Name *</label><input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-alabaster border rounded p-2" /></div>
          <div><label className="text-[9px] font-black uppercase text-stone-500">Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-alabaster border rounded p-2" /></div>
          <div><label className="text-[9px] font-black uppercase text-stone-500">Address</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-alabaster border rounded p-2" /></div>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95">
            {saving ? 'Saving...' : 'Save Reader'}
          </button>
        </form>
      </div>
    </div>
  );
}
