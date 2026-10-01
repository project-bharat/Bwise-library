import React, { useState } from 'react';

export default function PersonFormModal({ isNew, initial, onClose, onSuccess }) {
  const [name, setName] = useState(initial.name || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const [address, setAddress] = useState(initial.address || '');
  const [email, setEmail] = useState(initial.email || '');
  const [saving, setSaving] = useState(false);

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
