// Standardized Short Date Formatter: dd-mmm-0yy (e.g., 10-aug-026)
export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  if (isNaN(d.getTime())) {
    const m = String(dateStr).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const day = String(m[1]).padStart(2, '0');
      const monthIdx = parseInt(m[2], 10) - 1;
      const yr = m[3].length === 4 ? '0' + m[3].slice(-2) : m[3];
      return `${day}-${months[monthIdx] || m[2]}-${yr}`;
    }
    return String(dateStr);
  }
  const yr = String(d.getFullYear());
  const yrShort = yr.length === 4 ? '0' + yr.slice(-2) : yr;
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${yrShort}`;
};

// User-Friendly Terminology: LENT -> OUT, DONE -> FINISHED
export const displayStatus = (st) => {
  const u = String(st || '').toUpperCase();
  if (u === 'DONE') return 'FINISHED';
  if (u === 'LENT') return 'OUT';
  return u;
};

// Days Since Borrowed Calculation
export const calculateDaysSince = (dateStr) => {
  if (!dateStr) return '-';
  const start = new Date(dateStr);
  if (isNaN(start.getTime())) return '-';
  const days = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 3600 * 24));
  return days >= 0 ? `${days} days` : '0 days';
};

export function getStatusBadgeStyle(s) {
  const u = String(s || '').toUpperCase();
  if (['AVAILABLE', 'DONE', 'UNREAD', 'FINISHED', 'RETURNED', 'COLLECTED', 'IN POSSESSION'].includes(u)) return 'text-emerald-700 font-extrabold';
  if (['LENT', 'BORROWED', 'OUT', 'HOLDING'].includes(u)) return 'text-amber-800 font-extrabold';
  if (u === 'READING') return 'text-sky-700 font-extrabold';
  if (['WISHLISTED', 'GIFTED', 'GIFTED OUT'].includes(u)) return 'text-purple-700 font-extrabold';
  if (['LOST', 'DAMAGED'].includes(u)) return 'text-rose-700 font-extrabold';
  if (u.includes('NOT IN POSSESSION')) return 'text-purple-800 font-extrabold';
  return 'text-stone-700 font-extrabold';
}

export const EMPTY_INITIAL_DATA = {
  kpis: { all: 0, withMe: 0, lent: 0, wishlisted: 0, totalWorth: 0 },
  config: {
    categories: ['Self-Help', 'Finance', 'History', 'Literature', 'Technology', 'Philosophy', 'Science', 'Fiction'],
    locations: ['At Home', 'At Office', 'To Person'],
    initialStatuses: ['Purchased', 'RECEIVED GIFT', 'Borrowed from library', 'Borrowed from friend'],
    currentStatuses: ['UNREAD', 'READING', 'DONE', 'LENT', 'LOST', 'DAMAGED', 'WISHLISTED']
  },
  people: [],
  books: [],
  wishlist: []
};


// UI translations used by the app's DOM localization layer.
export const UI_TRANSLATIONS = {
  "Manage & Add Readers": [
    "वाचक व्यवस्थापन",
    "पाठक प्रबंधन"
  ],
  "Reader Directory": [
    "वाचक सूची",
    "पाठक सूची"
  ],
  "Configuration": [
    "सेटिंग्ज",
    "सेटिंग्स"
  ],
  "Manage & Add Genre": [
    "प्रकार व्यवस्थापन",
    "श्रेणी प्रबंधन"
  ],
  "Add Location": [
    "ठिकाण जोडा",
    "स्थान जोड़ें"
  ],
  "Add Status": [
    "स्थिती जोडा",
    "स्थिति जोड़ें"
  ],
  "Local & Cloud Backup": [
    "स्थानिक व क्लाउड बॅकअप",
    "स्थानीय व क्लाउड बैकअप"
  ],
  "Backup with Google": [
    "Google वर बॅकअप",
    "Google पर बैकअप"
  ],
  "Export Full Data (CSV)": [
    "संपूर्ण डेटा निर्यात (CSV)",
    "पूरा डेटा निर्यात (CSV)"
  ],
  "Restore Full Backup (CSV)": [
    "पूर्ण बॅकअप पुनर्संचयित (CSV)",
    "पूर्ण बैकअप पुनर्स्थापित (CSV)"
  ],
  "App display language": [
    "अ‍ॅपची भाषा",
    "ऐप की भाषा"
  ],
  "English (Default)": [
    "इंग्रजी (डीफॉल्ट)",
    "अंग्रेज़ी (डिफ़ॉल्ट)"
  ],
  "Support me": [
    "मला समर्थन द्या",
    "मेरा समर्थन करें"
  ],
  "Library Manager": [
    "ग्रंथालय व्यवस्थापक",
    "पुस्तकालय प्रबंधक"
  ],
  "B-wise Library": [
    "B-wise Library",
    "B-wise Library"
  ],
  "Home": [
    "मुख्यपृष्ठ",
    "होम"
  ],
  "Books": [
    "पुस्तके",
    "पुस्तकें"
  ],
  "Readers": [
    "वाचक",
    "पाठक"
  ],
  "Wishlist": [
    "इच्छासूची",
    "इच्छासूची"
  ],
  "Search": [
    "शोधा",
    "खोजें"
  ],
  "Add Book": [
    "पुस्तक जोडा",
    "पुस्तक जोड़ें"
  ],
  "Save": [
    "जतन करा",
    "सहेजें"
  ],
  "Cancel": [
    "रद्द करा",
    "रद्द करें"
  ],
  "Edit": [
    "संपादन",
    "संपादित करें"
  ],
  "Delete": [
    "हटवा",
    "हटाएं"
  ],
  "Close": [
    "बंद करा",
    "बंद करें"
  ],
  "Settings": [
    "सेटिंग्ज",
    "सेटिंग्स"
  ],
  "History": [
    "इतिहास",
    "इतिहास"
  ],
  "Contact": [
    "संपर्क",
    "संपर्क"
  ],
  "Export PDF": [
    "PDF निर्यात",
    "PDF निर्यात"
  ],
  "Loading data...": [
    "डेटा लोड होत आहे...",
    "डेटा लोड हो रहा है..."
  ],
  "No books found": [
    "पुस्तके आढळली नाहीत",
    "कोई पुस्तक नहीं मिला"
  ]
};
export const translateUiText = (text, language) => { const source = Object.entries(UI_TRANSLATIONS).find(([key, values]) => text === key || text === values[0] || text === values[1])?.[0] || text; const entry = UI_TRANSLATIONS[source]; return entry ? (language === 'mr' ? entry[0] : language === 'hi' ? entry[1] : source) : text; };
