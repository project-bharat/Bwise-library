import React from 'react';

export default function BrandingFooter({ onCallDeveloper }) {
  return (
    <footer className="mt-8 pt-4 pb-3 px-3 text-center select-none border border-white/10 rounded-xl flex flex-col items-center justify-center bg-gradient-to-r from-[#033636] via-[#047372] to-[#052626]">
      <img src="/horizontal-logo.png" alt="B-wise Library" className="w-40 max-w-full h-auto max-h-12 object-contain mb-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <p className="text-[9px] font-black text-white/75 tracking-widest mb-2 uppercase">DEVELOPED BY - BHARAT RASVE © 2026</p>
      <div className="flex items-center space-x-2.5">
        <button onClick={onCallDeveloper} className="w-7 h-7 rounded-full bg-white text-forest flex items-center justify-center text-xs active:scale-95 shadow-xs" title="Call Developer">
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
