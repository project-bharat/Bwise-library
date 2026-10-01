import React, { useState, useEffect } from 'react';
import { formatDisplayDate } from '../../utils';

// DIALOG 2: EDIT STATUS & CUSTODY ONLY (Metadata Locked Read-Only)
export default function StatusUpdateModal({ book, people, onAddReader, onClose, onSuccess }) {
  const isLentInitially = String(book.location || '') === 'To Person' || Boolean(book.person && book.person.trim() !== '');
  const [location, setLocation] = useState(isLentInitially ? 'To Person' : (book.location || 'At Home'));
  const [person, setPerson] = useState(book.person || '');
  const [readingStatus, setReadingStatus] = useState(book.readingStatus || 'UNREAD');

  const computeCustody = () => {
    if (location === 'To Person') {
      return book.currentStatus === 'GIFTED OUT' ? 'GIFTED OUT' : 'LENT';
    }
    return ['LOST', 'DAMAGED', 'COLLECTED'].includes(book.currentStatus) ? book.currentStatus : 'COLLECTED';
  };

  const [currentStatus, setCurrentStatus] = useState(computeCustody());
  const [personStatus, setPersonStatus] = useState(book.personStatus || (isLentInitially ? 'Holding' : 'Returned'));
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [promiseReturnDate, setPromiseReturnDate] = useState(book.promiseReturnDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLocationChange = (newLoc) => {
    setLocation(newLoc);
    if (newLoc === 'To Person') {
      setCurrentStatus('LENT');
      setPersonStatus('Holding');
    } else {
      setCurrentStatus('COLLECTED');
      setPersonStatus('Returned');
      setPerson('');
    }
  };

  const handlePersonStatusChange = (newPStatus) => {
    setPersonStatus(newPStatus);
    if (newPStatus === 'Returned') {
      const targetLoc = window.confirm("Return book to library shelf: Click OK for 'At Home', or Cancel for 'At Office'") ? 'At Home' : 'At Office';
      setLocation(targetLoc);
      setCurrentStatus('COLLECTED');
    } else if (newPStatus === 'Holding' || newPStatus === 'Gifted') {
      setLocation('To Person');
      setCurrentStatus(newPStatus === 'Gifted' ? 'GIFTED OUT' : 'LENT');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (location === 'To Person' && !person && personStatus === 'Holding') {
      return alert('Please select a borrower.');
    }

    setIsSubmitting(true);
    const todayStr = new Date().toISOString().split('T')[0];
    const payload = {
      ...book,
      readingStatus,
      currentStatus,
      personStatus,
      location,
      person: (location === 'To Person' && personStatus !== 'Returned') ? person : '',
      prevPerson: book.person || person,
      eventDate: todayStr,
      promiseReturnDate: (currentStatus === 'LENT' && personStatus === 'Holding') ? promiseReturnDate : ''
    };

    if (window.google && google.script && google.script.run) {
      google.script.run.withSuccessHandler(onSuccess).withFailureHandler(() => setIsSubmitting(false)).saveBook(payload);
    } else {
      setTimeout(() => onSuccess(null), 300);
    }
  };

  const isToPerson = location === 'To Person';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5">
      <div className="bg-white w-full max-w-sm rounded-xl p-3.5 shadow-2xl border border-sand/40 overflow-hidden">
        <div className="flex justify-between items-center border-b border-sand/40 pb-1.5 mb-2">
          <h2 className="text-xs font-black uppercase text-forest tracking-wide">Update Status & Journey</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1" title="Close (Esc)"><i className="fa-solid fa-xmark text-sm"></i></button>
        </div>

        {/* Read-Only Book Identity Card (Title, Author, In-Date, Price Not Editable Here) */}
        <div className="bg-forest text-white p-2.5 rounded-lg mb-2.5">
          <p className="text-[10px] text-sand/80 font-bold uppercase tracking-wider">{book.category} • {book.language}</p>
          <h3 className="font-extrabold text-xs text-white truncate leading-tight mt-0.5">{book.title}</h3>
          <p className="text-[9.5px] text-sand/90 mt-0.5">By {book.author || 'Unknown'} • ₹{book.amount || 0} • In: {formatDisplayDate(book.bookInDate)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 text-xs">
          {/* READING STAGE & CURRENT CUSTODY */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Reading Stage</label>
              <select
                value={readingStatus}
                onChange={e => setReadingStatus(e.target.value)}
                className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 font-bold text-xs text-forest"
              >
                <option value="WISHLISTED">WISHLISTED (Want to Read)</option>
                <option value="UNREAD">UNREAD</option>
                <option value="READING">READING</option>
                <option value="FINISHED">FINISHED</option>
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Current Status</label>
              <select
                value={currentStatus}
                onChange={e => setCurrentStatus(e.target.value)}
                className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 font-bold text-xs text-forest"
              >
                {isToPerson ? (
                  <>
                    <option value="LENT">LENT (Out)</option>
                    <option value="GIFTED OUT">GIFTED OUT</option>
                  </>
                ) : (
                  <>
                    <option value="My Collection">My Collection</option>
                    <option value="COLLECTED">COLLECTED (In Library)</option>
                    <option value="LOST">LOST</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* LOCATION & BORROWER */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-black uppercase text-stone-500">Location</label>
              <select
                value={location}
                onChange={e => handleLocationChange(e.target.value)}
                className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 font-bold text-xs text-forest"
              >
                <option value="At Home">At Home</option>
                <option value="At Office">At Office</option>
                <option value="To Person">To Person</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between gap-1"><label className="text-[8px] font-black uppercase text-stone-500">Borrower Person</label><button type="button" onClick={onAddReader} className="text-[8px] font-black text-forest bg-sand/40 rounded px-1.5 py-0.5 whitespace-nowrap"><i className="fa-solid fa-plus mr-1"></i>Add Reader</button></div>
              <select
                value={person || book.person || ''}
                onChange={e => {
                  setPerson(e.target.value);
                  if (e.target.value) {
                    setLocation('To Person');
                    setCurrentStatus('LENT');
                    setPersonStatus('Holding');
                  }
                }}
                className="w-full bg-alabaster border border-sand/60 rounded px-2 py-1 font-bold text-xs text-forest"
              >
                <option value="">-- None / Select Reader --</option>
                {(people || []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* PERSON STATUS: Allows marking a holding book as RETURNED */}
          {(isToPerson || person || book.person) && (
            <div className="p-1.5 bg-sand/20 rounded border border-sand/40 flex items-center justify-between">
              <label className="text-[8px] font-black uppercase text-forest">Person Status:</label>
              <select
                value={personStatus}
                onChange={e => handlePersonStatusChange(e.target.value)}
                className="bg-white border border-sand/60 rounded px-2 py-0.5 text-xs font-black text-forest"
              >
                <option value="Holding">Holding</option>
                <option value="Returned">Returned (Return to Shelf)</option>
                <option value="Gifted">Gifted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          )}

          {/* DATES */}
          {isToPerson && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-ochre/10 rounded border border-ochre/30">
              <div>
                <label className="text-[8px] font-bold text-stone-600">Event / Lent Date</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full bg-white border border-sand/60 rounded p-1 text-[11px]" />
              </div>
              <div>
                <label className="text-[8px] font-bold text-stone-600">Promise Return</label>
                <input type="date" value={promiseReturnDate} onChange={e => setPromiseReturnDate(e.target.value)} className="w-full bg-white border border-sand/60 rounded p-1 text-[11px]" />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-2">
            <button type="button" onClick={onClose} className="w-1/3 py-2 bg-stone-100 text-stone-700 font-bold rounded text-xs uppercase active:scale-95">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="w-2/3 py-2 bg-forest text-alabaster font-black rounded text-xs uppercase tracking-wider active:scale-95 shadow">
              {isSubmitting ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
