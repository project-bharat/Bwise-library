import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ANNUAL_READING_GOAL,
  normalizeAnnualReadingGoal,
  summarizeReadingProgress,
  validateAnnualReadingGoal,
  READING_BADGES
} from '../src/utils/progress.js';

test('annual goal uses the saved value only for its configured year', () => {
  assert.equal(normalizeAnnualReadingGoal({ year: 2026, target: 20 }, 2026), 20);
  assert.equal(normalizeAnnualReadingGoal({ year: 2025, target: 20 }, 2026), DEFAULT_ANNUAL_READING_GOAL);
  assert.equal(normalizeAnnualReadingGoal({ year: 2026, target: 0 }, 2026), DEFAULT_ANNUAL_READING_GOAL);
});

test('progress counts unique lifetime books and only dated completions in the selected year', () => {
  const result = summarizeReadingProgress([
    { bookId: 'legacy', completedAt: '' },
    { bookId: 'year-book', completedAt: '2026-03-10' },
    { bookId: 'year-book', completedAt: '2026-03-10' },
    { bookId: 'old-book', completedAt: '2025-12-31' }
  ], 2026);
  assert.deepEqual(result, { lifetimeFinished: 3, finishedThisYear: 1 });
});

test('goal validation rejects invalid limits and milestones follow badge thresholds', () => {
  assert.equal(validateAnnualReadingGoal('36'), 36);
  assert.throws(() => validateAnnualReadingGoal('0'));
  assert.deepEqual(READING_BADGES.map(badge => badge.threshold), [1, 5, 10, 25, 50, 100, 250, 500]);
});
