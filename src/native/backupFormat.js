export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell === '') {
      quoted = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error('The backup CSV contains an unterminated quoted field.');
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The backup payload must be a JSON object.');
  }

  for (const key of ['books', 'people', 'wishlist']) {
    if (!Array.isArray(payload[key])) {
      throw new Error(`The backup is missing a valid ${key} list.`);
    }
    if (payload[key].some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
      throw new Error(`The backup contains an invalid record in ${key}.`);
    }
  }
  if (payload.config != null && (typeof payload.config !== 'object' || Array.isArray(payload.config))) {
    throw new Error('The backup configuration is invalid.');
  }
  return payload;
}

export function parseFullBackup(text) {
  const rows = parseCsv(String(text || ''));
  if (rows[0]?.[0] !== 'BWISE_FULL_BACKUP_V1' || rows[1]?.[0] !== 'payload_json') {
    throw new Error('This CSV is not a B-wise full backup. Import a backup exported by this app.');
  }

  let payload;
  try {
    payload = JSON.parse(rows[1][1] || '{}');
  } catch (error) {
    throw new Error(`The backup JSON is invalid: ${error.message}`);
  }
  return validateBackupPayload(payload);
}

export function previewFullBackup(text) {
  const payload = parseFullBackup(text);
  return {
    books: payload.books.length,
    people: payload.people.length,
    wishlist: payload.wishlist.length
  };
}
