import React from 'react';
import brandIcon from '../assets/brand-icon.png?inline';

export default function SideDrawer({ isOpen, onClose, onOpenPersonManage, onAddPerson, onAddCategory, onAddLocation, onAddStatus, onExportBackup, onRestoreClick, onSyncSettings, onCallDeveloper }) {
  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className={`absolute top-0 right-0 w-72 h-full bg-white shadow-2xl transition-transform duration-300 flex flex-col justify-between ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="overflow-y-auto hide-scrollbar">
          <div
            className="p-4 text-white flex justify-between items-start shadow-md border-b border-white/10"
            style={{ background: 'linear-gradient(to right, #033636 0%, #047372 45%, #0e4e4e 75%, #052626 100%)' }}
          >
            <div className="flex items-center space-x-2.5">
              <img src={brandIcon} alt="" className="w-10 h-10 rounded-xl shadow-md border border-white/20" />
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-sand">Library manager</p>
                <h2 className="text-lg font-black tracking-tight mt-0.5">B-wise Library</h2>
              </div>
            </div>
            <button onClick={onClose} className="text-sand/80 hover:text-white p-1 rounded transition-colors" title="Close Menu (Esc)">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
          <div className="p-4 space-y-4 text-xs font-bold text-charcoal">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">Reader Directory</p>
              <button onClick={onOpenPersonManage} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-users text-forest w-5"></i> <span>Manage Readers</span>
              </button>
              <button onClick={onAddPerson} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-user-plus text-forest w-5"></i> <span>Add New Reader</span>
              </button>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">Configuration</p>
              <button onClick={onAddCategory} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-tags text-ochre w-5"></i> <span>Add Genre</span>
              </button>
              <button onClick={onAddLocation} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-location-dot text-ochre w-5"></i> <span>Add Location</span>
              </button>
              <button onClick={onAddStatus} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-list-check text-ochre w-5"></i> <span>Add Status</span>
              </button>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">System Backup</p>
              <button onClick={onExportBackup} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 text-forest flex items-center space-x-2">
                <i className="fa-brands fa-google-drive w-5"></i> <span>Backup to Drive / Export CSV</span>
              </button>
              <button onClick={onRestoreClick} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 text-rose-700 flex items-center space-x-2">
                <i className="fa-solid fa-cloud-arrow-up w-5"></i> <span>Restore Full Backup (CSV)</span>
              </button>
            </div>
            <div>
              <p className="px-1 text-[9px] leading-relaxed font-medium text-stone-500">Your library is saved on this phone. Choose Google Drive in the Android share menu to keep a cloud copy.</p>
            </div>
          </div>
        </div>
        <div className="p-3.5 border-t border-white/10 text-center select-none flex flex-col items-center justify-center bg-gradient-to-r from-[#033636] via-[#047372] to-[#052626]">
          <img src="/horizontal-logo.png" alt="B-wise Library" className="w-36 max-w-full h-auto max-h-10 object-contain mb-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <p className="text-[8px] font-black text-white/75 tracking-widest mb-1.5 uppercase">DEVELOPED BY - BHARAT RASVE © 2026</p>
          <div className="flex items-center space-x-2">
            <button onClick={onCallDeveloper} className="w-6 h-6 rounded-full bg-white text-forest hover:bg-ochre flex items-center justify-center text-[10px] active:scale-95 transition-colors shadow-xs" title="Call Developer">
              <i className="fa-solid fa-phone"></i>
            </button>
            <button onClick={() => window.open('https://wa.me/917218838122', '_blank')} className="w-6 h-6 rounded-full bg-forest text-alabaster hover:bg-ochre flex items-center justify-center text-[11px] active:scale-95 transition-colors shadow-xs" title="WhatsApp Developer">
              <i className="fa-brands fa-whatsapp"></i>
            </button>
            <a href="https://www.linkedin.com/in/bharatrasve" target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-forest text-alabaster hover:bg-ochre flex items-center justify-center text-[10px] active:scale-95 transition-colors shadow-xs" title="LinkedIn">
              <i className="fa-brands fa-linkedin-in"></i>
            </a>
            <a href="https://github.com/bharombhar" target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-forest text-alabaster hover:bg-ochre flex items-center justify-center text-[10px] active:scale-95 transition-colors shadow-xs" title="GitHub">
              <i className="fa-brands fa-github"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
