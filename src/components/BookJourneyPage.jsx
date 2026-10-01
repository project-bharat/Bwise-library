import React from 'react';
import BrandingFooter from './BrandingFooter';
import { displayStatus, formatDisplayDate, getStatusBadgeStyle } from '../utils';

// STREAMLINED BOOK PROFILE & "BOOK JOURNEY" TIMELINE
export default function BookJourneyPage({ book, onBack, onEditDetails, onEditStatus, onNavigateToPerson, onExportPdf, onCallDeveloper, onCopyTitle, onOpenTag }) {
  const cSt = String(book.currentStatus || 'UNREAD').toUpperCase();
  const loc = String(book.location || 'At Home');
  const isAvailable = (cSt === 'UNREAD' || cSt === 'DONE') && (loc.toUpperCase() === 'AT HOME' || loc.toUpperCase() === 'AT OFFICE') && loc !== 'To Person';

  const rawJourney = (book.journey && book.journey.length > 0) ? [...book.journey] : [];

  const initialAcqLoc = (rawJourney.length > 0 && rawJourney[0].location) ? rawJourney[0].location : 'At Home';

  const initialMilestone = {
    journeyId: 'init_start',
    changeDate: book.bookInDate || '-',
    statusLabel: book.initialStatus || 'Purchased',
    location: initialAcqLoc,
    person: '',
    isInitial: true,
    notes: `Acquired via ${book.initialStatus || 'Purchased'}`
  };

  const subsequentMilestones = rawJourney.filter(m => m.newStatus !== book.initialStatus).map(m => ({
    journeyId: m.journeyId,
    changeDate: m.changeDate,
    statusLabel: m.newStatus,
    location: m.location || 'At Home',
    person: m.person,
    isInitial: false,
    notes: m.notes,
    promiseReturnDate: book.promiseReturnDate
  }));

  const timelineItems = [initialMilestone, ...subsequentMilestones];

  const getDaysSincePrev = (currDate, prevDate) => {
    if (!currDate || !prevDate || currDate === '-' || prevDate === '-') return '';
    const d1 = new Date(currDate);
    const d2 = new Date(prevDate);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';
    const diff = Math.floor(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? `(+${diff} days later)` : '';
  };

  return (
    <div id="book-journey-report" className="space-y-2.5 pb-4">
      <div className="no-print py-0.5 px-1 flex items-center justify-between">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-forest flex items-center space-x-1.5 active:opacity-70 transition-opacity">
          <i className="fa-solid fa-arrow-left text-sm"></i><span>Back to Collections</span>
        </button>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onEditDetails}
            className="px-2 py-1 bg-sand/30 hover:bg-sand/50 text-forest text-[10px] font-bold rounded-lg flex items-center space-x-1 active:scale-95 transition-all"
            title="Edit Book Details (Title, Author, Amount, Category)"
          >
            <i className="fa-solid fa-pencil text-[9px]"></i>
            <span>Edit Details</span>
          </button>
          <button
            onClick={onEditStatus}
            className="px-2 py-1 bg-forest text-alabaster text-[10px] font-bold rounded-lg flex items-center space-x-1 shadow-sm active:scale-95 transition-all"
            title="Update Status, Custody & Lending"
          >
            <i className="fa-solid fa-arrows-rotate text-[9px]"></i>
            <span>Update Status</span>
          </button>
          <button
            onClick={onExportPdf}
            className="w-7 h-7 rounded-full bg-forest text-alabaster flex items-center justify-center text-xs active:scale-90 shadow-sm"
            title="Export Journey PDF"
          >
            <i className="fa-solid fa-share-nodes text-[11px]"></i>
          </button>
        </div>
      </div>

      <div
        className="text-white p-3 rounded-2xl shadow-[0_4px_16px_rgba(4,115,114,0.35)] border border-white/15 space-y-2.5"
        style={{ background: 'linear-gradient(to right, #033636 0%, #047372 45%, #0e4e4e 75%, #052626 100%)' }}
      >
        <div className="flex justify-between items-start">
          <div className="max-w-[75%]">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <button
                onClick={(e) => onOpenTag && onOpenTag('category', book.category, e)}
                className="text-[9px] font-extrabold uppercase tracking-widest text-sand px-1.5 py-0.5 rounded-lg bg-white/10 border border-white/15 hover:bg-white/20 hover:text-white transition-colors"
                title={`View all books in ${book.category}`}
              >
                {book.category}
              </button>
              <span className="text-[9px] font-medium text-sand/80">• {book.language}</span>
              <span className="text-[9px] font-bold text-sand/90">• ₹{book.amount || 0}</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <button
                onClick={(e) => onCopyTitle(book.title, e)}
                className="text-sand/80 hover:text-white p-0.5 active:scale-90 flex-none"
                title="Copy Title"
              >
                <i className="fa-regular fa-copy text-xs"></i>
              </button>
              <h1 className="text-base font-black leading-tight truncate">{book.title}</h1>
            </div>
            <p className="text-[11px] text-sand/90 font-medium">
              By <button
                   onClick={(e) => onOpenTag && onOpenTag('author', book.author, e)}
                   className="underline hover:text-white font-bold"
                   title={`View all books by ${book.author}`}
                 >
                   {book.author}
                 </button>
            </p>
          </div>
          {/* High-contrast light status pill with border */}
          <div className="text-right">
            <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-white text-forest border border-sand shadow-xs">
              {displayStatus(book.currentStatus)}
            </span>
          </div>
        </div>

        <div className={`p-1.5 px-2.5 rounded-lg flex items-center justify-between text-[11px] font-bold border backdrop-blur-xs ${
          isAvailable
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
        }`}>
          <div className="flex items-center space-x-1.5">
            <i className={`fa-solid ${isAvailable ? 'fa-circle-check text-emerald-400' : 'fa-handshake text-amber-400'}`}></i>
            <span>{isAvailable ? 'Available for Reader' : `${displayStatus(book.currentStatus)} (${book.location})`}</span>
          </div>
          {book.person && (
            <button
              onClick={() => onNavigateToPerson(book.person)}
              className="underline hover:text-white text-[10px] text-sand cursor-pointer font-extrabold"
              title="View Reader Complete Books History"
            >
              @{book.person}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-sand/50 shadow-sm p-3">
        <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-sand/30">
          <h2 className="text-xs font-black uppercase tracking-wider text-forest flex items-center space-x-1.5">
            <i className="fa-solid fa-timeline text-ochre"></i>
            <span>Book Journey</span>
          </h2>
        </div>

        <div className="relative border-l-2 border-sand/60 ml-3 space-y-3.5 py-0.5">
          {timelineItems.map((item, idx) => (
            <div key={item.journeyId || idx} className="relative pl-4">
              <div className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${item.isInitial ? 'bg-forest' : 'bg-ochre'}`}></div>

              <div className="bg-alabaster/70 p-2 rounded-lg border border-sand/40 hover:border-ochre/60 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-extrabold text-forest">{formatDisplayDate(item.changeDate)}</span>
                    {idx > 0 && (
                      <span className="text-[8px] font-bold text-amber-700">
                        {getDaysSincePrev(item.changeDate, timelineItems[idx - 1].changeDate)}
                      </span>
                    )}
                  </div>
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${getStatusBadgeStyle(item.statusLabel)}`}>
                    {displayStatus(item.statusLabel)}
                  </span>
                </div>

                <p className="text-[10px] font-bold text-charcoal mt-1">{item.notes}</p>

                <div className="flex items-center justify-between flex-wrap gap-1 mt-1 pt-1 border-t border-sand/20 text-[9px] text-stone-600 font-medium">
                  <span><i className="fa-solid fa-location-dot mr-1 text-ochre"></i>{item.location || 'At Home'}</span>

                  {item.person && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onNavigateToPerson(item.person)}
                        className="text-forest hover:text-ochre font-extrabold underline cursor-pointer"
                        title="Go to Reader Books History"
                      >
                        <i className="fa-solid fa-user mr-1"></i>@{item.person}
                      </button>
                      {item.promiseReturnDate && (
                        <span className="text-rose-700 font-bold">Due: {formatDisplayDate(item.promiseReturnDate)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BrandingFooter onCallDeveloper={onCallDeveloper} />
    </div>
  );
}
