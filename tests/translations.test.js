import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const languages = ['en', 'mr', 'hi'];
const resources = Object.fromEntries(languages.map(language => [
  language,
  JSON.parse(readFileSync(new URL(`../src/i18n/languages/${language}.json`, import.meta.url), 'utf8'))
]));

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child, path)
      : [path];
  }).sort();
}

test('English, Hindi, and Marathi resources contain identical keys', () => {
  const expected = flattenKeys(resources.en);
  for (const language of languages.slice(1)) {
    assert.deepEqual(flattenKeys(resources[language]), expected, `${language} translation keys differ`);
  }
});

test('every configured reading badge has a localized label', () => {
  const labels = [
    'progress.badges.firstChapter',
    'progress.badges.pageTurner',
    'progress.badges.bookworm',
    'progress.badges.shelfBuilder',
    'progress.badges.shelfMaster',
    'progress.badges.centuryReader',
    'progress.badges.grandCurator',
    'progress.badges.libraryLegend'
  ];
  for (const language of languages) {
    for (const label of labels) {
      const value = label.split('.').reduce((current, key) => current?.[key], resources[language]);
      assert.equal(typeof value, 'string', `${language} is missing ${label}`);
    }
  }
});
