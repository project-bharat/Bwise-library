import React, { useState, useEffect } from 'react';

// DIALOG 1: EDIT BOOK DETAILS (With Location Dropdown, Default Current_Status='My Collection')
export default function BookDetailsModal({ isNew, initial, config, onClose, onSuccess }) {
  const [title, setTitle] = useState(initial.title || '');
  const [author, setAuthor] = useState(initial.author || '');
  const [category, setCategory] = useState(initial.category || (config.categories && config.categories[0]) || 'Literature');
  const [language, setLanguage] = useState(initial.language || 'English');
  const [amount, setAmount] = useState(initial.amount || '');
  const [initialStatus, setInitialStatus] = useState(initial.initialStatus || 'Purchased');
  const [location, setLocation] = useState(initial.location || 'At Home');
  const [bookInDate, setBookInDate] = useState(initial.bookInDate || new Date().toISOString().split('T')[0]);
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
      ...initial,
      id: isNew ? '' : initial.id,
      bookInDate: bookInDate,
      title: title.trim(),
      author: author.trim() || 'Unknown',
      category,
      language,
      amount: parseFloat(amount) || 0,
      initialStatus,
      location: location,
      notes: notes.trim(),
      currentStatus: isNew ? 'My Collection' : (initial.currentStatus || 'My Collection'),
      readingStatus: isNew ? 'UNREAD' : (initial.readingStatus || 'UNREAD'),
      person: initial.person || '',
      eventDate: initial.eventDate || bookInDate,
      promiseReturnDate: initial.promiseReturnDate || ''
    };
    if (window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(() => setIsSubmitting(false)).saveBook(payload);
    } else {
      setTimeout(() => onSuccess(null), 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5">
      <div className="bg-white w-full max-w-sm rounded-xl p-3.5 shadow-2xl border border-sand/40 overflow-hidden">
        <div className="flex justify-between items-center border-b border-sand/40 pb-1.5 mb-2.5">
          <h2 className="text-xs font-black uppercase text-forest tracking-wide">
            {isNew ? 'New Book Entry' : 'Edit Book Details'}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1" title="Close (Esc)"><i className="fa-solid fa-xmark text-sm"></i></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 text-xs">
          <div>
            <label className="text-[8px] font-black uppercase text-stone-500">Book Title *</label>
            <input type="text" required autoFocus value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1.5 font-bold text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[8px] font-black uppercase text-stone-500">Author</label><input type="text" value={author} onChange={e => setAuthor(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs" /></div>
            <div><label className="text-[8px] font-black uppercase text-stone-500">Amount (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs" /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs">
                {((config && config.categories) || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs">
                <option>Marathi</option><option>Hindi</option><option>English</option><option>Sanskrit</option><option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Initial Status</label>
              <select value={initialStatus} onChange={e => setInitialStatus(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs">
                {((config && config.initialStatuses) || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Location</label>
              <select value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs font-bold text-forest">
                {((config && config.locations) || ['At Home', 'At Office', 'To Person']).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[8px] font-black uppercase text-stone-500">Book In Date</label>
            <input type="date" value={bookInDate} onChange={e => setBookInDate(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 text-xs" />
          </div>

          <div>
            <label className="text-[8px] font-black uppercase text-stone-500">Notes</label>
            <input type="text" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-alabaster border border-sand/60 rounded px-2.5 py-1 text-xs" />
          </div>

          <div className="pt-2 flex items-center space-x-2">
            <button type="button" onClick={onClose} className="w-1/3 py-2 bg-stone-100 text-stone-700 font-bold rounded text-xs uppercase active:scale-95">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="w-2/3 py-2 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95 shadow">
              {isSubmitting ? 'Saving...' : 'Save Book Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
