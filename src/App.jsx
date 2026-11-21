import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { App as CapApp } from '@capacitor/app';
import brandIcon from './assets/brand-icon.png?inline';
import { isNative } from './native/storage';
import { hideNativeSplash } from './native/init';
import { requestInitialDevicePermissions } from './native/contacts';
import { scheduleDueDateNotifications } from './native/dueNotifications';
import { saveAndShareBlob, isShareCancel } from './native/files';
import { formatDisplayDate, getStatusBadgeStyle, displayStatus, EMPTY_INITIAL_DATA } from './utils';
import { formatLocaleDate, formatLocaleNumber, setLanguage as persistLanguage } from './i18n';
import { useTranslation } from './i18n/useTranslation';

import BrandingFooter from './components/BrandingFooter';
import SideDrawer from './components/SideDrawer';
import SummaryTableCard from './components/SummaryTableCard';
import IndividualPersonPage from './components/IndividualPersonPage';
import BookJourneyPage from './components/BookJourneyPage';
import BookDetailsModal from './components/modals/BookDetailsModal';
import StatusUpdateModal from './components/modals/StatusUpdateModal';
import PersonFormModal from './components/modals/PersonFormModal';
import AdminConfigModal from './components/modals/AdminConfigModal';
import WishlistFormModal from './components/modals/WishlistFormModal';
import SyncSettingsModal from './components/modals/SyncSettingsModal';

export default function App() {
  const { t, language } = useTranslation();
  const formatKpiNumber = value => formatLocaleNumber(value || 0, {
    numberingSystem: language === 'en' ? 'latn' : 'deva',
  }, language);
  const [appData, setAppData] = useState(EMPTY_INITIAL_DATA);
  const [bootSplash, setBootSplash] = useState(true);
  const handleLanguageChange = (lang) => { persistLanguage(lang); };
  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [loadingState, setLoadingState] = useState({ text: 'Loading data...', visible: true, isSuccess: false });
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters for Books Table
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterAuthor, setFilterAuthor] = useState('ALL');
  const [filterLanguage, setFilterLanguage] = useState('ALL');
  const [filterPerson, setFilterPerson] = useState('ALL');
  const [filterLocation, setFilterLocation] = useState('ALL');

  // Status capsule filter for Persons page
  const [personStatusFilter, setPersonStatusFilter] = useState('ALL');
  // Capsule filter for Wishlist page: ALL | NOT_IN_POSSESSION
  const [wishlistFilter, setWishlistFilter] = useState('ALL');

  // Cross-Platform PDF Exporter (native: Android share sheet)
  const downloadPdfBlob = (pdfWorker, fileName) => {
    pdfWorker.output('blob').then((blob) => {
      return saveAndShareBlob(blob, fileName, t('export.sharePdf')).then(() => {
        triggerStatus(t('legacy.PDF Exported'), true);
      });
    }).catch((err) => {
      if (isShareCancel(err)) { triggerStatus(t('legacy.PDF Exported'), true); return; }
      triggerStatus(t('export.failed', { error: err?.message }), false);
    });
  };

  // Tag View State for Author & Category Filtering
  const [selectedTag, setSelectedTag] = useState(null); // { type: 'author' | 'category', value: string }

  // Copy Book Title to Clipboard
  const handleCopyTitle = (titleText, e) => {
    if (e) e.stopPropagation();
    if (!titleText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(titleText)
        .then(() => triggerStatus('Title copied!', true))
        .catch(() => triggerStatus('Copied: ' + titleText, true));
    } else {
      const ta = document.createElement('textarea');
      ta.value = titleText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      triggerStatus('Title copied!', true);
    }
  };

  // Open Dedicated Author / Category View
  const handleOpenTagView = (type, value, e) => {
    if (e) e.stopPropagation();
    if (!value || value === 'Unknown' || value === 'General') return;
    setSelectedTag({ type, value });
    setActiveTab('tagView');
  };

  // Modals: Dedicated modals for Edit Details (bookModal) and Edit Status (statusModal)
  const [bookModal, setBookModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [personModal, setPersonModal] = useState(null);
  const [adminConfigModal, setAdminConfigModal] = useState(null);
  const [wishlistModal, setWishlistModal] = useState(null);
  const [syncModal, setSyncModal] = useState(false);
  const [restoreConfirmFile, setRestoreConfirmFile] = useState(null);
  const backupFileInputRef = useRef(null);

  // Bottom Message Toast: Stays permanently visible while loading; auto-dismisses only on completion or error
  const statusTimerRef = useRef(null);
  const triggerStatus = (text, isSuccess = false) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setLoadingState({ text, visible: true, isSuccess });

    // If loading (not success and no error keyword), KEEP SHOWING INDEFINITELY until finished
    const isError = text.toLowerCase().includes('error') || text.toLowerCase().includes('failed');
    if (!isSuccess && !isError) {
      return; // Do not auto-dismiss while operation is running!
    }

    // Only dismiss when operation finishes (success: 1200ms, error: 3000ms)
    statusTimerRef.current = setTimeout(() => {
      setLoadingState(prev => ({ ...prev, visible: false }));
    }, isSuccess ? 1200 : 3000);
  };

  const fetchData = (force = false) => {
    triggerStatus('Loading data...', false);
    if (window.google && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(res => {
          if (res && res.status === 'success') {
            setAppData(res);
            setBootSplash(false);
            triggerStatus('Local data ready', true);
          } else {
            setBootSplash(false);
          triggerStatus('Failed to load local data', false);
          }
        })
        .withFailureHandler(err => {
          setBootSplash(false);
          triggerStatus('Local storage error: ' + (err.message || 'Check device storage'), false);
        })
        .getLibraryPayload(force);
    } else {
      setTimeout(() => { setBootSplash(false); triggerStatus('Local data ready', true); }, 600);
    }
  };

  useEffect(() => {
    hideNativeSplash().catch(error => console.warn('[splash] native splash hide failed', error));
    const splashTimer = setTimeout(() => setSplashMinElapsed(true), 2200);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    // Request Android runtime permissions on first launch. The app remains usable if either is denied.
    requestInitialDevicePermissions().catch(error => console.warn('[permissions] startup request failed', error));
    // Local-first startup: load the phone database without requiring a Google account or server.
    fetchData(false);
  }, []);

  useEffect(() => {
    // Keep due-date reminders aligned with the local library after startup and every data update.
    scheduleDueDateNotifications(appData).catch(error => console.warn('[notifications] scheduling failed', error));
  }, [appData.books, appData.people]);

  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setFilterCategory('ALL');
    setFilterAuthor('ALL');
    setFilterLanguage('ALL');
    setFilterPerson('ALL');
    setFilterLocation('ALL');
    setSearchQuery('');
  };

  // Contextual KPIs Tailored for Each Screen
  const currentKpis = useMemo(() => {
    const booksList = appData.books || [];
    const wishlistRecords = appData.wishlist || [];

    // WISHLIST TAB: Total wishlist, In possession on-shelf, Lent out, To get, Total value
    if (activeTab === 'wishlist') {
      const wishFromBooks = booksList.filter(b =>
        String(b.readingStatus || '').toUpperCase() === 'WISHLISTED' ||
        String(b.currentStatus || '').toUpperCase() === 'WISHLISTED'
      );
      const totalWishCount = wishFromBooks.length + wishlistRecords.length;
      const totalWishWorth = wishFromBooks.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

      let lentCount = 0;
      let withMeCount = 0;
      wishFromBooks.forEach(b => {
        const cSt = String(b.currentStatus || '').toUpperCase();
        const loc = String(b.location || '').toUpperCase();
        if (cSt === 'LENT' || cSt === 'OUT' || loc === 'TO PERSON' || b.person) {
          lentCount++;
        } else {
          withMeCount++;
        }
      });

      return {
        all: totalWishCount,
        withMe: withMeCount,
        lent: lentCount,
        wishlisted: wishlistRecords.length,
        totalWorth: totalWishWorth
      };
    }

    // PERSONS TAB: All Books involved, Returned books, Holding books, Wishlisted, Holding Value
    if (activeTab === 'persons') {
      let totalAllBooks = 0;
      let returnedCount = 0;
      let holdingCount = 0;
      let giftedCount = 0;
      let activeHoldingValue = 0;

      const booksMap = {};
      booksList.forEach(b => { booksMap[String(b.id)] = b; });

      (appData.people || []).forEach(p => {
        (p.records || []).forEach(r => {
          totalAllBooks++;
          const pSt = String(r.personStatus || '').trim().toUpperCase();
          if (pSt === 'HOLDING') {
            holdingCount++;
            activeHoldingValue += (Number(r.amount) || 0);
          } else if (pSt === 'RETURNED') {
            returnedCount++;
          } else if (pSt === 'GIFTED') {
            giftedCount++;
          }
        });
      });

      return {
        all: totalAllBooks,
        withMe: returnedCount,
        lent: holdingCount,
        wishlisted: giftedCount,
        totalWorth: activeHoldingValue
      };
    }

    // TAG VIEW: Author or Category specific aggregates
    if (activeTab === 'tagView' && selectedTag) {
      const tagBooks = booksList.filter(b =>
        String(b[selectedTag.type] || '').trim().toLowerCase() === String(selectedTag.value).trim().toLowerCase()
      );
      let allC = tagBooks.length;
      let withMeC = 0, lentC = 0, wishC = 0, worthS = 0;
      tagBooks.forEach(b => {
        const amt = Number(b.amount) || 0;
        const cSt = String(b.currentStatus || '').toUpperCase();
        const rSt = String(b.readingStatus || '').toUpperCase();
        const loc = String(b.location || '').toUpperCase();
        worthS += amt;
        if (rSt === 'WISHLISTED') wishC++;
        if (cSt === 'LENT' || cSt === 'OUT' || loc === 'TO PERSON' || b.person) {
          lentC++;
        } else {
          withMeC++;
        }
      });
      return { all: allC, withMe: withMeC, lent: lentC, wishlisted: wishC, totalWorth: worthS };
    }

    // HOME & BOOKS TABS: Real-time inventory overview
    let allCount = booksList.length;
    let withMeCount = 0, lentCount = 0, worthSum = 0;
    let wishCount = wishlistRecords.length; // Includes books to buy in store

    booksList.forEach(b => {
      const cSt = String(b.currentStatus || '').trim().toUpperCase();
      const rSt = String(b.readingStatus || '').trim().toUpperCase();
      const loc = String(b.location || '').trim().toUpperCase();
      const amt = Number(b.amount) || 0;

      worthSum += amt;
      if (rSt === 'WISHLISTED') {
        wishCount++;
      }

      if (cSt === 'LENT' || cSt === 'OUT' || loc === 'TO PERSON' || b.person) {
        lentCount++;
      } else if (cSt !== 'LOST' && cSt !== 'DAMAGED') {
        withMeCount++;
      }
    });

    return { all: allCount, withMe: withMeCount, lent: lentCount, wishlisted: wishCount, totalWorth: worthSum };
  }, [appData, activeTab, selectedTag]);

  const handleDirectDial = (phone) => {
    if (!phone) return alert('No phone number on record.');
    window.location.href = `tel:0${String(phone).replace(/\D/g, '').slice(-10)}`;
  };

  const handleSendWhatsAppReminder = (borrowerName, book) => {
    if (!book) return;
    const borrower = (appData.people || []).find(p => String(p.name || '').toLowerCase() === String(borrowerName || '').toLowerCase());
    const phone = borrower ? String(borrower.phone || '').replace(/\D/g, '') : '';
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dueDate = `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
    const authorStr = (book.author && book.author !== book.title) ? ` by ${book.author}` : '';
    const catStr = (book.category && book.category !== book.title) ? ` (${book.category})` : '';
    const msg = `Hi ${borrowerName}, you have borrowed "${book.title}"${authorStr}${catStr} from my library. Please return it by ${dueDate}. Thank you!`;
    const waUrl = phone ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.location.href = waUrl; // Follow the WhatsApp universal link so Android can open the installed app.
  };

  const handleSendAllHoldingWhatsAppReminder = (personObj) => {
    if (!personObj) return;
    const phone = personObj.phone ? String(personObj.phone).replace(/\D/g, '') : '';
    const holdingBooks = (personObj.records || []).filter(r => (r.personStatus || '').toUpperCase() === 'HOLDING');
    if (holdingBooks.length === 0) {
      return alert('No books are currently marked as holding for this reader.');
    }
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const returnDue = `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;

    let msg = `Hi ${personObj.name},
This is a gentle reminder regarding the books borrowed from my library:
`;
    holdingBooks.forEach((b, idx) => {
      msg += `${idx + 1}. "${b.title}" (Due: ${formatDisplayDate(b.promiseReturnDate) || returnDue})
`;
    });
    msg += `Please return them by ${returnDue}. Thank you!`;

    const waUrl = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.location.href = waUrl; // Follow the WhatsApp universal link so Android can open the installed app.
  };

  const handleExportPdf = async (elementId, fileName, titleText) => {
    const sourceEl = document.getElementById(elementId);
    if (!sourceEl) return;
    triggerStatus(t('export.formatting'), false);

    const clone = sourceEl.cloneNode(true);
    clone.querySelectorAll('table').forEach(table => {
      const actionColumns = table.tHead?.rows[0]?.querySelectorAll('th.no-print').length ?? 0;
      if (!actionColumns) return;
      for (const row of table.rows) {
        for (const cell of row.cells) {
          if (cell.colSpan > 1) cell.colSpan = Math.max(1, cell.colSpan - actionColumns);
        }
      }
    });
    clone.querySelectorAll('.no-print, footer').forEach(node => node.remove());
    clone.querySelectorAll('button[data-pdf-text]').forEach(button => {
      const text = document.createElement('span');
      text.className = button.className;
      text.textContent = button.textContent;
      button.replaceWith(text);
    });
    clone.querySelectorAll('button, input, select').forEach(node => node.remove());

    const container = document.createElement('div');
    container.style.cssText = 'padding:0 8px;background:#fff;color:#111827;box-sizing:border-box;';
    container.style.fontFamily = '"Noto Sans Devanagari", sans-serif';

    const header = document.createElement('header');
    header.style.cssText = 'border-bottom:2px solid #1E3535;padding-bottom:8px;margin-bottom:12px;';
    const title = document.createElement('h2');
    title.style.cssText = 'font-size:15px;font-weight:800;color:#1E3535;margin:0;';
    title.textContent = titleText || t('export.library');
    const date = document.createElement('p');
    date.style.cssText = 'font-size:10px;color:#6B7280;margin:3px 0 0;';
    date.textContent = t('export.statementDate', {
      date: formatLocaleDate(new Date(), { dateStyle: 'medium', numberingSystem: language === 'en' ? 'latn' : 'deva' }, language),
    });
    header.append(title, date);

    const makePrintable = node => {
      node.style.minWidth = '0';
      node.style.whiteSpace = 'normal';
      node.style.overflow = 'visible';
      node.style.textOverflow = 'clip';
      node.style.overflowWrap = 'anywhere';
    };
    makePrintable(clone);
    clone.style.margin = '0';
    clone.querySelectorAll('.truncate, .overflow-hidden, .overflow-x-auto, .whitespace-nowrap')
      .forEach(makePrintable);
    clone.querySelectorAll('table').forEach(table => {
      table.style.width = '100%';
      table.style.minWidth = '0';
    });
    clone.querySelectorAll('th, td, td .truncate').forEach(makePrintable);
    clone.querySelectorAll('th, td').forEach(cell => {
      cell.style.padding = '7px 8px';
      cell.style.verticalAlign = 'middle';
      cell.style.lineHeight = '1.5';
    });
    clone.querySelectorAll('td .rounded-full').forEach(badge => {
      badge.style.display = 'inline-block';
      badge.style.lineHeight = '1.5';
      badge.style.padding = '2px 6px';
      badge.style.verticalAlign = 'middle';
    });

    const footer = document.createElement('footer');
    footer.style.cssText = 'margin-top:16px;padding:14px 10px 8px;border-top:1px solid #E5E7EB;text-align:center;box-sizing:border-box;width:100%;';
    footer.innerHTML = `
      <img src="/horizontal-colored-logo.png" alt="B-wise Library" style="display:block;width:150px;max-width:80%;height:auto;max-height:48px;object-fit:contain;margin:0 auto 10px;" />
      <p style="font-size:9px;font-weight:800;color:#6B7280;letter-spacing:.3px;margin:0 0 12px;">B-wise Library Developed by - Bharat Rasve © 2026</p>
      <div style="display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;">
        <a href="tel:+917218838122" aria-label="${t('legacy.Call')}" title="${t('legacy.Call')}" style="width:26px;height:22px;display:flex;align-items:center;justify-content:center;color:#4C7774;text-decoration:none;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6.6 2.8c-.6-.6-1.5-.6-2.1 0L3 4.3c-.8.8-.9 2-.4 3.1 2.7 5.8 7.2 10.3 13 13 1.1.5 2.3.4 3.1-.4l1.5-1.5c.6-.6.6-1.5 0-2.1l-3-3c-.5-.5-1.3-.6-1.9-.2l-1.6 1c-2.3-1.1-4.1-2.9-5.2-5.2l1-1.6c.4-.6.3-1.4-.2-1.9z"/></svg></a>
        <a href="https://wa.me/917218838122" aria-label="WhatsApp" title="WhatsApp" style="width:26px;height:22px;display:flex;align-items:center;justify-content:center;color:#4C7774;text-decoration:none;"><svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.5 11.5 0 0 0 2.3 17.2L1 23l5.9-1.2A11.5 11.5 0 0 0 20.5 3.5ZM12 20a8 8 0 0 1-4.1-1.1l-.3-.2-3.5.7.8-3.4-.2-.3A8.5 8.5 0 1 1 12 20Zm4.6-6.3c-.3-.2-1.5-.7-1.8-.8s-.4-.1-.6.2-.7.8-.8 1-.3.2-.5.1a7.1 7.1 0 0 1-2.1-1.3 8 8 0 0 1-1.5-1.8c-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5s0-.3 0-.5-.6-1.4-.8-1.9-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.3.3-1 1-1 2.4s1 2.7 1.1 2.9a10.8 10.8 0 0 0 4.2 4.1c.5.2 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.2-.5-.3z"/></svg></a>
        <a href="https://www.linkedin.com/in/bharatrasve" aria-label="LinkedIn" title="LinkedIn" style="width:26px;height:22px;display:flex;align-items:center;justify-content:center;color:#4C7774;text-decoration:none;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 8H2v14h4V8ZM4 2a2.3 2.3 0 1 0 0 4.6A2.3 2.3 0 0 0 4 2Zm18 11c0-3.6-1.8-5.4-4.6-5.4-1.8 0-3 .9-3.7 2V8H10v14h4v-7c0-1.9.8-3.2 2.3-3.2s2.1 1.1 2.1 3V22H22Z"/></svg></a>
        <a href="https://github.com/bharombhar" aria-label="GitHub" title="GitHub" style="width:26px;height:22px;display:flex;align-items:center;justify-content:center;color:#4C7774;text-decoration:none;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .9a11.1 11.1 0 0 0-3.5 21.6c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.9.1-.7.4-1.1.7-1.4-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.4 1.2a11.8 11.8 0 0 1 6.2 0c2.4-1.6 3.4-1.2 3.4-1.2.6 1.7.2 3 .1 3.3.8.9 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1 .8 2v3c0 .3.2.7.8.6A11.1 11.1 0 0 0 12 .9z"/></svg></a>
      </div>
    `;

    container.appendChild(header);
    container.appendChild(clone);
    container.appendChild(footer);

    const opt = {
      margin: 0.4,
      filename: fileName || 'Library_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 840, scrollX: 0, scrollY: 0 },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['thead', 'tr', 'footer'] },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Load the PDF font before html2canvas measures its line boxes.
    try {
      await document.fonts?.load('400 12px "Noto Sans Devanagari"', 'Aa दे');
      await document.fonts?.load('700 12px "Noto Sans Devanagari"', 'Aa दे');
    } catch {
      // The renderer can still use its fallback fonts.
    }
    const worker = html2pdf().set(opt).from(container);
    downloadPdfBlob(worker, fileName || 'Library_Report.pdf');
  };

  const handleExportFullBackup = (shareTitle = t('export.backup')) => {
    setDrawerOpen(false);
    triggerStatus(t('export.backupPreparing'), false);
    if (window.google && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler((csvString) => {
          const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
          const fileName = `Library_Backup_${new Date().toISOString().split('T')[0]}.csv`;
          saveAndShareBlob(blob, fileName, shareTitle)
            .then(() => triggerStatus(t('export.backupDone'), true))
            .catch((err) => {
              if (isShareCancel(err)) triggerStatus(t('export.backupDone'), true);
              else triggerStatus(t('export.backupFailed', { error: err?.message }), false);
            });
        })
        .withFailureHandler((err) => triggerStatus(t('export.backupFailed', { error: err?.message }), false))
        .exportAllSheetsBackupCsv();
    }
  };

  const handleImportBackupFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setDrawerOpen(false);
    setRestoreConfirmFile(file);
  };

  const executeRestore = () => {
    if (!restoreConfirmFile) return;
    const file = restoreConfirmFile;
    setRestoreConfirmFile(null);
    triggerStatus('Restoring backup...', false);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (window.google && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((payload) => {
            if (backupFileInputRef.current) backupFileInputRef.current.value = '';
            if (payload) setAppData(payload);
            triggerStatus('Restored successfully!', true);
          })
          .withFailureHandler((err) => {
            if (backupFileInputRef.current) backupFileInputRef.current.value = '';
            triggerStatus('Restore failed: ' + err.message, false);
          })
          .importAllSheetsBackupCsv(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (appData.books || []).filter(b => {
      if (!b) return false;
      const searchHaystack = [
        b.title, b.author, b.category, b.language,
        b.currentStatus, b.location, b.person, b.notes
      ].map(val => val || '').join(' ').toLowerCase();

      const matchesQuery = !q || searchHaystack.includes(q);
      const matchesStatus = filterStatus === 'ALL' || b.currentStatus === filterStatus;
      const matchesCategory = filterCategory === 'ALL' || b.category === filterCategory;
      const matchesAuthor = filterAuthor === 'ALL' || b.author === filterAuthor;
      const matchesLanguage = filterLanguage === 'ALL' || b.language === filterLanguage;
      const matchesPerson = filterPerson === 'ALL' || b.person === filterPerson;
      const matchesLocation = filterLocation === 'ALL' || b.location === filterLocation;

      if (!matchesQuery || !matchesStatus || !matchesCategory || !matchesAuthor || !matchesLanguage || !matchesPerson || !matchesLocation) {
        return false;
      }

      if (activeTab === 'wishlist') return b.currentStatus === 'WISHLISTED';
      if (activeTab === 'books') return b.currentStatus !== 'WISHLISTED';
      return true;
    });
  }, [appData.books, searchQuery, filterStatus, filterCategory, filterAuthor, filterLanguage, filterPerson, filterLocation, activeTab]);

  const filterOptions = useMemo(() => {
    const authors = Array.from(new Set((appData.books || []).map(b => b && b.author).filter(Boolean))).sort();
    const languages = Array.from(new Set((appData.books || []).map(b => b && b.language).filter(Boolean))).sort();
    return { authors, languages };
  }, [appData.books]);

  const localTodayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const dueDateKey = (value) => {
    const raw = String(value || '').trim();
    const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const named = raw.match(/^(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{4})$/);
    if (named) {
      const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[2].toLowerCase());
      if (month >= 0) return named[3] + '-' + String(month + 1).padStart(2, '0') + '-' + String(named[1]).padStart(2, '0');
    }
    return '';
  };
  const dueTodayBooks = (appData.books || []).filter(book =>
    dueDateKey(book.promiseReturnDate) === localTodayKey &&
    String(book.currentStatus || '').toUpperCase() === 'LENT' &&
    String(book.personStatus || 'HOLDING').toUpperCase() === 'HOLDING' && Boolean(book.person)
  );
  const wishlistAlertCount = (appData.wishlist || []).filter(item => {
    const status = String(item.status || '').toUpperCase();
    return status.includes('NOT IN POSSESSION') || !status.includes('IN POSSESSION');
  }).length;

  // ---- Android hardware back button: close overlays -> go up one screen -> home -> exit ----
  const backRef = useRef(null);
  backRef.current = () => {
    if (syncModal) { setSyncModal(false); return true; }
    if (restoreConfirmFile) { setRestoreConfirmFile(null); return true; }
    if (wishlistModal) { setWishlistModal(null); return true; }
    if (adminConfigModal) { setAdminConfigModal(null); return true; }
    if (personModal) { setPersonModal(null); return true; }
    if (statusModal) { setStatusModal(null); return true; }
    if (bookModal) { setBookModal(null); return true; }
    if (drawerOpen) { setDrawerOpen(false); return true; }
    if (searchQuery) { setSearchQuery(''); return true; }
    if (activeTab === 'bookDetail') { setActiveTab('books'); return true; }
    if (activeTab === 'personDetail') { setActiveTab('persons'); return true; }
    if (activeTab === 'tagView') { setActiveTab('books'); setSelectedTag(null); return true; }
    if (activeTab !== 'home') { setActiveTab('home'); return true; }
    return false;
  };
  useEffect(() => {
    if (!isNative()) return undefined;
    let handle = null;
    CapApp.addListener('backButton', () => {
      if (!(backRef.current && backRef.current())) CapApp.exitApp();
    }).then((h) => { handle = h; });
    return () => { if (handle) handle.remove(); };
  }, []);

  useEffect(() => {
    if (!isNative()) return undefined;
    let listener = null;
    let active = true;
    const openShortcut = (url) => {
      if (!url || !String(url).startsWith('bwise://')) return;
      if (String(url).includes('new-book')) {
        setActiveTab('books');
        setBookModal({ isNew: true, book: {} });
      } else if (String(url).includes('wishlist-book')) {
        setActiveTab('wishlist');
        setWishlistModal({ isNew: true, item: {} });
      }
    };
    CapApp.addListener('appUrlOpen', event => openShortcut(event?.url)).then(h => { listener = h; });
    CapApp.getLaunchUrl().then(result => { if (active && result?.url) openShortcut(result.url); }).catch(() => {});
    return () => { active = false; if (listener) listener.remove(); };
  }, []);

  return (
    <div className="min-h-screen max-w-xl mx-auto flex flex-col justify-between relative shadow-2xl bg-alabaster m-0 p-0 border-0 overflow-x-hidden">
      {(bootSplash || !splashMinElapsed) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8" style={{ background: 'linear-gradient(145deg, #123D3B 0%, #047372 52%, #0A5550 100%)' }}>
          <img src="/horizontal-logo.png" alt={t('legacy.B-wise Library')} className="w-full max-w-[300px] max-h-[120px] object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <p className="mt-5 text-white/85 text-xs font-semibold tracking-[0.22em] uppercase">{t('legacy.Your library. Always with you.')}</p>
          <div className="absolute bottom-10 text-white/65 text-[10px] tracking-widest uppercase">{t('legacy.B-wise Library')}</div>
        </div>
      )}

      {/* Status Toast: Bottom Notification Pill with High Contrast Badging */}
      {loadingState.visible && (
        <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all animate-bounce-short">
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-2xl border flex items-center ${
            loadingState.isSuccess
              ? 'bg-emerald-800 text-emerald-100 border-emerald-500'
              : (loadingState.text.toLowerCase().includes('error') || loadingState.text.toLowerCase().includes('failed')
                  ? 'bg-rose-900 text-rose-100 border-rose-600'
                  : 'bg-forest text-sand border-sand/40')
          }`}>
            {loadingState.isSuccess ? (
              <i className="fa-solid fa-circle-check mr-1.5 text-emerald-300"></i>
            ) : (loadingState.text.toLowerCase().includes('error') || loadingState.text.toLowerCase().includes('failed')) ? (
              <i className="fa-solid fa-triangle-exclamation mr-1.5 text-rose-300"></i>
            ) : (
              <i className="fa-solid fa-circle-notch animate-spin mr-1.5 text-sand"></i>
            )}
            {loadingState.text}
          </span>
        </div>
      )}

      {/* SIDE DRAWER (Right-Sliding Menu) */}
      <SideDrawer
        isOpen={drawerOpen}
        displayLanguage={language}
        onLanguageChange={handleLanguageChange}
        onClose={() => setDrawerOpen(false)}
        onOpenPersonManage={() => { setDrawerOpen(false); setActiveTab('persons'); }}
        onAddPerson={() => { setDrawerOpen(false); setPersonModal({ isNew: true, person: {} }); }}
        onAddCategory={() => { setDrawerOpen(false); setAdminConfigModal({ type: 'Category' }); }}
        onAddLocation={() => { setDrawerOpen(false); setAdminConfigModal({ type: 'Location' }); }}
        onAddStatus={() => { setDrawerOpen(false); setAdminConfigModal({ type: 'Current_Status' }); }}
        onBackupWithGoogle={() => handleExportFullBackup(t('export.backupDrive'))}
        onExportBackup={() => handleExportFullBackup(t('export.backup'))}
        onRestoreClick={() => { if (backupFileInputRef.current) { backupFileInputRef.current.value = ''; backupFileInputRef.current.click(); } }}
        onSyncSettings={() => { setDrawerOpen(false); setSyncModal(true); }}
        onCallDeveloper={() => handleDirectDial('917218838122')}
      />
      <input type="file" accept="*/*,.csv,text/csv,application/csv,application/vnd.ms-excel,text/plain,application/octet-stream" ref={backupFileInputRef} onChange={handleImportBackupFile} aria-label={t('legacy.Select library backup CSV')} style={{ position: "fixed", left: "-10000px", top: 0, width: "1px", height: "1px", opacity: 0 }} />

      <div className="flex-1 flex flex-col pt-[60px] pb-28">

        {/* HEADER: Fixed Top Strip Fully Flush with Top Edge (Zero Gap) */}
        <header
          id="appHeader"
          className="fixed left-0 right-0 max-w-xl mx-auto bg-forest h-[60px] px-3 flex items-center justify-between text-white z-40 space-x-3 border-0 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          style={{ top: 0, margin: 0, padding: '0 12px', border: 0, backgroundColor: '#1E3535' }}
        >
          <div className="flex-1 relative">
            <div className="relative rounded-full transition-all duration-200 p-[1px] group focus-within:p-[1.5px]"
                 style={{
                   background: searchQuery.trim().length > 0
                     ? 'linear-gradient(135deg, #047372 0%, rgba(212, 193, 163, 0.95) 100%)'
                     : 'transparent'
                 }}
                 onFocus={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #047372 0%, rgba(212, 193, 163, 0.95) 100%)'}
                 onBlur={(e) => {
                   if (!searchQuery.trim()) e.currentTarget.style.background = 'transparent';
                 }}
            >
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/50 text-xs pointer-events-none z-10 group-hover:text-charcoal/70 transition-colors"></i>
              <input
                type="text"
                placeholder={t('legacy.Search title, author, reader, genre, location...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F7F5EE]/90 hover:bg-white focus:bg-white text-charcoal placeholder-stone-500/80 border-0 py-2 pl-9 pr-8 text-xs rounded-full focus:outline-none transition-all duration-200 shadow-sm focus:shadow-md relative z-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/50 hover:text-charcoal px-1 z-10 active:scale-90 transition-transform">
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              )}
            </div>

            {/* Attached Live Suggestion Dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white text-charcoal rounded-b-xl shadow-2xl border border-sand/60 overflow-hidden z-50 divide-y divide-sand/30">
                {(() => {
                  const q = searchQuery.toLowerCase().trim();
                  const matchBooks = (appData.books || []).filter(b =>
                    (b.title || '').toLowerCase().includes(q) ||
                    (b.author || '').toLowerCase().includes(q) ||
                    (b.category || '').toLowerCase().includes(q) ||
                    (b.location || '').toLowerCase().includes(q)
                  ).slice(0, 4);

                  const matchPersons = (appData.people || []).filter(p =>
                    (p.name || '').toLowerCase().includes(q) ||
                    (p.phone || '').includes(q)
                  ).slice(0, 2);

                  if (matchBooks.length === 0 && matchPersons.length === 0) {
                    return <div className="p-2.5 text-center text-[10px] text-stone-400">{t('legacy.No matching books or readers')}</div>;
                  }

                  return (
                    <>
                      {matchBooks.map(b => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBook(b);
                            setActiveTab('bookDetail');
                            setSearchQuery('');
                          }}
                          className="p-2 hover:bg-sand/20 cursor-pointer flex items-center justify-between text-left"
                        >
                          <div className="max-w-[70%]">
                            <p className="text-[11px] font-black truncate text-forest leading-tight">{b.title}</p>
                            <p className="text-[9px] text-stone-500 truncate">{b.author} • {b.category}</p>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sand/30 text-stone-700">{b.location}</span>
                        </div>
                      ))}

                      {matchPersons.map(p => {
                        const holdingCount = (p.records || []).filter(r => (r.personStatus || '').toUpperCase() === 'HOLDING').length;
                        return (
                          <div
                            key={p.name}
                            onClick={() => {
                              setSelectedPerson(p);
                              setActiveTab('personDetail');
                              setSearchQuery('');
                            }}
                            className="p-2 bg-amber-50/50 hover:bg-amber-100/60 cursor-pointer flex items-center justify-between text-left"
                          >
                            <div>
                              <p className="text-[11px] font-black text-charcoal leading-tight flex items-center space-x-1">
                                <i className="fa-solid fa-user text-forest text-[9px] mr-1"></i>
                                <span>{p.name}</span>
                              </p>
                              <p className="text-[9px] text-stone-500">{p.phone || 'Reader'}</p>
                            </div>
                            <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded ${holdingCount > 0 ? 'bg-amber-200 text-amber-900' : 'bg-stone-200 text-stone-700'}`}>
                              {holdingCount} Holding
                            </span>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1 flex-none">
            <button onClick={() => setDrawerOpen(true)} className="relative p-2 text-white hover:opacity-80 active:scale-95 transition-all text-sm" title={t('legacy.Local library and backup status: saved on this phone')}>
              <i className="fa-solid fa-cloud-arrow-up"></i>
            </button>
            <button onClick={() => setAlertsOpen(value => !value)} className="relative p-2 text-white hover:opacity-80 active:scale-95 transition-all text-sm" title={t('legacy.Notifications and reminders')} aria-label={t('legacy.Notifications')}>
              <i className="fa-regular fa-bell"></i>
              {(dueTodayBooks.length + wishlistAlertCount > 0) && <span className="absolute right-0 top-0 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{Math.min(99, dueTodayBooks.length + wishlistAlertCount)}</span>}
            </button>
            <button onClick={() => setDrawerOpen(true)} className="p-2 text-white hover:opacity-80 active:scale-95 transition-all text-base" title={t('legacy.Open Menu')}>
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        </header>

        {alertsOpen && (
          <div className="fixed top-[58px] right-2 z-[60] w-[min(340px,calc(100vw-16px))] rounded-xl border border-sand/60 bg-white text-charcoal shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-forest text-white">
              <h3 className="text-xs font-black uppercase tracking-wide">{t('legacy.Notifications')}</h3>
              <button onClick={() => setAlertsOpen(false)} aria-label={t('legacy.Close notifications')}><i className="fa-solid fa-xmark"></i></button>
            </div>
            {dueTodayBooks.length > 0 && <div className="p-3 border-b border-sand/40 space-y-2">
              <p className="text-[10px] font-black uppercase text-rose-700">{t('counts.dueToday', { count: formatKpiNumber(dueTodayBooks.length) })}</p>
              {dueTodayBooks.slice(0, 5).map(book => {
                const reader = (appData.people || []).find(p => String(p.name || '').toLowerCase() === String(book.person || '').toLowerCase());
                const phone = String(reader?.phone || '').replace(/\D/g, '');
                const message = `Hi ${book.person}, the book \"${book.title}\" borrowed from my library is due today (${localTodayKey}). Please return it when convenient. Thank you!`;
                const waUrl = phone ? `https://wa.me/${phone.length === 10 ? '91' : ''}${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
                return <div key={book.id} className="flex items-center justify-between gap-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => { setSelectedBook(book); setActiveTab('bookDetail'); setAlertsOpen(false); }}>
                    <span className="block text-[11px] font-bold truncate">{book.title}</span><span className="block text-[10px] text-stone-500 truncate">{t('legacy.Held by')} {book.person}</span>
                  </button>
                  <button onClick={() => { window.open(waUrl, '_blank'); setAlertsOpen(false); }} className="shrink-0 rounded-full bg-emerald-600 text-white px-2.5 py-1.5 text-[10px] font-bold"><i className="fa-brands fa-whatsapp mr-1"></i>{t('legacy.Remind')}</button>
                </div>;
              })}
            </div>}
            <button onClick={() => { setActiveTab('wishlist'); setAlertsOpen(false); }} className="w-full p-3 text-left flex items-center justify-between hover:bg-sand/20">
              <span><span className="block text-[11px] font-bold">{t('legacy.Wishlist')}</span><span className="block text-[10px] text-stone-500">You have {wishlistAlertCount} item{wishlistAlertCount === 1 ? '' : 's'} to get.</span></span>
              <i className="fa-solid fa-chevron-right text-stone-400"></i>
            </button>
            {dueTodayBooks.length === 0 && wishlistAlertCount === 0 && <p className="p-4 text-center text-xs text-stone-500">{t('legacy.You’re all caught up.')}</p>}
          </div>
        )}

        {/* DARK GRADIENT TOP KPI CARD (Dynamic Titles per Active Screen) */}
        {activeTab !== 'personDetail' && activeTab !== 'bookDetail' && (
          <div
            className="mt-3 mx-3.5 shadow-[0_4px_16px_rgba(4,115,114,0.35)] border border-white/15 rounded-2xl grid grid-cols-5 divide-x divide-white/10 text-center py-3 text-white flex-none"
            style={{ background: 'linear-gradient(to right, #033636 0%, #047372 45%, #0e4e4e 75%, #052626 100%)' }}
          >
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold leading-tight [overflow-wrap:anywhere] text-white/80">
                {t(activeTab === 'persons' ? 'kpi.allBooks' : 'kpi.books')}
              </p>
              <p className="text-base font-black text-amber-200 mt-0.5">{formatKpiNumber(currentKpis.all)}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold leading-tight [overflow-wrap:anywhere] text-white/80">
                {t(activeTab === 'persons' ? 'kpi.returned' : 'kpi.withMe')}
              </p>
              <p className="text-base font-black text-emerald-300 mt-0.5">{formatKpiNumber(currentKpis.withMe)}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold leading-tight [overflow-wrap:anywhere] text-white/80">
                {t(activeTab === 'persons' ? 'kpi.holding' : 'kpi.out')}
              </p>
              <p className="text-base font-black text-orange-300 mt-0.5">{formatKpiNumber(currentKpis.lent)}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold leading-tight [overflow-wrap:anywhere] text-white/80">
                {t(activeTab === 'wishlist' ? 'kpi.toGet' : activeTab === 'persons' ? 'kpi.gifted' : 'kpi.wishlist')}
              </p>
              <p className="text-base font-black text-purple-300 mt-0.5">{formatKpiNumber(currentKpis.wishlisted)}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold leading-tight [overflow-wrap:anywhere] text-white/80">{t('kpi.worth')}</p>
              <p className="text-sm font-black text-sand mt-0.5 truncate">₹{formatKpiNumber(currentKpis.totalWorth)}</p>
            </div>
          </div>
        )}

        <div className="flex-1 px-3.5 pt-4">

          {/* FILTER BAR APPLIES ACROSS HOME & BOOKS */}
          {(activeTab === 'home' || activeTab === 'books') && (
            <div className="bg-white p-2.5 rounded-xl border border-sand/50 shadow-sm space-y-2 mb-4">
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">{t('legacy.Status: All')}</option>
                  {((appData.config && appData.config.currentStatuses) || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">{t('legacy.Category: All')}</option>
                  {((appData.config && appData.config.categories) || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">{t('legacy.Language: All')}</option>
                  {(filterOptions.languages || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold items-center">
                <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">{t('legacy.Author: All')}</option>
                  {(filterOptions.authors || []).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">{t('legacy.Person: All')}</option>
                  {(appData.people || []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">{t('legacy.Location: All')}</option>
                  {((appData.config && appData.config.locations) || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="flex justify-end">
                  <button
                    onClick={handleResetFilters}
                    className="w-full bg-sand/30 text-forest rounded py-1 px-2 uppercase text-[9px] font-extrabold flex items-center justify-center space-x-1 hover:bg-sand/50 active:scale-95 transition-all shadow-xs"
                    title={t('legacy.Reset all filters')}
                  >
                    <i className="fa-solid fa-arrow-rotate-left text-[8px]"></i>
                    <span>{t('legacy.Reset')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: HOME (CONNECTS FILTERS & SEARCH DIRECTLY TO SUMMARY TABLES) */}
          {activeTab === 'home' && (
            <div id="home-summaries" className="space-y-4">
              <SummaryTableCard
                id="st-1"
                title={t('legacy.Status-Wise Summary')}
                badge={t('legacy.Status')}
                rows={filteredBooks.filter(b => b.currentStatus !== 'WISHLISTED')}
                onRowClick={b => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                onShare={() => handleExportPdf('st-1', 'Status_Summary.pdf', t('export.status'))}
                onCopyTitle={handleCopyTitle}
                onOpenTag={handleOpenTagView}
              />

              <SummaryTableCard
                id="st-2"
                title={t('legacy.Active Lent / Borrowed')}
                badge={t('legacy.Person')}
                rows={filteredBooks.filter(b => b.person && (b.currentStatus === 'LENT' || (b.location || '').toUpperCase() === 'TO PERSON'))}
                onRowClick={b => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                onShare={() => handleExportPdf('st-2', 'Lent_Summary.pdf', t('export.lent'))}
                onCopyTitle={handleCopyTitle}
                onOpenTag={handleOpenTagView}
              />

              <SummaryTableCard
                id="st-3"
                title={t('legacy.Location Distribution')}
                badge={t('legacy.Location')}
                rows={filteredBooks.filter(b => b.location)}
                onRowClick={b => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                onShare={() => handleExportPdf('st-3', 'Location_Summary.pdf', t('export.location'))}
                onCopyTitle={handleCopyTitle}
                onOpenTag={handleOpenTagView}
              />
              <BrandingFooter onCallDeveloper={() => handleDirectDial('917218838122')} />
            </div>
          )}

          {/* TAB 2: BOOKS COLLECTIONS DIRECTORY (NON-HORIZONTALLY SCROLLABLE) */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              <div id="books-table-export" className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden mb-4">
                <div className="flex justify-between items-center px-3 py-2 bg-stone-100 border-b border-sand/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-forest">{t('legacy.Books Collections')}</span>
                  <div className="flex items-center space-x-3 text-stone-500">
                    <span className="text-[9px] font-bold">{t(filteredBooks.length === 1 ? 'counts.book' : 'counts.books', { count: formatKpiNumber(filteredBooks.length) })}</span>
                    <button onClick={() => handleExportPdf('books-table-export', 'Books_Collections.pdf', t('export.collection'))} className="hover:text-forest" title={t('legacy.Export Table as PDF')}>
                      <i className="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-2 w-[44%]">{t('legacy.Title & Author')}</th>
                        <th className="px-1.5 py-2 w-[19%]">{t('legacy.Initial Status')}</th>
                        <th className="px-1.5 py-2 w-[19%]">{t('legacy.Cur. status')}</th>
                        <th className="px-2 py-2 w-[18%]">{t('legacy.Location')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                      {filteredBooks.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-8 text-stone-400 text-xs">{t('legacy.No matching records')}</td></tr>
                      ) : (
                        filteredBooks.map((b) => (
                          <tr
                            key={b.id}
                            className="hover:bg-sand/15 transition-colors cursor-pointer active:bg-sand/25"
                            onClick={() => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                            title={t('legacy.Click to view Book Journey')}
                          >
                            <td className="px-2.5 py-2">
                              <div className="flex items-center space-x-1 truncate">
                                <button
                                  onClick={(e) => handleCopyTitle(b.title, e)}
                                  className="text-stone-400 hover:text-forest active:scale-90 p-0.5 flex-none"
                                  title={t('legacy.Copy Title')}
                                >
                                  <i className="fa-regular fa-copy text-[9px]"></i>
                                </button>
                                <span className="font-extrabold text-[11px] truncate text-charcoal">{b.title}</span>
                              </div>
                              <p className="text-[9px] text-stone-500 truncate flex items-center space-x-1">
                                <button
                                  data-pdf-text
                                  onClick={(e) => handleOpenTagView('author', b.author, e)}
                                  className="hover:underline hover:text-forest truncate text-left"
                                  title={`Filter author: ${b.author}`}
                                >
                                  {b.author || t('legacy.Unknown')}
                                </button>
                                <span>•</span>
                                <button
                                  data-pdf-text
                                  onClick={(e) => handleOpenTagView('category', b.category, e)}
                                  className="text-forest font-bold hover:underline hover:text-ochre"
                                  title={`Filter category: ${b.category}`}
                                >
                                  {b.category || t('legacy.General')}
                                </button>
                              </p>
                            </td>
                            <td className="px-1.5 py-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setBookModal({ isNew: false, book: b }); }} title={t('legacy.Edit Book Details')}>
                              <p className="font-semibold text-stone-700 truncate hover:text-ochre">{b.initialStatus || '-'}</p>
                              <p className="text-[8.5px] text-stone-500 font-medium">{formatDisplayDate(b.bookInDate)}</p>
                            </td>
                            <td className="px-1.5 py-2" onClick={(e) => { e.stopPropagation(); setStatusModal({ book: b }); }} title={t('legacy.Edit Status / Lending')}>
                              <span className={`text-[8.5px] uppercase tracking-wide leading-tight hover:underline ${getStatusBadgeStyle(b.currentStatus)}`}>
                                {displayStatus(b.currentStatus)}
                              </span>
                              <p className="text-[8.5px] text-stone-500 font-medium">{formatDisplayDate(b.eventDate)}</p>
                              {b.currentStatus === 'LENT' && b.promiseReturnDate && (
                                <p className="text-[8px] text-rose-700 font-bold mt-0.5 truncate">Due: {formatDisplayDate(b.promiseReturnDate)}</p>
                              )}
                            </td>
                            <td className="px-2 py-2 text-[10px]">
                              <span className="font-bold text-stone-700 truncate block">{b.location}</span>
                              {b.person && <p className="text-[8px] text-forest truncate">@{b.person}</p>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <BrandingFooter onCallDeveloper={() => handleDirectDial('917218838122')} />
            </div>
          )}

          {/* TAB 4: COMPLETE WISHLIST TABLE WITH TWO-WAY STATUS SYNC */}
          {activeTab === 'wishlist' && (
            <div className="space-y-3">
              {(() => {
                // Collect inventory books flagged as wishlisted
                const bookTitlesInInventory = new Set();
                const wishlistFromBooks = (appData.books || [])
                  .filter(b =>
                    String(b.readingStatus || '').toUpperCase() === 'WISHLISTED' ||
                    String(b.currentStatus || '').toUpperCase() === 'WISHLISTED'
                  )
                  .map(b => {
                    bookTitlesInInventory.add((b.title || '').trim().toLowerCase());
                    return {
                      id: b.id,
                      title: b.title,
                      author: b.author,
                      category: b.category,
                      language: b.language,
                      status: 'IN POSSESSION',
                      isInventory: true,
                      raw: b
                    };
                  });

                // Collect wishlist records; normalize and deduplicate if already in inventory
                const wishlistFromRecords = [];
                (appData.wishlist || []).forEach(w => {
                  const titleKey = (w.title || '').trim().toLowerCase();
                  const rawSt = String(w.status || '').toLowerCase().trim();
                  const isInPoss = rawSt.includes('in possession') && !rawSt.includes('not in possession');

                  // If it's already represented via BOOK_RECORD, don't duplicate the row
                  if (bookTitlesInInventory.has(titleKey)) return;

                  wishlistFromRecords.push({
                    id: w.id,
                    title: w.title,
                    author: w.author,
                    category: w.category,
                    language: w.language,
                    status: isInPoss ? 'IN POSSESSION' : 'NOT IN POSSESSION',
                    isInventory: false,
                    raw: w
                  });
                });

                const allCombinedWishlist = [...wishlistFromBooks, ...wishlistFromRecords];
                const notInPossessionCount = allCombinedWishlist.filter(i => i.status === 'NOT IN POSSESSION').length;
                const inPossessionCount = allCombinedWishlist.filter(i => i.status === 'IN POSSESSION').length;

                const filteredWishlist = allCombinedWishlist.filter(item => {
                  if (wishlistFilter === 'NOT_IN_POSSESSION') return item.status === 'NOT IN POSSESSION';
                  if (wishlistFilter === 'IN_POSSESSION') return item.status === 'IN POSSESSION';
                  return true;
                });

                return (
                  <>
                    {/* Status Capsule Filter Bar: ALL, Not In Possession, In Possession */}
                    <div className="bg-white p-2 rounded-xl border border-sand/50 shadow-sm flex items-center space-x-1.5 overflow-x-auto hide-scrollbar">
                      <button
                        onClick={() => setWishlistFilter('ALL')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all tracking-wide flex-none ${
                          wishlistFilter === 'ALL'
                            ? 'bg-forest text-alabaster shadow-xs scale-102'
                            : 'bg-alabaster text-stone-600 hover:bg-sand/30 border border-sand/40'
                        }`}
                      >
                        {t('counts.all', { count: formatKpiNumber(allCombinedWishlist.length) })}
                      </button>
                      <button
                        onClick={() => setWishlistFilter('NOT_IN_POSSESSION')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all tracking-wide flex-none ${
                          wishlistFilter === 'NOT_IN_POSSESSION'
                            ? 'bg-purple-900 text-white shadow-xs scale-102'
                            : 'bg-alabaster text-stone-600 hover:bg-sand/30 border border-sand/40'
                        }`}
                      >
                        {t('counts.notOwned', { count: formatKpiNumber(notInPossessionCount) })}
                      </button>
                      <button
                        onClick={() => setWishlistFilter('IN_POSSESSION')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all tracking-wide flex-none ${
                          wishlistFilter === 'IN_POSSESSION'
                            ? 'bg-emerald-800 text-white shadow-xs scale-102'
                            : 'bg-alabaster text-stone-600 hover:bg-sand/30 border border-sand/40'
                        }`}
                      >
                        {t('counts.owned', { count: formatKpiNumber(inPossessionCount) })}
                      </button>
                    </div>

                    <div id="wishlist-table-export" className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden">
                      <div className="flex justify-between items-center px-3 py-2.5 bg-stone-100 border-b border-sand/40">
                        <div>
                          <h2 className="text-xs font-black uppercase tracking-wider text-forest">{t('legacy.My Books Wishlist')}</h2>
                        </div>
                        <div className="flex items-center space-x-2 text-stone-500">
                          <button
                            onClick={() => setWishlistModal({ isNew: true, item: {} })}
                            className="no-print px-2.5 py-1 bg-forest text-white text-[10px] font-black rounded-lg flex items-center space-x-1 active:scale-95 shadow-xs"
                            title={t('legacy.Add Book to Wishlist')}
                          >
                            <i className="fa-solid fa-plus text-[9px]"></i><span>{t('legacy.Add Wishlist')}</span>
                          </button>
                          <button onClick={() => handleExportPdf('wishlist-table-export', 'My_Books_Wishlist.pdf', t('export.wishlist'))} className="hover:text-forest p-1" title={t('legacy.Export Wishlist PDF')}>
                            <i className="fa-solid fa-share-nodes text-xs"></i>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-hidden">
                        <table className="w-full text-left text-[11px] table-fixed">
                          <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                            <tr>
                              <th className="px-3 py-2 w-[52%]">{t('legacy.Book Title & Author')}</th>
                              <th className="px-2 py-2 w-[30%]">{t('legacy.Genre & Lang')}</th>
                              <th className="px-2 py-2 text-right w-[18%]">{t('legacy.Available')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                            {filteredWishlist.length === 0 ? (
                              <tr><td colSpan="3" className="text-center py-8 text-stone-400 text-xs">{t('legacy.No books in this view.')}</td></tr>
                            ) : (
                              filteredWishlist.map((w) => {
                                const isAvailable = !String(w.status).toUpperCase().includes('NOT IN POSSESSION');
                                return (
                                  <tr
                                    key={w.id}
                                    className="hover:bg-sand/15 transition-colors cursor-pointer"
                                    onClick={() => {
                                      if (w.isInventory) {
                                        // Open Update Status & Journey modal for books in collection
                                        setStatusModal({ book: w.raw });
                                      } else {
                                        // Open Wishlist edit modal for books to get
                                        setWishlistModal({ isNew: false, item: w.raw });
                                      }
                                    }}
                                    title={w.isInventory ? "Click to update status & journey" : "Click to edit bookstore wishlist item"}
                                  >
                                    <td className="px-3 py-2">
                                      <div className="flex items-center space-x-1 truncate">
                                        <button
                                          onClick={(e) => handleCopyTitle(w.title, e)}
                                          className="text-stone-400 hover:text-forest active:scale-90 p-0.5 flex-none"
                                          title={t('legacy.Copy Title')}
                                        >
                                          <i className="fa-regular fa-copy text-[9px]"></i>
                                        </button>
                                        <span className="font-extrabold text-[11px] truncate text-charcoal">{w.title}</span>
                                      </div>
                                      <p className="text-[9px] text-stone-500 truncate">
                                        <button
                                          data-pdf-text
                                          onClick={(e) => handleOpenTagView('author', w.author, e)}
                                          className="hover:underline hover:text-forest truncate"
                                          title={`Filter author: ${w.author}`}
                                        >
                                          {w.author || t('legacy.Unknown')}
                                        </button>
                                      </p>
                                    </td>
                                    <td className="px-2 py-2 text-[10px]">
                                      <button
                                        data-pdf-text
                                        onClick={(e) => handleOpenTagView('category', w.category, e)}
                                        className="font-bold text-forest block truncate max-w-fit hover:underline hover:text-ochre"
                                        title={`Filter category: ${w.category}`}
                                      >
                                        {w.category || t('legacy.General')}
                                      </button>
                                      <span className="text-[9px] text-stone-500 mt-0.5 block truncate">{w.language || t('legacy.English')}</span>
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      <span className={`text-[9.5px] font-black uppercase tracking-wider ${isAvailable ? 'text-emerald-700' : 'text-purple-700'}`}>
                                        {isAvailable ? t('legacy.Yes') : t('legacy.No')}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <BrandingFooter onCallDeveloper={() => handleDirectDial('917218838122')} />
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 3: PERSONS DIRECTORY */}
          {activeTab === 'persons' && (
            <div className="space-y-3">
              {/* Status Capsule Filter Bar */}
              <div className="bg-white p-2 rounded-xl border border-sand/50 shadow-sm flex items-center space-x-1.5 overflow-x-auto hide-scrollbar">
                {['ALL', 'Lost', 'Holding', 'Gifted', 'Returned'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPersonStatusFilter(st)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all tracking-wide flex-none ${
                      personStatusFilter === st
                        ? 'bg-forest text-alabaster shadow-xs scale-102'
                        : 'bg-alabaster text-stone-600 hover:bg-sand/30 border border-sand/40'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div id="persons-table-export" className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden mb-4">
                <div className="flex justify-between items-center px-3 py-2.5 bg-stone-100 border-b border-sand/40">
                  <h2 className="text-xs font-black uppercase tracking-wider text-forest">{t('legacy.Readers summary')}</h2>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleExportPdf('persons-table-export', 'Readers_Summary.pdf', t('export.readers'))} className="text-stone-500 hover:text-forest p-1.5 rounded active:scale-90" title={t('legacy.Export Summary PDF')}>
                      <i className="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                    <button onClick={() => setPersonModal({ isNew: true, person: {} })} className="no-print px-2.5 py-1 bg-forest text-white text-[10px] font-bold rounded-lg flex items-center space-x-1 active:scale-95 shadow-xs">
                      <i className="fa-solid fa-user-plus text-[9px]"></i><span>{t('legacy.Add Reader')}</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2 w-[55%]">{t('legacy.Reader Name')}</th>
                        <th className="px-2 py-2 text-center w-[25%]">{t('legacy.Books')}</th>
                        <th className="px-2 py-2 text-right no-print w-[20%]">{t('legacy.Action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                      {(() => {
                        const q = searchQuery.toLowerCase().trim();
                        const visiblePersons = (appData.people || []).filter((p) => {
                          const allRecs = p.records || [];
                          const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.phone || '').includes(q) || allRecs.some(r => (r.title || '').toLowerCase().includes(q));
                          if (!matchesQ) return false;
                          if (personStatusFilter === 'ALL') return true;
                          return allRecs.some(r => String(r.personStatus || '').toUpperCase() === personStatusFilter.toUpperCase());
                        });

                        if (visiblePersons.length === 0) {
                          return (
                            <tr>
                              <td colSpan="3" className="text-center py-8 text-stone-400 text-xs">
                                {t('legacy.No reader records found for this status filter.')}
                              </td>
                            </tr>
                          );
                        }

                        return visiblePersons.map((p) => {
                          const totalBooksCount = (p.records || []).length;
                          const holdingCount = (p.records || []).filter(r => String(r.personStatus || '').toUpperCase() === 'HOLDING').length;

                          return (
                            <tr key={p.name} className="hover:bg-sand/10 transition-colors">
                              <td className="px-3 py-2.5 cursor-pointer" onClick={() => { setSelectedPerson(p); setActiveTab('personDetail'); }}>
                                <p className="font-extrabold text-xs text-charcoal truncate">{p.name}</p>
                                <p className="text-[9px] text-stone-500 truncate">{p.phone || t('legacy.No mobile')} • {p.address || t('legacy.No address')}</p>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${holdingCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-700'}`}>
                                  {t(totalBooksCount === 1 ? 'counts.book' : 'counts.books', { count: formatKpiNumber(totalBooksCount) })}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-right no-print">
                                <div className="flex items-center justify-end space-x-1.5">
                                  {p.phone && (
                                    <button onClick={() => handleDirectDial(p.phone)} className="w-7 h-7 flex items-center justify-center text-emerald-700 text-xs active:scale-90" title={t('legacy.Call')}>
                                      <i className="fa-solid fa-phone"></i>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setPersonModal({ isNew: false, person: p })}
                                    className="w-7 h-7 flex items-center justify-center text-forest text-xs active:scale-90"
                                    title={t('legacy.Edit reader profile')}
                                  >
                                    <i className="fa-solid fa-pen"></i>
                                  </button>
                                  <button
                                    onClick={() => { if (window.confirm(t('reader.deleteConfirm', { name: p.name }))) google.script.run.withSuccessHandler(payload => { if (payload) setAppData(payload); triggerStatus(t('reader.deleted'), true); }).withFailureHandler(err => triggerStatus(t('reader.deleteFailed', { error: err?.message }), false)).deletePerson(p.name); }}
                                    className="w-7 h-7 flex items-center justify-center text-rose-700 text-xs active:scale-90"
                                    title={t('legacy.Delete reader')}
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                  <button
                                    onClick={() => { setSelectedPerson(p); setActiveTab('personDetail'); }}
                                    className="w-7 h-7 flex items-center justify-center text-forest text-xs active:scale-90"
                                    title={t('legacy.View Reader Ledger')}
                                  >
                                    <i className="fa-solid fa-eye"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <BrandingFooter onCallDeveloper={() => handleDirectDial('917218838122')} />
            </div>
          )}

          {/* TAB 5: DEDICATED INDIVIDUAL PERSON PAGE */}
          {activeTab === 'personDetail' && selectedPerson && (
            <IndividualPersonPage
              person={(appData.people || []).find(p => p.name === selectedPerson.name) || selectedPerson}
              allBooks={appData.books}
              onBack={() => setActiveTab('persons')}
              onOpenBookJourney={(book) => { setSelectedBook(book); setActiveTab('bookDetail'); }}
              onEditBook={(book) => setBookModal({ isNew: false, book })}
              onSendReminder={(book, sendAll) => {
                const currentP = (appData.people || []).find(p => p.name === selectedPerson.name) || selectedPerson;
                if (sendAll) {
                  handleSendAllHoldingWhatsAppReminder(currentP);
                } else {
                  handleSendWhatsAppReminder(currentP.name, book);
                }
              }}
              onDirectDial={() => handleDirectDial(selectedPerson.phone)}
              onExportPdf={() => handleExportPdf('individual-person-report', `${selectedPerson.name}_Statement.pdf`, t('export.statement', { name: selectedPerson.name }))}
              onCallDeveloper={() => handleDirectDial('917218838122')}
            />
          )}

          {/* TAB 7: DEDICATED TAG VIEW (AUTHOR OR CATEGORY CONSOLIDATED MATCHING) */}
          {activeTab === 'tagView' && selectedTag && (
            <div className="space-y-3">
              <div className="no-print py-1 flex items-center justify-between">
                <button
                  onClick={() => { setActiveTab('books'); setSelectedTag(null); }}
                  className="text-xs font-black uppercase tracking-wider text-forest flex items-center space-x-1.5 active:opacity-70 transition-opacity"
                >
                  <i className="fa-solid fa-arrow-left text-sm"></i>
                  <span>{t('legacy.Back to Collections')}</span>
                </button>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-forest text-alabaster border border-white/20">
                  {selectedTag.type === 'author' ? t('legacy.Author') : t('legacy.Category')}: {selectedTag.value}
                </span>
              </div>

              <div id="tag-books-table-export" className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden mb-4">
                <div className="flex justify-between items-center px-3 py-2 bg-stone-100 border-b border-sand/40">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-forest">
                      {selectedTag.value}
                    </h2>
                    <p className="text-[9px] text-stone-500">
                      {selectedTag.type === 'author' ? t('legacy.Books written by this author') : t('legacy.Books categorized under this genre')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExportPdf('tag-books-table-export', `${selectedTag.value.replace(/\s+/g, '_')}_Books.pdf`, t('export.books', { name: selectedTag.value }))}
                      className="text-stone-500 hover:text-forest p-1 rounded active:scale-90"
                      title={t('legacy.Export Table as PDF')}
                    >
                      <i className="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-2 w-[44%]">{t('legacy.Title & Details')}</th>
                        <th className="px-1.5 py-2 w-[19%]">{t('legacy.Initial Status')}</th>
                        <th className="px-1.5 py-2 w-[19%]">{t('legacy.Cur. Status')}</th>
                        <th className="px-2 py-2 w-[18%]">{t('legacy.Location')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                      {(() => {
                        const tagBooks = (appData.books || []).filter(b =>
                          String(b[selectedTag.type] || '').trim().toLowerCase() === String(selectedTag.value).trim().toLowerCase()
                        );
                        if (tagBooks.length === 0) {
                          return <tr><td colSpan="4" className="text-center py-8 text-stone-400 text-xs">No matching books for this {selectedTag.type}.</td></tr>;
                        }
                        return tagBooks.map(b => (
                          <tr
                            key={b.id}
                            className="hover:bg-sand/15 transition-colors cursor-pointer active:bg-sand/25"
                            onClick={() => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                            title={t('legacy.Click to view Book Journey')}
                          >
                            <td className="px-2.5 py-2">
                              <div className="flex items-center space-x-1 truncate">
                                <button
                                  onClick={(e) => handleCopyTitle(b.title, e)}
                                  className="text-stone-400 hover:text-forest active:scale-90 p-0.5 flex-none"
                                  title={t('legacy.Copy Title')}
                                >
                                  <i className="fa-regular fa-copy text-[9px]"></i>
                                </button>
                                <span className="font-extrabold text-[11px] truncate text-charcoal">{b.title}</span>
                              </div>
                              <p className="text-[9px] text-stone-500 truncate flex items-center space-x-1">
                                <button
                                  data-pdf-text
                                  onClick={(e) => handleOpenTagView('author', b.author, e)}
                                  className="hover:underline hover:text-forest truncate text-left"
                                >
                                  {b.author || t('legacy.Unknown')}
                                </button>
                                <span>•</span>
                                <button
                                  data-pdf-text
                                  onClick={(e) => handleOpenTagView('category', b.category, e)}
                                  className="text-forest font-bold hover:underline hover:text-ochre"
                                >
                                  {b.category || t('legacy.General')}
                                </button>
                              </p>
                            </td>
                            <td className="px-1.5 py-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setBookModal({ isNew: false, book: b }); }}>
                              <p className="font-semibold text-stone-700 truncate hover:text-ochre">{b.initialStatus || '-'}</p>
                              <p className="text-[8.5px] text-stone-500 font-medium">{formatDisplayDate(b.bookInDate)}</p>
                            </td>
                            <td className="px-1.5 py-2" onClick={(e) => { e.stopPropagation(); setStatusModal({ book: b }); }}>
                              <span className={`text-[8.5px] uppercase tracking-wide leading-tight hover:underline ${getStatusBadgeStyle(b.currentStatus)}`}>
                                {displayStatus(b.currentStatus)}
                              </span>
                              <p className="text-[8.5px] text-stone-500 font-medium">{formatDisplayDate(b.eventDate)}</p>
                            </td>
                            <td className="px-2 py-2 text-[10px]">
                              <span className="font-bold text-stone-700 truncate block">{b.location}</span>
                              {b.person && <p className="text-[8px] text-forest truncate">@{b.person}</p>}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
              <BrandingFooter onCallDeveloper={() => handleDirectDial('917218838122')} />
            </div>
          )}

          {/* TAB 6: DEDICATED SINGLE BOOK JOURNEY & LIFECYCLE TIMELINE PAGE */}
          {activeTab === 'bookDetail' && selectedBook && (
            <BookJourneyPage
              book={(appData.books || []).find(b => b.id === selectedBook.id) || selectedBook}
              onBack={() => setActiveTab('books')}
              onEditDetails={() => setBookModal({ isNew: false, book: (appData.books || []).find(b => b.id === selectedBook.id) || selectedBook })}
              onEditStatus={() => setStatusModal({ book: (appData.books || []).find(b => b.id === selectedBook.id) || selectedBook })}
              onNavigateToPerson={(personName) => {
                const foundP = (appData.people || []).find(p => String(p.name || '').toLowerCase() === String(personName || '').toLowerCase());
                if (foundP) {
                  setSelectedPerson(foundP);
                  setActiveTab('personDetail');
                } else {
                  alert('Reader profile not found for ' + personName);
                }
              }}
              onExportPdf={() => handleExportPdf('book-journey-report', `${selectedBook.title.replace(/\s+/g, '_')}_Journey.pdf`, t('export.journey', { name: selectedBook.title }))}
              onCallDeveloper={() => handleDirectDial('917218838122')}
              onCopyTitle={handleCopyTitle}
              onOpenTag={handleOpenTagView}
            />
          )}
        </div>
      </div>

      {/* DARK BOTTOM NAVIGATION BAR WITH ENLARGED CENTER PLUS FAB */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-forest text-alabaster h-[64px] flex items-center justify-around z-40 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.25)]">
        {/* Helper style object for the dark-to-white gradient icon */}
        {(() => {
          const activeIconGradient = {
            background: 'linear-gradient(180deg, #FFFFFF 0%, #38D0C9 40%, #047372 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))'
          };

          return (
            <>
              <button
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  activeTab === 'home' ? 'scale-110' : 'hover:opacity-100 opacity-70'
                }`}
              >
                <i
                  className="fa-solid fa-house text-xl"
                  style={activeTab === 'home' ? activeIconGradient : { color: '#D4C1A3' }}
                ></i>
                <span className={`text-[9px] mt-0.5 tracking-wide ${activeTab === 'home' ? 'text-white font-black' : 'text-sand/80 font-medium'}`}>
                  {t('legacy.Home')}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('books')}
                className={`flex flex-col items-center justify-center flex-1 mr-4 py-1 transition-all ${
                  activeTab === 'books' ? 'scale-110' : 'hover:opacity-100 opacity-70'
                }`}
              >
                <i
                  className="fa-solid fa-book-bookmark text-xl"
                  style={activeTab === 'books' ? activeIconGradient : { color: '#D4C1A3' }}
                ></i>
                <span className={`text-[9px] mt-0.5 tracking-wide ${activeTab === 'books' ? 'text-white font-black' : 'text-sand/80 font-medium'}`}>
                  {t('legacy.Books')}
                </span>
              </button>

              {/* OVERLAPPING LARGE FLOATING '+' BUTTON WITH GRADIENT FILL & NO RING */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button
                  onClick={() => setBookModal({ isNew: true, book: {} })}
                  className="w-[62px] h-[62px] rounded-full text-white shadow-xl border-[4px] border-[#F4F1EA] flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #047372 0%, #38D0C9 100%)' }}
                  title={t('legacy.New Entry')}
                >
                  <i className="fa-solid fa-plus text-2xl font-black drop-shadow-sm"></i>
                </button>
              </div>

              <button
                onClick={() => setActiveTab('persons')}
                className={`flex flex-col items-center justify-center flex-1 ml-4 py-1 transition-all ${
                  (activeTab === 'persons' || activeTab === 'personDetail') ? 'scale-110' : 'hover:opacity-100 opacity-70'
                }`}
              >
                <i
                  className="fa-solid fa-users text-xl"
                  style={(activeTab === 'persons' || activeTab === 'personDetail') ? activeIconGradient : { color: '#D4C1A3' }}
                ></i>
                <span className={`text-[9px] mt-0.5 tracking-wide ${(activeTab === 'persons' || activeTab === 'personDetail') ? 'text-white font-black' : 'text-sand/80 font-medium'}`}>
                  {t('legacy.Persons')}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('wishlist')}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                  activeTab === 'wishlist' ? 'scale-110' : 'hover:opacity-100 opacity-70'
                }`}
              >
                <i
                  className="fa-solid fa-bookmark text-xl"
                  style={activeTab === 'wishlist' ? activeIconGradient : { color: '#D4C1A3' }}
                ></i>
                <span className={`text-[9px] mt-0.5 tracking-wide ${activeTab === 'wishlist' ? 'text-white font-black' : 'text-sand/80 font-medium'}`}>
                  {t('legacy.Wishlist')}
                </span>
              </button>
            </>
          );
        })()}
      </nav>

      {/* MID-CENTER MODALS WITH EXPLICIT FEEDBACK */}
      {bookModal && (
        <BookDetailsModal
          isNew={bookModal.isNew}
          initial={bookModal.book}
          config={appData.config}
          onClose={() => setBookModal(null)}
          onSuccess={(payload) => {
            setBookModal(null);
            if (payload) setAppData(payload);
            else fetchData(true);
            triggerStatus(bookModal.isNew ? 'New book added!' : 'Book details saved!', true);
          }}
        />
      )}
      {statusModal && (
        <StatusUpdateModal
          book={statusModal.book}
          people={appData.people}
          onAddReader={() => setPersonModal({ isNew: true, person: {} })}
          onClose={() => setStatusModal(null)}
          onSuccess={(payload) => {
            setStatusModal(null);
            if (payload) setAppData(payload);
            else fetchData(true);
            triggerStatus('Status & custody updated!', true);
          }}
        />
      )}
      {personModal && (
        <PersonFormModal
          isNew={personModal.isNew}
          initial={personModal.person}
          onClose={() => setPersonModal(null)}
          onSuccess={(payload) => {
            setPersonModal(null);
            if (payload) setAppData(payload);
            else fetchData(true);
            triggerStatus(personModal.isNew ? 'Reader added!' : 'Reader updated!', true);
          }}
        />
      )}
      {adminConfigModal && (
        <AdminConfigModal
          type={adminConfigModal.type}
          config={appData.config}
          onClose={() => setAdminConfigModal(null)}
          onSuccess={(payload) => {
            setAdminConfigModal(null);
            if (payload) setAppData(payload);
            else fetchData(true);
            triggerStatus('Configuration saved!', true);
          }}
        />
      )}

      {wishlistModal && (
        <WishlistFormModal
          isNew={wishlistModal.isNew}
          initial={wishlistModal.item}
          config={appData.config}
          onClose={() => setWishlistModal(null)}
          onSuccess={(payload) => {
            setWishlistModal(null);
            if (payload) setAppData(payload);
            else fetchData(true);
            triggerStatus(wishlistModal.isNew ? 'Wishlist book added!' : 'Wishlist item updated!', true);
          }}
        />
      )}

      {syncModal && (
        <SyncSettingsModal
          onClose={() => setSyncModal(false)}
          onSuccess={(payload) => {
            setSyncModal(false);
            if (payload) setAppData(payload);
            triggerStatus('Google Sheet connected!', true);
          }}
        />
      )}

      {/* Styled In-App Restore Confirmation Modal */}
      {restoreConfirmFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-2xl border border-sand/40 space-y-3">
            <div className="flex items-center space-x-2.5 text-rose-700">
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
              <h3 className="text-sm font-black uppercase tracking-wide">{t('legacy.Restore Database')}</h3>
            </div>
            <p className="text-xs text-charcoal font-medium">
              {t('legacy.Restoring')} <b>{restoreConfirmFile.name}</b> will replace this phone’s books, reader records, configuration, and wishlist data.
            </p>
            <p className="text-[11px] text-stone-500 italic">
              {t('legacy.Are you sure you want to proceed with this restore operation?')}
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => { setRestoreConfirmFile(null); if (backupFileInputRef.current) backupFileInputRef.current.value = ''; }}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-200 active:scale-95"
              >
                {t('legacy.Cancel')}
              </button>
              <button
                onClick={executeRestore}
                className="px-4 py-1.5 bg-rose-700 text-white text-xs font-black rounded-lg hover:bg-rose-800 active:scale-95 shadow-sm"
              >
                {t('legacy.Yes, Restore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
