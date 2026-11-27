export const DEFAULT_ANNUAL_READING_GOAL = 12;

export const READING_BADGES = [
  { threshold: 1, asset: 'badge_001_first_chapter', label: 'progress.badges.firstChapter' },
  { threshold: 5, asset: 'badge_005_page_turner', label: 'progress.badges.pageTurner' },
  { threshold: 10, asset: 'badge_010_bookworm', label: 'progress.badges.bookworm' },
  { threshold: 25, asset: 'badge_025_shelf_builder', label: 'progress.badges.shelfBuilder' },
  { threshold: 50, asset: 'badge_050_shelf_master', label: 'progress.badges.shelfMaster' },
  { threshold: 100, asset: 'badge_100_century_reader', label: 'progress.badges.centuryReader' },
  { threshold: 250, asset: 'badge_250_grand_curator', label: 'progress.badges.grandCurator' },
  { threshold: 500, asset: 'badge_500_library_legend', label: 'progress.badges.libraryLegend' }
];

export function normalizeAnnualReadingGoal(value, year = new Date().getFullYear()) {
  const target = Number(value?.year) === Number(year) ? Number(value.target) : DEFAULT_ANNUAL_READING_GOAL;
  return Number.isInteger(target) && target >= 1 && target <= 5000
    ? target
    : DEFAULT_ANNUAL_READING_GOAL;
}

export function summarizeReadingProgress(completions, year = new Date().getFullYear()) {
  const unique = new Map();
  for (const completion of Array.isArray(completions) ? completions : []) {
    const bookId = String(completion?.bookId || '');
    if (!bookId) continue;
    const existing = unique.get(bookId);
    if (!existing || (!existing.completedAt && completion.completedAt)) {
      unique.set(bookId, completion);
    }
  }

  const records = Array.from(unique.values());
  const yearKey = String(year);
  return {
    lifetimeFinished: records.length,
    finishedThisYear: records.filter(record => String(record.completedAt || '').slice(0, 4) === yearKey).length
  };
}

export function validateAnnualReadingGoal(value) {
  const target = Number(value);
  if (!Number.isInteger(target) || target < 1 || target > 5000) {
    throw new Error('Choose a whole-number reading goal between 1 and 5000.');
  }
  return target;
}
