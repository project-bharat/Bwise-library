import React, { useState } from 'react';
import { displayStatus, getStatusBadgeStyle } from '../utils';

// Home Table with 6 Initial Entries & On-Demand "Load More" (+6) Button
export default function SummaryTableCard({ id, title, badge, rows, onRowClick, onShare, onCopyTitle, onOpenTag }) {
  const [visibleCount, setVisibleCount] = useState(6);
  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  return (
    <div id={id} className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden mb-3.5 flex flex-col">
      <div className="px-3 py-1.5 bg-stone-100 border-b border-sand/40 flex justify-between items-center flex-none">
        <div className="flex items-center space-x-1.5">
          <h3 className="text-[10px] font-black text-forest uppercase tracking-wider leading-none">{title}</h3>
          <span className="text-[8px] font-bold text-stone-500">({rows.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[8px] font-extrabold text-ochre uppercase tracking-wider">{badge}</span>
          <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="hover:text-forest text-stone-500 p-0.5" title="Share Table as PDF">
            <i className="fa-solid fa-share-nodes text-[11px]"></i>
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left text-[11px] table-fixed">
          <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
            <tr>
              <th className="px-2.5 py-1.5 w-[52%]">Book Details</th>
              <th className="px-2 py-1.5 w-[28%]">Author</th>
              <th className="px-2 py-1.5 text-right w-[20%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/20 font-medium text-charcoal">
            {visibleRows.length === 0 ? (
              <tr><td colSpan="3" className="px-3 py-4 text-center text-[10px] text-stone-400 italic">No records</td></tr>
            ) : (
              visibleRows.map(b => (
                <tr
                  key={b.id}
                  tabIndex="0"
                  onClick={() => onRowClick(b)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onRowClick(b); }}
                  className="hover:bg-sand/15 transition-colors cursor-pointer active:bg-sand/25 focus:bg-sand/25 focus:outline-none"
                >
                  <td className="px-2.5 py-1.5">
                    <div className="flex items-center space-x-1 truncate">
                      <button
                        onClick={(e) => onCopyTitle(b.title, e)}
                        className="text-stone-400 hover:text-forest active:scale-90 p-0.5 flex-none"
                        title="Copy Title"
                      >
                        <i className="fa-regular fa-copy text-[9px]"></i>
                      </button>
                      <span className="font-extrabold text-[11px] text-charcoal truncate" title={b.title}>{b.title}</span>
                    </div>
                    <p className="text-[9px] text-stone-500 truncate flex items-center space-x-1">
                      <button
                        onClick={(e) => onOpenTag('category', b.category, e)}
                        className="text-forest font-bold hover:underline hover:text-ochre"
                        title={`Filter category: ${b.category}`}
                      >
                        {b.category || 'General'}
                      </button>
                      <span>•</span>
                      <span>{b.language || 'English'}</span>
                    </p>
                  </td>
                  <td className="px-2 py-1.5 text-[10px] text-stone-600 truncate font-semibold">
                    <button
                      onClick={(e) => onOpenTag('author', b.author, e)}
                      className="hover:underline hover:text-forest truncate max-w-full text-left"
                      title={`Filter author: ${b.author}`}
                    >
                      {b.author || 'Unknown'}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={`text-[8.5px] uppercase tracking-wide leading-tight ${getStatusBadgeStyle(b.currentStatus)}`}>
                      {displayStatus(b.currentStatus)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Minimal Load More Button with Light Transparent Box & Border */}
      {hasMore && (
        <div className="p-2 bg-stone-50/50 border-t border-sand/30 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 6)}
            className="text-[10px] font-bold text-forest hover:text-ochre bg-white/70 hover:bg-white border border-sand/60 py-1 px-3.5 rounded-full active:scale-95 transition-all shadow-xs"
          >
            Load More (+6) • {rows.length - visibleCount} remaining
          </button>
        </div>
      )}
    </div>
  );
}
