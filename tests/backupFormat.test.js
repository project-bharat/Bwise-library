import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFullBackup, previewFullBackup } from '../src/native/backupFormat.js';

function makeBackup(payload) {
  const json = JSON.stringify(payload).replace(/"/g, '""');
  return `BWISE_FULL_BACKUP_V1,1\r\npayload_json,"${json}"`;
}

test('backup preview validates payload shape and reports record counts', () => {
  const backup = makeBackup({
    config: {},
    books: [{ id: 'b1' }],
    people: [{ name: 'Reader' }],
    wishlist: []
  });
  assert.deepEqual(previewFullBackup(backup), { books: 1, people: 1, wishlist: 0 });
  assert.equal(parseFullBackup(backup).books[0].id, 'b1');
});

test('malformed backup headers, JSON, or record lists are rejected', () => {
  assert.throws(() => parseFullBackup('not a backup'));
  assert.throws(() => parseFullBackup('BWISE_FULL_BACKUP_V1,1\npayload_json,"{broken"'));
  assert.throws(() => parseFullBackup(makeBackup({ books: {}, people: [], wishlist: [] })));
});
