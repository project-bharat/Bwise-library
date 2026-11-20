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
