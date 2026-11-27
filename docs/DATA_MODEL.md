# Data model

The app stores one JSON payload; it does not use Room, SQLite, or a relational database. On Android the payload is `bwise-library-data.json` in Capacitor's private data directory. In a browser it is stored in `localStorage` under that key.

## Payload shape

```text
{
  schemaVersion,
  config: { categories[], locations[], initialStatuses[], currentStatuses[], readingGoal? },
  books: [ ... ],
  people: [ ... ],
  wishlist: [ ... ],
  readingCompletions: [{ bookId, completedAt }]
}
```

Default configuration is declared in `src/utils.js`. The payload also receives runtime `status` and `offline` fields when loaded; these are not included in full-data backups.

### Books

Book objects use fields including `id`, `title`, `author`, `category`, `language`, `amount`, `initialStatus`, `currentStatus`, `readingStatus`, `location`, `person`, `personStatus`, `bookInDate`, `eventDate`, `promiseReturnDate`, `notes`, and `journey`.

Status values are strings and can be customized through configuration. The UI displays `LENT` as `OUT` and `DONE` as `FINISHED`. A status/location/person combination may also affect whether a book is considered lent; preserve the existing rules when changing the model.

Journey entries are stored on a book and may include `journeyId`, `changeDate`, `newStatus`, `readingStatus`, `location`, `person`, `personStatus`, `promiseReturnDate`, and `notes`. Status updates append an entry when tracked fields change.

### People and wishlist

- People store a name and optional contact fields such as phone, address, and email. Names, rather than a separate person ID, are currently used to associate people with books; stable person identifiers are a prerequisite for reliable multi-device sync.
- `people[].records` is rebuilt from book data by `rebuildPeople`; it is not an independent loan ledger.
- Wishlist entries are separate from books and can include `id`, `dateAdded`, title/author/category/language, target location, notes, and status. Marking an item in possession promotes it into the book collection and removes the wishlist row.

IDs are generated locally as prefixed strings. `readingCompletions` tracks one unique completion per book, retaining achievements if the book is later deleted. Entries migrated from pre-existing FINISHED books have an empty `completedAt`; they count for lifetime milestones only, not for an annual goal. The goal is stored as `{ year, target }` under `config.readingGoal`.

The stored payload declares `schemaVersion`. The full-backup CSV retains its `BWISE_FULL_BACKUP_V1` envelope for compatibility while carrying the current schema version in the JSON payload. Treat format changes as migrations and preserve backwards compatibility.

See [Data migration](DATA_MIGRATION.md) before changing persistence or backup formats.
