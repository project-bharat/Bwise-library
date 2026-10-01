import React, { useState, useEffect } from 'react';

// Dedicated Bookstore Wishlist Modal: Displays Initial & Current Status ONLY when user chooses In Possession
export default function WishlistFormModal({ isNew, initial, config, onClose, onSuccess }) {
  const [title, setTitle] = useState(initial.title || '');
  const [author, setAuthor] = useState(initial.author || '');
  const [category, setCategory] = useState(initial.category || (config.categories && config.categories[0]) || 'Literature');
  const [language, setLanguage] = useState(initial.language || 'English');

  // Cleanly normalize initial status so "not in possession" never triggers possession inputs
  const rawInitStatus = String(initial.status || '').toLowerCase().trim();
  const isAlreadyInPossession = rawInitStatus.includes('in possession') && !rawInitStatus.includes('not in possession');
  const [status, setStatus] = useState(isAlreadyInPossession ? 'in possession' : 'not in possession');

  const [amount, setAmount] = useState(initial.amount || '');
  const [initialStatus, setInitialStatus] = useState('Purchased');
  const [currentStatus, setCurrentStatus] = useState('COLLECTED');
  const [notes, setNotes] = useState(initial.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Book title is required');
    setIsSubmitting(true);
    const payload = {
      id: isNew ? '' : initial.id,
      title: title.trim(),
      author: author.trim() || 'Unknown',
      category,
      language,
      amount: parseFloat(amount) || 0,
      status: status,
      initialStatus: initialStatus,
      currentStatus: currentStatus,
      readingStatus: 'WISHLISTED',
      notes: notes.trim()
    };
    if (window.google && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler((res) => onSuccess(res))
        .withFailureHandler((err) => {
          setIsSubmitting(false);
          alert('Error saving wishlist item: ' + err.message);
        })
        .saveWishlistBook(payload);
    } else {
      setTimeout(() => onSuccess(null), 300);
    }
  };

  // Strict check: only true when user actively selects "in possession"
  const isInPossession = status === 'in possession';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white w-full max-w-sm rounded-xl p-4 shadow-2xl border border-sand/40 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h2 className="text-xs font-black uppercase text-forest tracking-wide">
            {isNew ? '+ Add Bookstore Wishlist' : 'Edit Wishlist Item'}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
          <div>
            <label className="text-[9px] font-black uppercase text-stone-500">Book Title *</label>
            <input type="text" required autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Clean Code" className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1.5 font-bold text-xs" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-stone-500">Author</label>
            <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1.5 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black uppercase text-stone-500">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1.5 text-xs">
                {((config && config.categories) || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-stone-500">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1.5 text-xs">
                <option>English</option><option>Marathi</option><option>Hindi</option><option>Sanskrit</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black uppercase text-stone-500">Amount (₹)</label>
              <input type="number" placeholder="250" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1.5 text-xs font-bold" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-stone-500">Acquisition Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1.5 text-xs font-bold text-forest">
                <option value="not in possession">Not In Possession</option>
                <option value="in possession">In Possession (Add)</option>
              </select>
            </div>
          </div>

          {/* Show Initial Status and Current Status ONLY when user chooses In Possession */}
          {status === 'in possession' && (
            <div className="p-2.5 bg-emerald-50 rounded border border-emerald-300 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black uppercase text-emerald-900">Initial Status</label>
                  <select
                    value={initialStatus}
                    onChange={e => setInitialStatus(e.target.value)}
                    className="w-full bg-white border border-emerald-400 rounded px-1.5 py-1 text-[11px] font-bold text-charcoal outline-none"
                  >
                    {((config && config.initialStatuses) || ['Purchased', 'RECEIVED GIFT', 'Borrowed from library', 'Borrowed from friend']).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-black uppercase text-emerald-900">Current Status</label>
                  <select
                    value={currentStatus}
                    onChange={e => setCurrentStatus(e.target.value)}
                    className="w-full bg-white border border-emerald-400 rounded px-1.5 py-1 text-[11px] font-bold text-forest outline-none"
                  >
                    <option value="COLLECTED">COLLECTED</option>
                    <option value="LENT">LENT</option>
                    <option value="LOST">LOST</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black uppercase text-stone-500">Notes / Bookstore Target</label>
            <input type="text" placeholder="e.g. Check Pune Book Fair" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1.5 text-xs" />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button type="button" onClick={onClose} className="w-1/3 py-2 bg-stone-100 text-stone-700 font-bold rounded text-xs uppercase active:scale-95">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="w-2/3 py-2 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95 shadow">
              {isSubmitting ? 'Saving...' : (isNew ? 'Add Wishlist' : 'Update Wishlist')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
