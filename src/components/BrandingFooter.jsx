import React from 'react';
import brandIcon from '../assets/brand-icon.png?inline';

export default function BrandingFooter({ onCallDeveloper }) {
  return (
    <footer className="mt-8 pt-3 pb-2 text-center select-none border-t border-sand/40 flex flex-col items-center justify-center">
      <img src={brandIcon} alt="B-wise Library" className="w-9 h-9 rounded-xl mb-1.5 shadow-sm" />
      <p className="text-[9px] font-black text-stone-500 tracking-widest mb-2 uppercase">DEVELOPED BY - BHARAT RASVE © 2026</p>
      <div className="flex items-center space-x-2.5">
        <button onClick={onCallDeveloper} className="w-7 h-7 rounded-full bg-forest text-alabaster flex items-center justify-center text-xs active:scale-95 shadow-xs" title="Call Developer">
          <i className="fa-solid fa-phone"></i>
        </button>
        <button onClick={() => window.open('https://wa.me/917218838122', '_blank')} className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs active:scale-95 shadow-xs" title="WhatsApp Developer">
          <i className="fa-brands fa-whatsapp"></i>
        </button>
        <a href="https://www.linkedin.com/in/bharatrasve" target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[#0A66C2] text-white flex items-center justify-center text-xs active:scale-95 shadow-xs" title="LinkedIn">
          <i className="fa-brands fa-linkedin-in"></i>
        </a>
        <a href="https://github.com/bharombhar" target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs active:scale-95 shadow-xs" title="GitHub">
          <i className="fa-brands fa-github"></i>
        </a>
      </div>
    </footer>
  );
}
