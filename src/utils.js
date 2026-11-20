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

// Expanded UI vocabulary and screen labels (book titles, names and user-entered values remain unchanged).
Object.assign(UI_TRANSLATIONS, {
  "Search title, author, reader, genre, location...": [
    "शीर्षक, लेखक, वाचक, प्रकार, ठिकाण शोधा...",
    "शीर्षक, लेखक, पाठक, श्रेणी, स्थान खोजें..."
  ],
  "Title": [
    "शीर्षक",
    "शीर्षक"
  ],
  "Author": [
    "लेखक",
    "लेखक"
  ],
  "Reader": [
    "वाचक",
    "पाठक"
  ],
  "Person": [
    "व्यक्ती",
    "व्यक्ति"
  ],
  "Genre": [
    "प्रकार",
    "श्रेणी"
  ],
  "Category": [
    "प्रकार",
    "श्रेणी"
  ],
  "Location": [
    "ठिकाण",
    "स्थान"
  ],
  "Status": [
    "स्थिती",
    "स्थिति"
  ],
  "Book Details": [
    "पुस्तक तपशील",
    "पुस्तक विवरण"
  ],
  "Book Title": [
    "पुस्तकाचे नाव",
    "पुस्तक का नाम"
  ],
  "Book": [
    "पुस्तक",
    "पुस्तक"
  ],
  "Books": [
    "पुस्तके",
    "पुस्तकें"
  ],
  "Search": [
    "शोधा",
    "खोजें"
  ],
  "Filter": [
    "फिल्टर",
    "फ़िल्टर"
  ],
  "Status: All": [
    "स्थिती: सर्व",
    "स्थिति: सभी"
  ],
  "Category: All": [
    "प्रकार: सर्व",
    "श्रेणी: सभी"
  ],
  "Language: All": [
    "भाषा: सर्व",
    "भाषा: सभी"
  ],
  "Author: All": [
    "लेखक: सर्व",
    "लेखक: सभी"
  ],
  "Person: All": [
    "व्यक्ती: सर्व",
    "व्यक्ति: सभी"
  ],
  "Location: All": [
    "ठिकाण: सर्व",
    "स्थान: सभी"
  ],
  "All": [
    "सर्व",
    "सभी"
  ],
  "ALL": [
    "सर्व",
    "सभी"
  ],
  "RESET": [
    "रीसेट",
    "रीसेट"
  ],
  "Reset": [
    "रीसेट",
    "रीसेट"
  ],
  "STATUS-WISE SUMMARY": [
    "स्थितीनुसार सारांश",
    "स्थिति के अनुसार सारांश"
  ],
  "ACTIVE LENT / BORROWED": [
    "सध्या दिलेली / घेतलेली",
    "वर्तमान उधार दिए / लिए"
  ],
  "WITH ME": [
    "माझ्याकडे",
    "मेरे पास"
  ],
  "OUT": [
    "बाहेर / दिले",
    "बाहर / दिया"
  ],
  "WORTH": [
    "मूल्य",
    "मूल्य"
  ],
  "FINISHED": [
    "पूर्ण वाचले",
    "पूरा पढ़ा"
  ],
  "Load More": [
    "अधिक लोड करा",
    "और लोड करें"
  ],
  "Load More (+6)": [
    "अधिक लोड करा (+6)",
    "और लोड करें (+6)"
  ],
  "remaining": [
    "बाकी",
    "शेष"
  ],
  "No records": [
    "नोंदी नाहीत",
    "कोई रिकॉर्ड नहीं"
  ],
  "No records found for this reader": [
    "या वाचकासाठी नोंदी नाहीत",
    "इस पाठक के लिए कोई रिकॉर्ड नहीं"
  ],
  "Back to Persons": [
    "वाचकांकडे परत",
    "पाठकों पर वापस"
  ],
  "Back to Collections": [
    "संग्रहाकडे परत",
    "संग्रह पर वापस"
  ],
  "Person Book History": [
    "वाचक पुस्तक इतिहास",
    "पाठक पुस्तक इतिहास"
  ],
  "Tap row to view journey": [
    "प्रवास पाहण्यासाठी ओळीवर टॅप करा",
    "यात्रा देखने के लिए पंक्ति पर टैप करें"
  ],
  "History": [
    "इतिहास",
    "इतिहास"
  ],
  "Holding": [
    "जवळ आहे",
    "पास है"
  ],
  "Returned": [
    "परत केले",
    "लौटाया"
  ],
  "Gifted": [
    "भेट दिले",
    "उपहार दिया"
  ],
  "No phone": [
    "फोन नाही",
    "फोन नहीं"
  ],
  "No address": [
    "पत्ता नाही",
    "पता नहीं"
  ],
  "Date": [
    "दिनांक",
    "तारीख"
  ],
  "Promise Date": [
    "परत देण्याची तारीख",
    "वापसी की तारीख"
  ],
  "Action": [
    "कृती",
    "कार्य"
  ],
  "No matching contacts.": [
    "जुळणारे संपर्क नाहीत.",
    "कोई मिलते संपर्क नहीं।"
  ],
  "No phone number": [
    "फोन नंबर नाही",
    "फोन नंबर नहीं"
  ],
  "Name": [
    "नाव",
    "नाम"
  ],
  "Phone": [
    "फोन",
    "फ़ोन"
  ],
  "Address": [
    "पत्ता",
    "पता"
  ],
  "Email": [
    "ईमेल",
    "ईमेल"
  ],
  "Save Reader": [
    "वाचक जतन करा",
    "पाठक सेव करें"
  ],
  "Add Reader Profile": [
    "वाचक जोडा",
    "पाठक जोड़ें"
  ],
  "Edit Reader Profile": [
    "वाचक संपादित करा",
    "पाठक संपादित करें"
  ],
  "Choose from device contacts": [
    "फोन संपर्कांतून निवडा",
    "फ़ोन संपर्कों से चुनें"
  ],
  "Loading device contacts…": [
    "संपर्क लोड होत आहेत…",
    "संपर्क लोड हो रहे हैं…"
  ],
  "Device contacts": [
    "फोन संपर्क",
    "फ़ोन संपर्क"
  ],
  "Search name or phone": [
    "नाव किंवा फोन शोधा",
    "नाम या फोन खोजें"
  ],
  "Close": [
    "बंद करा",
    "बंद करें"
  ],
  "Add": [
    "जोडा",
    "जोड़ें"
  ],
  "Existing options": [
    "सध्याचे पर्याय",
    "मौजूदा विकल्प"
  ],
  "No options added yet.": [
    "अद्याप पर्याय जोडले नाहीत.",
    "अभी विकल्प नहीं जोड़े गए।"
  ],
  "Add new value *": [
    "नवीन मूल्य जोडा *",
    "नया मान जोड़ें *"
  ],
  "Manage & Add Genre": [
    "प्रकार व्यवस्थापन",
    "श्रेणी प्रबंधन"
  ],
  "Manage & Add Location": [
    "ठिकाण व्यवस्थापन",
    "स्थान प्रबंधन"
  ],
  "Manage & Add Status": [
    "स्थिती व्यवस्थापन",
    "स्थिति प्रबंधन"
  ],
  "Edit Details": [
    "तपशील संपादित करा",
    "विवरण संपादित करें"
  ],
  "Update Status": [
    "स्थिती अद्यतनित करा",
    "स्थिति अपडेट करें"
  ],
  "Copy Title": [
    "शीर्षक कॉपी करा",
    "शीर्षक कॉपी करें"
  ],
  "Load More (+6) •": [
    "अधिक लोड करा (+6) •",
    "और लोड करें (+6) •"
  ],
  "All records": [
    "सर्व नोंदी",
    "सभी रिकॉर्ड"
  ],
  "No books found": [
    "पुस्तके आढळली नाहीत",
    "कोई पुस्तक नहीं मिला"
  ],
  "Unknown": [
    "अज्ञात",
    "अज्ञात"
  ],
  "General": [
    "सामान्य",
    "सामान्य"
  ],
  "English": [
    "इंग्रजी",
    "अंग्रेज़ी"
  ],
  "Marathi": [
    "मराठी",
    "मराठी"
  ],
  "Hindi": [
    "हिंदी",
    "हिंदी"
  ],
  "Self-Help": [
    "स्व-मदत",
    "स्व-सहायता"
  ],
  "Finance": [
    "अर्थ",
    "वित्त"
  ],
  "Literature": [
    "साहित्य",
    "साहित्य"
  ],
  "Technology": [
    "तंत्रज्ञान",
    "प्रौद्योगिकी"
  ],
  "Philosophy": [
    "तत्त्वज्ञान",
    "दर्शन"
  ],
  "Science": [
    "विज्ञान",
    "विज्ञान"
  ],
  "Fiction": [
    "कथा साहित्य",
    "कथा साहित्य"
  ],
  "Purchased": [
    "खरेदी केले",
    "खरीदा"
  ],
  "UNREAD": [
    "न वाचलेले",
    "नहीं पढ़ा"
  ],
  "READING": [
    "वाचत आहे",
    "पढ़ रहे हैं"
  ],
  "DONE": [
    "पूर्ण",
    "पूर्ण"
  ],
  "LENT": [
    "दिलेली",
    "उधार दिया"
  ],
  "LOST": [
    "हरवले",
    "खो गया"
  ],
  "DAMAGED": [
    "खराब",
    "क्षतिग्रस्त"
  ],
  "WISHLISTED": [
    "इच्छासूचीत",
    "इच्छासूची में"
  ],
  "AVAILABLE": [
    "उपलब्ध",
    "उपलब्ध"
  ],
  "COLLECTED": [
    "मिळवले",
    "प्राप्त"
  ],
  "RETURNED": [
    "परत",
    "लौटाया"
  ],
  "GIFTED OUT": [
    "भेट दिले",
    "उपहार दिया"
  ],
  "IN POSSESSION": [
    "ताब्यात आहे",
    "कब्जे में"
  ],
  "NOT IN POSSESSION": [
    "ताब्यात नाही",
    "कब्जे में नहीं"
  ],
  "Add Bookstore Wishlist": [
    "पुस्तक खरेदी इच्छासूची जोडा",
    "पुस्तक खरीद इच्छासूची जोड़ें"
  ],
  "Edit Wishlist Item": [
    "इच्छासूची संपादित करा",
    "इच्छासूची आइटम संपादित करें"
  ],
  "Wishlist": [
    "इच्छासूची",
    "इच्छासूची"
  ],
  "Add Wishlist": [
    "इच्छासूची जोडा",
    "इच्छासूची जोड़ें"
  ],
  "Update Wishlist": [
    "इच्छासूची अद्यतनित करा",
    "इच्छासूची अपडेट करें"
  ],
  "Cancel": [
    "रद्द करा",
    "रद्द करें"
  ],
  "Saving...": [
    "जतन होत आहे...",
    "सेव हो रहा है..."
  ],
  "Save": [
    "जतन करा",
    "सेव करें"
  ],
  "Export PDF": [
    "PDF निर्यात",
    "PDF निर्यात"
  ],
  "Share Table as PDF": [
    "टेबल PDF शेअर करा",
    "टेबल PDF साझा करें"
  ],
  "Call Reader": [
    "वाचकाला कॉल करा",
    "पाठक को कॉल करें"
  ],
  "Call Developer": [
    "विकसकाला कॉल करा",
    "डेवलपर को कॉल करें"
  ],
  "WhatsApp Reminder": [
    "WhatsApp स्मरणपत्र",
    "WhatsApp रिमाइंडर"
  ],
  "Export Statement PDF": [
    "स्टेटमेंट PDF निर्यात",
    "स्टेटमेंट PDF निर्यात"
  ],
  "Export Journey PDF": [
    "प्रवास PDF निर्यात",
    "यात्रा PDF निर्यात"
  ],
  "Filter category:": [
    "प्रकार फिल्टर:",
    "श्रेणी फ़िल्टर:"
  ],
  "Filter author:": [
    "लेखक फिल्टर:",
    "लेखक फ़िल्टर:"
  ],
  "View all books in": [
    "यातील सर्व पुस्तके पहा",
    "इसमें सभी पुस्तकें देखें"
  ],
  "View all books by": [
    "यांची सर्व पुस्तके पहा",
    "इनकी सभी पुस्तकें देखें"
  ],
  "By": [
    "लेखक",
    "द्वारा"
  ],
  "Acquired via": [
    "मिळवण्याचा मार्ग",
    "प्राप्ति माध्यम"
  ],
  "Status Updated": [
    "स्थिती बदलली",
    "स्थिति अपडेट हुई"
  ],
  "days": [
    "दिवस",
    "दिन"
  ],
  "days later": [
    "दिवसांनंतर",
    "दिन बाद"
  ],
  "Loading data...": [
    "डेटा लोड होत आहे...",
    "डेटा लोड हो रहा है..."
  ],
  "Local data ready": [
    "स्थानिक डेटा तयार",
    "स्थानीय डेटा तैयार"
  ],
  "Failed to load local data": [
    "स्थानिक डेटा लोड अयशस्वी",
    "स्थानीय डेटा लोड विफल"
  ],
  "Formatting PDF...": [
    "PDF तयार होत आहे...",
    "PDF तैयार हो रहा है..."
  ],
  "PDF Exported": [
    "PDF निर्यात झाले",
    "PDF निर्यात हुआ"
  ],
  "Export failed:": [
    "निर्यात अयशस्वी:",
    "निर्यात विफल:"
  ],
  "Readers": [
    "वाचक",
    "पाठक"
  ],
  "Home": [
    "मुख्यपृष्ठ",
    "होम"
  ],
  "Settings": [
    "सेटिंग्ज",
    "सेटिंग्स"
  ],
  "Reset filters": [
    "फिल्टर रीसेट करा",
    "फ़िल्टर रीसेट करें"
  ],
  "RESET FILTERS": [
    "फिल्टर रीसेट करा",
    "फ़िल्टर रीसेट करें"
  ]
});

export const translateUiText = (text, language) => { const source = Object.entries(UI_TRANSLATIONS).find(([key, values]) => text === key || text === values[0] || text === values[1])?.[0] || text; const entry = UI_TRANSLATIONS[source]; return entry ? (language === 'mr' ? entry[0] : language === 'hi' ? entry[1] : source) : text; };
