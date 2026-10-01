import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { App as CapApp } from '@capacitor/app';
import brandIcon from './assets/brand-icon.png?inline';
import { isNative } from './native/storage';
import { isConfigured } from './native/config';
import { saveAndShareBlob, isShareCancel } from './native/files';
import { formatDisplayDate, getStatusBadgeStyle, displayStatus, EMPTY_INITIAL_DATA } from './utils';

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
  const [appData, setAppData] = useState(EMPTY_INITIAL_DATA);
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
      return saveAndShareBlob(blob, fileName, 'Share PDF').then(() => {
        triggerStatus('PDF Exported', true);
      });
    }).catch((err) => {
      if (isShareCancel(err)) { triggerStatus('PDF Exported', true); return; }
      triggerStatus('Export failed: ' + (err && err.message), false);
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
            triggerStatus(res.offline ? 'Offline: showing saved data' : 'Data loaded', true);
          } else {
            triggerStatus('Failed to load data', false);
          }
        })
        .withFailureHandler(err => {
          triggerStatus('Sync error: ' + (err.message || 'Check connection'), false);
        })
        .getLibraryPayload(force);
    } else {
      setTimeout(() => triggerStatus('Data loaded', true), 600);
    }
  };

  useEffect(() => {
    // First launch: ask for Sheet link before the first fetch
    isConfigured().then((ok) => {
      if (ok) fetchData(false);
      else { setSyncModal(true); triggerStatus('Sync error: set up Google Sheet link', false); }
    });
  }, []);

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
    window.open(waUrl, '_blank');
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

    let msg = `Hi ${personObj.name},\nThis is a gentle reminder regarding the books borrowed from my library:\n`;
    holdingBooks.forEach((b, idx) => {
      msg += `${idx + 1}. "${b.title}" (Due: ${formatDisplayDate(b.promiseReturnDate) || returnDue})\n`;
    });
    msg += `Please return them by ${returnDue}. Thank you!`;

    const waUrl = phone
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleExportPdf = (elementId, fileName, customReportTitle) => {
    const sourceEl = document.getElementById(elementId);
    if (!sourceEl) return;
    triggerStatus('Formatting PDF...', false);

    const clone = sourceEl.cloneNode(true);
    clone.querySelectorAll('button, .no-print, input, select, .fa-pencil, .fa-share-nodes, th:last-child, td:last-child, footer').forEach(n => n.remove());

    const container = document.createElement('div');
    container.style.padding = '20px';
    container.style.backgroundColor = '#FFFFFF';
    container.style.color = '#111827';
    container.style.fontFamily = 'sans-serif';

    const titleText = customReportTitle || 'LIBRARY STATEMENT REPORT';
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="border-bottom: 2px solid #1E3535; padding-bottom: 8px; margin-bottom: 16px;">
        <h2 style="font-size: 15px; font-weight: 800; color: #1E3535; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${titleText}</h2>
        <p style="font-size: 10px; color: #6B7280; margin: 3px 0 0 0;">Statement Date: ${formatDisplayDate(new Date())}</p>
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `
      <div style="border-top: 1px solid #E5E7EB; margin-top: 20px; padding-top: 8px; text-align: center; font-size: 9px; font-weight: bold; color: #6B7280;">
        <img src="${brandIcon}" style="width:22px;height:22px;border-radius:5px;vertical-align:middle;margin-right:6px;" />
        <span style="vertical-align:middle;">B-wise Library • Developed by - Bharat Rasve © 2026</span>
      </div>
    `;

    container.appendChild(header);
    container.appendChild(clone);
    container.appendChild(footer);

    const opt = {
      margin: [0.4, 0.4, 0.5, 0.4],
      filename: fileName || 'Library_Report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const worker = html2pdf().set(opt).from(container);
    downloadPdfBlob(worker, fileName || 'Library_Report.pdf');
  };

  const handleExportFullBackup = () => {
    setDrawerOpen(false);
    triggerStatus('Generating backup...', false);
    if (window.google && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler((csvString) => {
          const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
          const fileName = `Library_Backup_${new Date().toISOString().split('T')[0]}.csv`;
          saveAndShareBlob(blob, fileName, 'Save backup')
            .then(() => triggerStatus('Backup exported!', true))
            .catch((err) => {
              if (isShareCancel(err)) triggerStatus('Backup exported!', true);
              else triggerStatus('Backup failed: ' + (err && err.message), false);
            });
        })
        .withFailureHandler((err) => triggerStatus('Backup failed: ' + err.message, false))
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

  return (
    <div className="min-h-screen max-w-xl mx-auto flex flex-col justify-between relative shadow-2xl bg-alabaster m-0 p-0 border-0 overflow-x-hidden">

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
        onClose={() => setDrawerOpen(false)}
        onOpenPersonManage={() => { setDrawerOpen(false); setActiveTab('persons'); }}
        onAddPerson={() => { setDrawerOpen(false); setPersonModal({ isNew: true, person: {} }); }}
        onAddCategory={() => { setDrawerOpen(false); setAdminConfigModal({ type: 'Category' }); }}
        onAddLocation={() => { setDrawerOpen(false); setAdminConfigModal({ type: 'Location' }); }}
        onAddStatus={() => { setDrawerOpen(false); setAdminConfigModal({ type: 'Current_Status' }); }}
        onExportBackup={handleExportFullBackup}
        onRestoreClick={() => backupFileInputRef.current.click()}
        onSyncSettings={() => { setDrawerOpen(false); setSyncModal(true); }}
        onCallDeveloper={() => handleDirectDial('917218838122')}
      />
      <input type="file" accept=".csv" ref={backupFileInputRef} onChange={handleImportBackupFile} className="hidden" />

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
                placeholder="Search title, author, reader, genre, location..."
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
                    return <div className="p-2.5 text-center text-[10px] text-stone-400">No matching books or readers</div>;
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
            <button onClick={() => fetchData(true)} className="p-2 text-white hover:opacity-80 active:scale-95 transition-all text-sm" title="Sync Google Sheet">
              <i className={`fa-solid fa-rotate ${loadingState.visible && !loadingState.isSuccess ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={() => setDrawerOpen(true)} className="p-2 text-white hover:opacity-80 active:scale-95 transition-all text-base" title="Open Menu">
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        </header>

        {/* DARK GRADIENT TOP KPI CARD (Dynamic Titles per Active Screen) */}
        {activeTab !== 'personDetail' && activeTab !== 'bookDetail' && (
          <div
            className="mt-3 mx-3.5 shadow-[0_4px_16px_rgba(4,115,114,0.35)] border border-white/15 rounded-2xl grid grid-cols-5 divide-x divide-white/10 text-center py-3 text-white flex-none"
            style={{ background: 'linear-gradient(to right, #033636 0%, #047372 45%, #0e4e4e 75%, #052626 100%)' }}
          >
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-white/80">
                {activeTab === 'persons' ? 'All Books' : 'Books'}
              </p>
              <p className="text-base font-black text-amber-200 mt-0.5">{currentKpis.all || 0}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-white/80">
                {activeTab === 'persons' ? 'Returned' : 'With Me'}
              </p>
              <p className="text-base font-black text-emerald-300 mt-0.5">{currentKpis.withMe || 0}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-white/80">
                {activeTab === 'persons' ? 'Holding' : 'Out'}
              </p>
              <p className="text-base font-black text-orange-300 mt-0.5">{currentKpis.lent || 0}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-white/80">
                {activeTab === 'wishlist' ? 'To Get' : (activeTab === 'persons' ? 'Gifted' : 'Wishlist')}
              </p>
              <p className="text-base font-black text-purple-300 mt-0.5">{currentKpis.wishlisted || 0}</p>
            </div>
            <div className="px-1">
              <p className="text-[9px] uppercase font-bold tracking-widest text-white/80">Worth</p>
              <p className="text-sm font-black text-sand mt-0.5 truncate">₹{(currentKpis.totalWorth || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}

        <div className="flex-1 px-3.5 pt-4">

          {/* FILTER BAR APPLIES ACROSS HOME & BOOKS */}
          {(activeTab === 'home' || activeTab === 'books') && (
            <div className="bg-white p-2.5 rounded-xl border border-sand/50 shadow-sm space-y-2 mb-4">
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">Status: All</option>
                  {((appData.config && appData.config.currentStatuses) || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">Category: All</option>
                  {((appData.config && appData.config.categories) || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">Language: All</option>
                  {(filterOptions.languages || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold items-center">
                <select value={filterAuthor} onChange={e => setFilterAuthor(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">Author: All</option>
                  {(filterOptions.authors || []).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">Person: All</option>
                  {(appData.people || []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="bg-alabaster border border-sand/60 rounded p-1.5 text-charcoal outline-none">
                  <option value="ALL">Location: All</option>
                  {((appData.config && appData.config.locations) || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <div className="flex justify-end">
                  <button
                    onClick={handleResetFilters}
                    className="w-full bg-sand/30 text-forest rounded py-1 px-2 uppercase text-[9px] font-extrabold flex items-center justify-center space-x-1 hover:bg-sand/50 active:scale-95 transition-all shadow-xs"
                    title="Reset all filters"
                  >
                    <i className="fa-solid fa-arrow-rotate-left text-[8px]"></i>
                    <span>Reset</span>
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
                title="Status-Wise Summary"
                badge="Status"
                rows={filteredBooks.filter(b => b.currentStatus !== 'WISHLISTED')}
                onRowClick={b => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                onShare={() => handleExportPdf('st-1', 'Status_Summary.pdf', 'STATUS-WISE BOOKS SUMMARY')}
                onCopyTitle={handleCopyTitle}
                onOpenTag={handleOpenTagView}
              />

              <SummaryTableCard
                id="st-2"
                title="Active Lent / Borrowed"
                badge="Person"
                rows={filteredBooks.filter(b => b.person && (b.currentStatus === 'LENT' || (b.location || '').toUpperCase() === 'TO PERSON'))}
                onRowClick={b => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                onShare={() => handleExportPdf('st-2', 'Lent_Summary.pdf', 'ACTIVE LENT SUMMARY')}
                onCopyTitle={handleCopyTitle}
                onOpenTag={handleOpenTagView}
              />

              <SummaryTableCard
                id="st-3"
                title="Location Distribution"
                badge="Location"
                rows={filteredBooks.filter(b => b.location)}
                onRowClick={b => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                onShare={() => handleExportPdf('st-3', 'Location_Summary.pdf', 'LOCATION DISTRIBUTION SUMMARY')}
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-forest">Books Collections</span>
                  <div className="flex items-center space-x-3 text-stone-500">
                    <span className="text-[9px] font-bold">{filteredBooks.length} books</span>
                    <button onClick={() => handleExportPdf('books-table-export', 'Books_Collections.pdf', 'BOOKS COLLECTIONS DIRECTORY')} className="hover:text-forest" title="Export Table as PDF">
                      <i className="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-2 w-[44%]">Title & Author</th>
                        <th className="px-1.5 py-2 w-[19%]">Initial Status</th>
                        <th className="px-1.5 py-2 w-[19%]">Cur. status</th>
                        <th className="px-2 py-2 w-[18%]">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                      {filteredBooks.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-8 text-stone-400 text-xs">No matching records</td></tr>
                      ) : (
                        filteredBooks.map((b) => (
                          <tr
                            key={b.id}
                            className="hover:bg-sand/15 transition-colors cursor-pointer active:bg-sand/25"
                            onClick={() => { setSelectedBook(b); setActiveTab('bookDetail'); }}
                            title="Click to view Book Journey"
                          >
                            <td className="px-2.5 py-2">
                              <div className="flex items-center space-x-1 truncate">
                                <button
                                  onClick={(e) => handleCopyTitle(b.title, e)}
                                  className="text-stone-400 hover:text-forest active:scale-90 p-0.5 flex-none"
                                  title="Copy Title"
                                >
                                  <i className="fa-regular fa-copy text-[9px]"></i>
                                </button>
                                <span className="font-extrabold text-[11px] truncate text-charcoal">{b.title}</span>
                              </div>
                              <p className="text-[9px] text-stone-500 truncate flex items-center space-x-1">
                                <button
                                  onClick={(e) => handleOpenTagView('author', b.author, e)}
                                  className="hover:underline hover:text-forest truncate text-left"
                                  title={`Filter author: ${b.author}`}
                                >
                                  {b.author || 'Unknown'}
                                </button>
                                <span>•</span>
                                <button
                                  onClick={(e) => handleOpenTagView('category', b.category, e)}
                                  className="text-forest font-bold hover:underline hover:text-ochre"
                                  title={`Filter category: ${b.category}`}
                                >
                                  {b.category || 'General'}
                                </button>
                              </p>
                            </td>
                            <td className="px-1.5 py-2 text-[10px]" onClick={(e) => { e.stopPropagation(); setBookModal({ isNew: false, book: b }); }} title="Edit Book Details">
                              <p className="font-semibold text-stone-700 truncate hover:text-ochre">{b.initialStatus || '-'}</p>
                              <p className="text-[8.5px] text-stone-500 font-medium">{formatDisplayDate(b.bookInDate)}</p>
                            </td>
                            <td className="px-1.5 py-2" onClick={(e) => { e.stopPropagation(); setStatusModal({ book: b }); }} title="Edit Status / Lending">
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
                        ALL ({allCombinedWishlist.length})
                      </button>
                      <button
                        onClick={() => setWishlistFilter('NOT_IN_POSSESSION')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all tracking-wide flex-none ${
                          wishlistFilter === 'NOT_IN_POSSESSION'
                            ? 'bg-purple-900 text-white shadow-xs scale-102'
                            : 'bg-alabaster text-stone-600 hover:bg-sand/30 border border-sand/40'
                        }`}
                      >
                        Not In Possession ({notInPossessionCount})
                      </button>
                      <button
                        onClick={() => setWishlistFilter('IN_POSSESSION')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all tracking-wide flex-none ${
                          wishlistFilter === 'IN_POSSESSION'
                            ? 'bg-emerald-800 text-white shadow-xs scale-102'
                            : 'bg-alabaster text-stone-600 hover:bg-sand/30 border border-sand/40'
                        }`}
                      >
                        In Possession ({inPossessionCount})
                      </button>
                    </div>

                    <div id="wishlist-table-export" className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden">
                      <div className="flex justify-between items-center px-3 py-2.5 bg-stone-100 border-b border-sand/40">
                        <div>
                          <h2 className="text-xs font-black uppercase tracking-wider text-forest">My Books Wishlist</h2>
                        </div>
                        <div className="flex items-center space-x-2 text-stone-500">
                          <button
                            onClick={() => setWishlistModal({ isNew: true, item: {} })}
                            className="no-print px-2.5 py-1 bg-forest text-white text-[10px] font-black rounded-lg flex items-center space-x-1 active:scale-95 shadow-xs"
                            title="Add Book to Wishlist"
                          >
                            <i className="fa-solid fa-plus text-[9px]"></i><span>Add Wishlist</span>
                          </button>
                          <button onClick={() => handleExportPdf('wishlist-table-export', 'My_Books_Wishlist.pdf', 'MY BOOKS WISHLIST')} className="hover:text-forest p-1" title="Export Wishlist PDF">
                            <i className="fa-solid fa-share-nodes text-xs"></i>
                          </button>
                        </div>
                      </div>

                      <div className="overflow-hidden">
                        <table className="w-full text-left text-[11px] table-fixed">
                          <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                            <tr>
                              <th className="px-3 py-2 w-[52%]">Book Title & Author</th>
                              <th className="px-2 py-2 w-[30%]">Genre & Lang</th>
                              <th className="px-2 py-2 text-right w-[18%]">Available</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                            {filteredWishlist.length === 0 ? (
                              <tr><td colSpan="3" className="text-center py-8 text-stone-400 text-xs">No books in this view.</td></tr>
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
                                          title="Copy Title"
                                        >
                                          <i className="fa-regular fa-copy text-[9px]"></i>
                                        </button>
                                        <span className="font-extrabold text-[11px] truncate text-charcoal">{w.title}</span>
                                      </div>
                                      <p className="text-[9px] text-stone-500 truncate">
                                        <button
                                          onClick={(e) => handleOpenTagView('author', w.author, e)}
                                          className="hover:underline hover:text-forest truncate"
                                          title={`Filter author: ${w.author}`}
                                        >
                                          {w.author || 'Unknown'}
                                        </button>
                                      </p>
                                    </td>
                                    <td className="px-2 py-2 text-[10px]">
                                      <button
                                        onClick={(e) => handleOpenTagView('category', w.category, e)}
                                        className="font-bold text-forest block truncate max-w-fit hover:underline hover:text-ochre"
                                        title={`Filter category: ${w.category}`}
                                      >
                                        {w.category || 'General'}
                                      </button>
                                      <span className="text-[9px] text-stone-500 mt-0.5 block truncate">{w.language || 'English'}</span>
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      <span className={`text-[9.5px] font-black uppercase tracking-wider ${isAvailable ? 'text-emerald-700' : 'text-purple-700'}`}>
                                        {isAvailable ? 'Yes' : 'No'}
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
                  <h2 className="text-xs font-black uppercase tracking-wider text-forest">Readers summary</h2>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleExportPdf('persons-table-export', 'Readers_Summary.pdf', 'READERS SUMMARY REPORT')} className="text-stone-500 hover:text-forest p-1.5 rounded active:scale-90" title="Export Summary PDF">
                      <i className="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                    <button onClick={() => setPersonModal({ isNew: true, person: {} })} className="no-print px-2.5 py-1 bg-forest text-white text-[10px] font-bold rounded-lg flex items-center space-x-1 active:scale-95 shadow-xs">
                      <i className="fa-solid fa-user-plus text-[9px]"></i><span>Add Reader</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th className="px-3 py-2 w-[55%]">Reader Name</th>
                        <th className="px-2 py-2 text-center w-[25%]">Books</th>
                        <th className="px-2 py-2 text-right no-print w-[20%]">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/30 font-medium text-charcoal">
                      {(() => {
                        const q = searchQuery.toLowerCase().trim();
                        const visiblePersons = (appData.people || []).filter((p) => {
                          const allRecs = p.records || [];
                          if (allRecs.length === 0) return false;
                          const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.phone || '').includes(q) || allRecs.some(r => (r.title || '').toLowerCase().includes(q));
                          if (!matchesQ) return false;
                          if (personStatusFilter === 'ALL') return true;
                          return allRecs.some(r => String(r.personStatus || '').toUpperCase() === personStatusFilter.toUpperCase());
                        });

                        if (visiblePersons.length === 0) {
                          return (
                            <tr>
                              <td colSpan="3" className="text-center py-8 text-stone-400 text-xs">
                                No reader records found for this status filter.
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
                                <p className="text-[9px] text-stone-500 truncate">{p.phone || 'No mobile'} • {p.address || 'No address'}</p>
                              </td>
                              <td className="px-2 py-2.5 text-center">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${holdingCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-700'}`}>
                                  {totalBooksCount} {totalBooksCount === 1 ? 'Book' : 'Books'}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-right no-print">
                                <div className="flex items-center justify-end space-x-1.5">
                                  {p.phone && (
                                    <button onClick={() => handleDirectDial(p.phone)} className="w-7 h-7 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-center text-xs active:scale-90 shadow-xs" title="Call">
                                      <i className="fa-solid fa-phone"></i>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => { setSelectedPerson(p); setActiveTab('personDetail'); }}
                                    className="w-7 h-7 bg-forest text-alabaster rounded flex items-center justify-center text-xs active:scale-90 shadow-xs"
                                    title="View Reader Ledger"
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
              onExportPdf={() => handleExportPdf('individual-person-report', `${selectedPerson.name}_Statement.pdf`, `${selectedPerson.name.toUpperCase()} - BOOKS STATEMENT`)}
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
                  <span>Back to Collections</span>
                </button>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-forest text-alabaster border border-white/20">
                  {selectedTag.type === 'author' ? 'Author' : 'Category'}: {selectedTag.value}
                </span>
              </div>

              <div id="tag-books-table-export" className="bg-white rounded-xl border border-sand/50 shadow-sm overflow-hidden mb-4">
                <div className="flex justify-between items-center px-3 py-2 bg-stone-100 border-b border-sand/40">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-forest">
                      {selectedTag.value}
                    </h2>
                    <p className="text-[9px] text-stone-500">
                      {selectedTag.type === 'author' ? 'Books written by this author' : 'Books categorized under this genre'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleExportPdf('tag-books-table-export', `${selectedTag.value.replace(/\s+/g, '_')}_Books.pdf`, `${selectedTag.value.toUpperCase()} - BOOKS REPORT`)}
                      className="text-stone-500 hover:text-forest p-1 rounded active:scale-90"
                      title="Export Table as PDF"
                    >
                      <i className="fa-solid fa-share-nodes text-xs"></i>
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-moss text-white uppercase font-bold text-[9px] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-2 w-[44%]">Title & Details</th>
                        <th className="px-1.5 py-2 w-[19%]">Initial Status</th>
                        <th className="px-1.5 py-2 w-[19%]">Cur. Status</th>
                        <th className="px-2 py-2 w-[18%]">Location</th>
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
                            title="Click to view Book Journey"
                          >
                            <td className="px-2.5 py-2">
                              <div className="flex items-center space-x-1 truncate">
                                <button
                                  onClick={(e) => handleCopyTitle(b.title, e)}
                                  className="text-stone-400 hover:text-forest active:scale-90 p-0.5 flex-none"
                                  title="Copy Title"
                                >
                                  <i className="fa-regular fa-copy text-[9px]"></i>
                                </button>
                                <span className="font-extrabold text-[11px] truncate text-charcoal">{b.title}</span>
                              </div>
                              <p className="text-[9px] text-stone-500 truncate flex items-center space-x-1">
                                <button
                                  onClick={(e) => handleOpenTagView('author', b.author, e)}
                                  className="hover:underline hover:text-forest truncate text-left"
                                >
                                  {b.author || 'Unknown'}
                                </button>
                                <span>•</span>
                                <button
                                  onClick={(e) => handleOpenTagView('category', b.category, e)}
                                  className="text-forest font-bold hover:underline hover:text-ochre"
                                >
                                  {b.category || 'General'}
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
              onExportPdf={() => handleExportPdf('book-journey-report', `${selectedBook.title.replace(/\s+/g, '_')}_Journey.pdf`, `${selectedBook.title.toUpperCase()} - BOOK JOURNEY`)}
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
                  Home
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
                  Books
                </span>
              </button>

              {/* OVERLAPPING LARGE FLOATING '+' BUTTON WITH GRADIENT FILL & NO RING */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button
                  onClick={() => setBookModal({ isNew: true, book: {} })}
                  className="w-[62px] h-[62px] rounded-full text-white shadow-xl border-[4px] border-[#F4F1EA] flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #047372 0%, #38D0C9 100%)' }}
                  title="New Entry"
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
                  Persons
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
                  Wishlist
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
              <h3 className="text-sm font-black uppercase tracking-wide">Restore Database</h3>
            </div>
            <p className="text-xs text-charcoal font-medium">
              Restoring <b>{restoreConfirmFile.name}</b> will overwrite existing books, reader records, and wishlist sheets.
            </p>
            <p className="text-[11px] text-stone-500 italic">
              Are you sure you want to proceed with this restore operation?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => { setRestoreConfirmFile(null); if (backupFileInputRef.current) backupFileInputRef.current.value = ''; }}
                className="px-3 py-1.5 bg-stone-100 text-stone-700 text-xs font-bold rounded-lg hover:bg-stone-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={executeRestore}
                className="px-4 py-1.5 bg-rose-700 text-white text-xs font-black rounded-lg hover:bg-rose-800 active:scale-95 shadow-sm"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
