export function catalogFile(books, format) {
  if (format === 'json') return new Blob([JSON.stringify({ schemaVersion: 1, books }, null, 2)], { type: 'application/json' });
  const columns = ['id', 'isbn', 'title', 'author', 'location', 'currentStatus', 'person', 'readingStatus', 'rating', 'tags', 'notes'];
  function cell(value) {
    let text = Array.isArray(value) ? value.join(', ') : String(value ?? '');
    if (/^\s*[=+@-]|^[\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }
  const rows = books.map(book => columns.map(key => cell(book[key])).join(','));
  return new Blob(['\uFEFF' + [columns.join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' });
}
