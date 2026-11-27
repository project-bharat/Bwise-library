# Data model

The app stores one JSON payload; it does not use Room, SQLite, or a relational database. On Android the payload is `bwise-library-data.json` in Capacitor's private data directory. In a browser it is stored in `localStorage` under that key.

## Payload shape

```text
{
  config: { categories[], locations[], initialStatuses[], currentStatuses[] },
  books: [ ... ],
  people: [ ... ],
  wishlist: [ ... ]
}
```

Default configuration is declared in `src/utils.js`. The payload also receives runtime `status` and `offline` fields when loaded; these are not included in full-data backups.

### Books

Book objects use fields including `id`, `title`, `author`, `category`, `language`, `amount`, `initialStatus`, `currentStatus`, `readingStatus`, `location`, `person`, `personStatus`, `bookInDate`, `eventDate`, `promiseReturnDate`, `notes`, and `journey`.

Status values are strings and can be customized through configuration. The UI displays `LENT` as `OUT` and `DONE` as `FINISHED`. A status/location/person combination may also affect whether a book is considered lent; preserve the existing rules when changing the model.

Journey entries are stored on a book and may include `journeyId`, `changeDate`, `newStatus`, `readingStatus`, `location`, `person`, `personStatus`, `promiseReturnDate`, and `notes`. Status updates append an entry when tracked fields change.

### People and wishlist

- People store a name and optional contact fields such as phone, address, and email. Names, rather than a separate person ID, are used to associate people with books.
- `people[].records` is rebuilt from book data by `rebuildPeople`; it is not an independent loan ledger.
- Wishlist entries are separate from books and can include `id`, `dateAdded`, title/author/category/language, target location, notes, and status. Marking an item in possession promotes it into the book collection and removes the wishlist row.

IDs are generated locally as prefixed strings. The full-backup CSV has a `BWISE_FULL_BACKUP_V1` envelope, but the stored JSON payload does not currently declare a separate schema version. Treat format changes as migrations and preserve backwards compatibility.

See [Data migration](DATA_MIGRATION.md) before changing persistence or backup formats.
