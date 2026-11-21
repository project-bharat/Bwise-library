import React from 'react';
import SupportDeveloper from './SupportDeveloper';
import { useTranslation } from '../i18n/useTranslation';

export default function BrandingFooter({ onCallDeveloper }) {
  const { t } = useTranslation();
  return (
    <footer className="mt-8 pt-4 pb-3 px-3 text-center select-none flex flex-col items-center justify-center bg-transparent">
      <div className="mb-2"><SupportDeveloper /></div>      <img src="/horizontal-colored-logo.png" alt={t('legacy.B-wise Library')} className="w-40 max-w-full h-auto max-h-12 object-contain mb-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      <p className="text-[9px] font-black text-stone-500 tracking-widest mb-2 uppercase">DEVELOPED BY - BHARAT RASVE © 2026</p>
      <div className="flex items-center space-x-2.5">
        <button onClick={onCallDeveloper} className="w-8 h-8 flex items-center justify-center text-base text-[#4C7774] hover:text-forest active:scale-95 transition-colors" title={t('legacy.Call Developer')}>
          <i className="fa-solid fa-phone"></i>
        </button>
        <button onClick={() => window.open('https://wa.me/917218838122', '_blank')} className="w-8 h-8 flex items-center justify-center text-base text-[#4C7774] hover:text-forest active:scale-95 transition-colors" title={t('legacy.WhatsApp Developer')}>
          <i className="fa-brands fa-whatsapp"></i>
        </button>
        <a href="https://www.linkedin.com/in/bharatrasve" target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center text-base text-[#4C7774] hover:text-forest active:scale-95 transition-colors" title={t('legacy.LinkedIn')}>
          <i className="fa-brands fa-linkedin-in"></i>
        </a>
        <a href="https://github.com/bharombhar" target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center text-base text-[#4C7774] hover:text-forest active:scale-95 transition-colors" title={t('legacy.GitHub')}>
          <i className="fa-brands fa-github"></i>
        </a>
      </div>
    </footer>
  );
}
