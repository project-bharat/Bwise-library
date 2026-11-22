import React from 'react';
import SupportDeveloper from './SupportDeveloper';
import { useTranslation } from '../i18n/useTranslation';

export default function SideDrawer({ isOpen, onClose, onOpenPersonManage, onAddPerson, onAddCategory, onAddLocation, onAddStatus, profile, onReadingYear, onPremium, onCloudBackup, isPro, onExportBackup, onRestoreClick, onSyncSettings, onCallDeveloper, displayLanguage = 'en', onLanguageChange }) {
  const { t } = useTranslation();
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
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15">
                {profile.photo ? <img alt="" src={profile.photo} className="h-full w-full object-cover" /> : <i aria-hidden="true" className="fa-solid fa-user" />}
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-black">{profile.name || profile.account || t('year.profile')}</h2>
                <span className="rounded bg-white/15 px-2 text-xs">{isPro ? 'Premium' : t('year.free')}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-sand/80 hover:text-white p-1 rounded transition-colors" title={`${t('legacy.Close')} Menu (Esc)`}>
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
          <div className="p-4 space-y-4 text-xs font-bold text-charcoal"><label className="flex items-center gap-2 rounded-lg border bg-white px-3 text-forest">
              <i aria-hidden="true" className="fa-solid fa-language" />
              <select aria-label={t('legacy.App display language')} value={displayLanguage} onChange={e => onLanguageChange(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2">
                <option value="en">English</option><option value="mr">मराठी</option><option value="hi">हिन्दी</option>
              </select></label>
              <button onClick={onReadingYear} className="flex w-full items-center gap-2 p-2 text-forest"><i className="fa-solid fa-chart-column" />{t('year.title')}</button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">{t('legacy.Reader Directory')}</p>
              <button onClick={onOpenPersonManage} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-users text-forest w-5"></i> <span>{t('legacy.Manage & Add Readers')}</span>
              </button>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">{t('legacy.Configuration')}</p>
              <button onClick={onAddCategory} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-tags text-ochre w-5"></i> <span>{t('legacy.Manage & Add Genre')}</span>
              </button>
              <button onClick={onAddLocation} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-location-dot text-ochre w-5"></i> <span>{t('legacy.Add Location')}</span>
              </button>
              <button onClick={onAddStatus} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 flex items-center space-x-2">
                <i className="fa-solid fa-list-check text-ochre w-5"></i> <span>{t('legacy.Add Status')}</span>
              </button>
            </div>
            <button type="button" onClick={onPremium} className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-forest to-[#0A685F] p-3 text-left text-sm font-black text-white">
              <i aria-hidden="true" className="fa-solid fa-crown text-amber-200" />
              <span className="flex-1">{t('premium.title')}</span>
              <i aria-hidden="true" className="fa-solid fa-chevron-right text-xs" />
            </button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1 px-1">{t('legacy.Local & Cloud Backup')}</p>
              <button type="button" onClick={onCloudBackup} className="flex min-h-11 w-full items-center gap-2 rounded-lg p-2 text-left text-forest hover:bg-stone-100">
                <i aria-hidden="true" className="fa-solid fa-cloud-arrow-up w-5" />
                <span className="flex-1">{t('premium.cloud')}</span>
                {!isPro && <span className="rounded bg-forest px-1.5 py-0.5 text-[10px] text-white">PRO</span>}
              </button>
              <button onClick={onExportBackup} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 text-forest flex items-center space-x-2">
                <i className="fa-solid fa-file-csv w-5"></i> <span>{t('year.export')}</span>
              </button>
              <button onClick={onRestoreClick} className="w-full text-left p-2 rounded-lg hover:bg-stone-100 text-rose-700 flex items-center space-x-2">
                <i className="fa-solid fa-cloud-arrow-up w-5"></i> <span>{t('year.import')}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="p-3.5 border-t border-white/10 text-center select-none flex flex-col items-center justify-center bg-gradient-to-r from-[#033636] via-[#047372] to-[#052626]">
          <div className="mb-2"><SupportDeveloper compact /></div>          <img src="/horizontal-logo.png" alt={t('legacy.B-wise Library')} className="w-36 max-w-full h-auto max-h-10 object-contain mb-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <p className="text-[8px] font-black text-white/75 tracking-widest mb-1.5 uppercase">DEVELOPED BY - BHARAT RASVE © 2026</p>
          <div className="flex items-center space-x-2">
            <button onClick={onCallDeveloper} className="w-8 h-8 flex items-center justify-center text-base text-sand hover:text-white active:scale-95 transition-colors" title={t('legacy.Call Developer')}>
              <i className="fa-solid fa-phone"></i>
            </button>
            <button onClick={() => window.open('https://wa.me/917218838122', '_blank')} className="w-8 h-8 flex items-center justify-center text-base text-sand hover:text-white active:scale-95 transition-colors" title={t('legacy.WhatsApp Developer')}>
              <i className="fa-brands fa-whatsapp"></i>
            </button>
            <a href="https://www.linkedin.com/in/bharatrasve" target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center text-base text-sand hover:text-white active:scale-95 transition-colors" title={t('legacy.LinkedIn')}>
              <i className="fa-brands fa-linkedin-in"></i>
            </a>
            <a href="https://github.com/bharombhar" target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center text-base text-sand hover:text-white active:scale-95 transition-colors" title={t('legacy.GitHub')}>
              <i className="fa-brands fa-github"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
