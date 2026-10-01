import React, { useState } from 'react';

export default function AdminConfigModal({ type, config, onClose, onSuccess }) {
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);
  const configKey = ({ Category: 'categories', Location: 'locations', Current_Status: 'currentStatuses', Current_Statuses: 'currentStatuses', Initial_Status: 'initialStatuses' })[type] || 'categories';
  const existingItems = (config && config[configKey]) || [];
  const handleDelete = (item) => {
    if (!window.confirm(`Remove ${item} from ${type.replace('_', ' ')} options?`)) return;
    google.script.run.withSuccessHandler(onSuccess).withFailureHandler(() => setSaving(false)).deleteAdminConfigItem(type, item);
  };

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
          <h2 className="text-xs font-black uppercase text-forest">{type === 'Category' ? 'Manage & Add Genre' : `Manage & Add ${type.replace('_',' ')}`}</h2>
          <button onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="mb-3 max-h-36 overflow-y-auto space-y-1">
          <p className="text-[9px] font-black uppercase tracking-wide text-stone-500">Existing options</p>
          {existingItems.length ? existingItems.map(item => <div key={item} className="flex items-center justify-between rounded bg-alabaster px-2 py-1.5"><span className="text-xs text-charcoal">{item}</span><button type="button" onClick={() => handleDelete(item)} className="text-rose-600 px-2" aria-label={`Remove ${item}`}><i className="fa-solid fa-trash"></i></button></div>) : <p className="text-[10px] text-stone-400">No options added yet.</p>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div><label className="text-[9px] font-black uppercase text-stone-500">Add new value *</label><input type="text" required value={val} onChange={e => setVal(e.target.value)} className="w-full bg-alabaster border rounded p-2 focus:outline-none" /></div>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95">
            {saving ? 'Saving...' : 'Add Config'}
          </button>
        </form>
      </div>
    </div>
  );
}
