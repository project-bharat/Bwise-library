import React from 'react';
import BrandingFooter from './BrandingFooter';
import { formatDisplayDate, calculateDaysSince, getStatusBadgeStyle } from '../utils';

export default function IndividualPersonPage({ person, allBooks, onBack, onOpenBookJourney, onEditBook, onSendReminder, onDirectDial, onExportPdf, onCallDeveloper }) {
  const records = person.records || [];
  const holdingRecords = records.filter(r => String(r.personStatus || '').toUpperCase() === 'HOLDING');
  const holdingWorth = holdingRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalWorth = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  let oldestDaysText = '-';
  if (holdingRecords.length > 0) {
    const sortedHolding = [...holdingRecords].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    if (sortedHolding[0] && sortedHolding[0].eventDate) {
      oldestDaysText = calculateDaysSince(sortedHolding[0].eventDate);
    }
  }

  const getPersonBadge = (st) => {
    const u = String(st || '').toUpperCase();
    if (u === 'HOLDING') return 'bg-amber-100 text-amber-900 border-amber-300';
    if (u === 'RETURNED') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (u === 'GIFTED') return 'bg-purple-100 text-purple-900 border-purple-300';
    if (u === 'LOST') return 'bg-rose-100 text-rose-900 border-rose-300';
    return 'bg-stone-100 text-stone-800 border-stone-300';
  };

  const handleRowClick = (r) => {
    const isHolding = String(r.personStatus || '').toUpperCase() === 'HOLDING';
    const foundBook = (allBooks || []).find(b => String(b.id) === String(r.bookId));
    const editPayload = foundBook ? { ...foundBook, person: person.name, personStatus: r.personStatus } : {
      id: r.bookId,
      title: r.title,
      author: r.author,
      category: r.category,
      language: r.language,
      amount: r.amount,
      initialStatus: 'Purchased',
      currentStatus: isHolding ? 'LENT' : 'DONE',
      location: isHolding ? 'To Person' : 'At Home',
      person: person.name,
      personStatus: r.personStatus,
      eventDate: r.eventDate,
      promiseReturnDate: r.promiseReturnDate,
      notes: r.notes
    };
    onEditBook(editPayload);
  };

  return (
    <div id="individual-person-report" className="space-y-3 pb-6">
      {/* TOP BAR: Borderless Navigation */}
      <div className="no-print py-0.5 px-1 flex items-center justify-between">
        <button onClick={onBack} className="text-xs font-black uppercase tracking-wider text-forest flex items-center space-x-1.5 active:opacity-70 transition-opacity">
          <i className="fa-solid fa-arrow-left text-sm"></i><span>Back to Persons</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSendReminder(null, true)}
            className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs active:scale-90 shadow-sm"
            title="WhatsApp Reminder (All Holding Books)"
          >
            <i className="fa-brands fa-whatsapp text-sm"></i>
          </button>

          {person.phone && (
            <button
              onClick={onDirectDial}
              className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs active:scale-90 shadow-sm"
              title="Call Reader"
            >
              <i className="fa-solid fa-phone text-[11px]"></i>
            </button>
          )}

          <button
            onClick={onExportPdf}
            className="w-7 h-7 rounded-full bg-forest text-alabaster flex items-center justify-center text-xs active:scale-90 shadow-sm"
            title="Export Statement PDF"
          >
            <i className="fa-solid fa-share-nodes text-[11px]"></i>
          </button>
        </div>
      </div>

      {/* TOP SECTION: Unified 50/50 horizontal row */}
      <div className="bg-forest text-white p-2.5 rounded-xl shadow-sm flex items-center justify-between gap-2">
        <div className="w-1/2 pr-1 flex flex-col justify-center">
          <h1 className="text-sm font-black leading-tight truncate">{person.name}</h1>
          <p className="text-[10px] text-sand/90 font-medium truncate mt-0.5">{person.phone || 'No phone'}</p>
          <p className="text-[9px] text-sand/70 truncate">{person.address || 'No address'}</p>
        </div>

        <div className="w-1/2 bg-white/10 p-1.5 rounded-lg border border-white/15 grid grid-cols-2 divide-x divide-white/20 text-center flex-none">
          <div className="px-1 flex flex-col justify-center">
            <p className="text-[7.5px] uppercase font-black text-sand leading-none">Holding</p>
            <p className="text-[11px] font-black text-amber-300 mt-1 leading-none">{holdingRecords.length} <span className="text-[8px] font-bold text-sand">(₹{holdingWorth})</span></p>
            <p className="text-[7.5px] text-stone-300 mt-1 leading-none truncate">{oldestDaysText}</p>
          </div>
          <div className="px-1 flex flex-col justify-center">
            <p className="text-[7.5px] uppercase font-black text-sand leading-none">History</p>
            <p className="text-[11px] font-black text-white mt-1 leading-none">{records.length} <span className="text-[8px] font-bold text-sand">Books</span></p>
            <p className="text-[7.5px] text-sand/90 mt-1 leading-none truncate">₹{totalWorth}</p>
          </div>
        </div>
      </div>

      {/* PERSON BOOK HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden mb-3">
        <div className="px-3 py-2 bg-stone-100 border-b border-sand/40 flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-forest">Person Book History</h3>
          <span className="text-[9px] font-bold text-stone-500">Tap row to view journey</span>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-left text-[11px] table-fixed">
            <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
              <tr>
                <th className="px-2 py-2 w-[19%]">Date</th>
                <th className="px-2 py-2 w-[41%]">Book Title</th>
                <th className="px-1 py-2 text-center w-[14%]">Status</th>
                <th className="px-1.5 py-2 w-[15%]">Promise Date</th>
                <th className="px-2 py-2 text-right no-print w-[11%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
              {records.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-stone-400">No records found for this reader</td></tr>
              ) : (
                records.map(r => {
                  const isHolding = String(r.personStatus || '').toUpperCase() === 'HOLDING';
                  return (
                    <tr
                      key={r.recordId || r.bookId}
                      className="hover:bg-sand/15 transition-colors cursor-pointer active:bg-sand/25"
                      onClick={() => {
                        const foundBook = (allBooks || []).find(b => String(b.id) === String(r.bookId));
                        if (foundBook) {
                          onOpenBookJourney(foundBook);
                        } else {
                          onOpenBookJourney({
                            id: r.bookId,
                            title: r.title,
                            author: r.author,
                            category: r.category,
                            language: r.language,
                            amount: r.amount,
                            location: isHolding ? 'To Person' : 'At Home',
                            person: person.name,
                            currentStatus: isHolding ? 'LENT' : 'COLLECTED',
                            initialStatus: 'Purchased'
                          });
                        }
                      }}
                    >
                      <td className="px-2 py-2 text-[10px] text-stone-500">
                        <span className="font-semibold block leading-tight">{formatDisplayDate(r.eventDate)}</span>
                        {isHolding && r.eventDate && (
                          <span className="block text-[8px] text-amber-700 font-extrabold leading-none mt-0.5">{calculateDaysSince(r.eventDate)}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <p className="font-extrabold text-[11px] text-charcoal truncate" title={r.title}>{r.title}</p>
                        <p className="text-[9.5px] text-stone-500 font-semibold truncate mt-0.5">
                          {r.author || 'Unknown'} • <span className="text-forest font-bold">₹{r.amount || 0}</span>
                        </p>
                      </td>
                      <td className="px-1.5 py-2 text-center">
                        <span className={`text-[8.5px] uppercase tracking-wide leading-tight ${getStatusBadgeStyle(r.personStatus || (isHolding ? 'Holding' : 'Returned'))}`}>
                          {r.personStatus || (isHolding ? 'Holding' : 'Returned')}
                        </span>
                      </td>
                      <td className="px-1.5 py-2 text-[9.5px]">
                        {r.promiseReturnDate ? <span className="font-bold text-rose-700 block leading-tight">{formatDisplayDate(r.promiseReturnDate)}</span> : '-'}
                      </td>
                      <td className="px-2 py-2 text-right no-print" onClick={(e) => e.stopPropagation()}>
                        {isHolding ? (
                          <button
                            onClick={() => onSendReminder({ id: r.bookId, title: r.title, author: r.author, category: r.category }, false)}
                            className="w-6 h-6 rounded bg-[#25D366] text-white inline-flex items-center justify-center text-xs active:scale-90 shadow-xs"
                            title="Send WhatsApp Reminder"
                          >
                            <i className="fa-brands fa-whatsapp text-xs"></i>
                          </button>
                        ) : (
                          <span className="text-stone-300 text-xs pr-1">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <BrandingFooter onCallDeveloper={onCallDeveloper} />
    </div>
  );
}
