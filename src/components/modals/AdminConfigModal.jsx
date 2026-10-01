import React, { useState } from 'react';

export default function AdminConfigModal({ type, onClose, onSuccess }) {
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    setSaving(true);
    if (window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(() => setSaving(false)).addAdminConfigItem(type, val.trim());
    } else {
      setTimeout(() => onSuccess(null), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl border border-sand/40">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h2 className="text-xs font-black uppercase text-forest">Add {type.replace('_',' ')}</h2>
          <button onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div><label className="text-[9px] font-black uppercase text-stone-500">Value *</label><input type="text" required value={val} onChange={e => setVal(e.target.value)} className="w-full bg-alabaster border rounded p-2 focus:outline-none" /></div>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95">
            {saving ? 'Saving...' : 'Add Config'}
          </button>
        </form>
      </div>
    </div>
  );
}
