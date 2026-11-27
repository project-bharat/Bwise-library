# B-wise Library — Study Notes, Findings & Improvement Plan

Reviewed: 28 Nov 2026. Sources: `Bwise-library-main.zip` (all of `src/`, `docs/`, `scripts/`, CI workflow, config), the phone screenshots, and the `lt_Library_Backup_2026-11-27.csv` backup.
Line numbers refer to the zip. Items are marked **[code]** (read in source), **[screens]** (seen only in screenshots/backup) or **[verify]** (needs a check against current official docs before acting).

---

## 0. Read this first: the zip is older than the app on your phone

The screenshots show features that **do not exist anywhere in the zip**: ISBN barcode scan, ISBN lookup, cover picker, tags, rating, the "Collection check" duplicate screen, "Add another copy", Marathi-localised statuses on some screens, and a `₹` amount field with a cover thumbnail. A search of `src/` for `isbn`, `barcode`, `cover` and `openlibrary` returns nothing, and `package.json` has no scanner plugin.

**Action:** push your latest working branch to GitHub before Codex works on the ISBN items below, or Codex will rebuild them from scratch on top of the wrong base. Everything below about ISBN is therefore written as a design spec, not as a review of your code.

**Two corrections to my earlier message (written from screenshots only):**
1. The `27-nov-026` date style is **intentional**. `utils.js` line 1 documents the format `dd-mmm-0yy`, and `AGENT_README.md` says it is deliberate. It is not a bug. I still recommend making it a user choice, because it looks like a typo to new users and always shows English month names (see §7).
2. The bell badge "2" is the **wishlist** count, not due-date alerts (App.jsx lines ~776-790). Overdue loans never appear in it (see F-07).

---

## 1. What the app is

A local-first Android app (React 18 + Vite 5 + Tailwind 3 + Capacitor 6, JavaScript only) for tracking a personal or community book collection, who has borrowed each book, and a wishlist. Package ID `com.bharatrasve.bwiselibrary`. Languages: English, Marathi, Hindi.

Your real data (backup): 32 books, 14 readers, 2 wishlist items. 29 of 32 books are lent out. Only 8 of those loans have a due date. This is a lending-first library, which is the app's main strength.

## 2. Architecture and data flow [code]

```
React UI (App.jsx, 1685 lines)
  -> window.google.script.run (legacy shim, native/gasShim.js)
     -> native/localDb.js  mutateLocal(method, args)
        -> Android: bwise-library-data.json in Directory.Data (private)
        -> Browser: localStorage key of the same name
Plugins: filesystem, share, preferences, status-bar, splash-screen, app, browser,
         local-notifications, @capacitor-community/contacts
Exports: html2pdf.js (image-based PDF), CSV (full backup + record dumps)
Build: GitHub Actions, `npx cap add android` every run, debug APK only
```

Key traits:
- One JSON blob for everything. Each mutation reads the whole file, changes it, rebuilds `people`, and rewrites the whole file (`localDb.js`). Writes are serialized by a promise queue, which is good.
- The UI still calls a Google Apps Script-shaped API. `backend/ApiBridge.gs`, `native/config.js`, `SyncSettingsModal.jsx` and the "Google Sheet connected!" toast are **dead legacy** that does nothing.
- State lives in `App.jsx` (about 25 `useState` hooks). Navigation is a string `activeTab`, with a hand-written Android Back chain (`backRef`, lines ~573-590).
- i18n: `t('legacy.<English phrase>')` keys (302 of 369 keys), with the other 67 in structured groups. en, mr and hi have the same 369 keys. Only 19 Marathi values equal the English text, and most are brand or technical terms.

## 3. Screen and flow inventory [code + screens]

| Screen | What it does | Notes |
|---|---|---|
| Splash | Native splash, then an HTML splash for at least 2.2 s | Fine |
| Home | KPI strip, 6 filter dropdowns, 3 summary tables (status-wise, active lent, location) with "Load More (+6)" | Same data repeated in 3 tables; no due/overdue section |
| Books | Table: title/author/category, initial status, current status, location (+ borrower) | Dense; tapping the status cell opens the status modal, tapping initial status opens the edit modal |
| Book detail | Banner, "Book Journey" timeline, edit/update/share buttons | Timeline text is stored in English (F-09) |
| Add/Edit book | Modal: title, author, amount, category, language, initial status, location, date, notes | Your phone build has more (ISBN etc.) |
| Update status | Modal: reading stage, custody, location, borrower, person status, dates | Several bugs (F-03, F-04, F-05) |
| Readers | Table with call/edit/delete/view icons; capsule filters | Delete sits between edit and view |
| Reader detail | Statement, holding list, WhatsApp reminder (single/all), PDF | |
| Wishlist | Merges `wishlist[]` with books flagged WISHLISTED | Two sources of truth |
| Tag view | All books by author or category | |
| Drawer | Language, add reader/category/location/status, backup, restore, "Sync Settings", call developer | Sync Settings is legacy |
| Bell | Only "due today" loans plus wishlist count | |
| Support me | UPI QR and `upi://pay` link | See F-14 |

## 4. Data model [code + backup]

Top-level: `{ config, books[], people[], wishlist[] }` (+ `kpis` in the backup). Book fields: `id, title, author, category, language, amount, initialStatus, currentStatus, readingStatus, location, person, personStatus, prevPerson, bookInDate, eventDate, promiseReturnDate, notes, journey[]`.

Structural weaknesses:
- **Two status fields are used inconsistently.** `currentStatus` is meant to be custody (COLLECTED / LENT / LOST / DAMAGED / GIFTED OUT) but the default config list is `UNREAD, READING, DONE, LENT…` (a reading list). New books are saved as `My Collection`, the status modal also offers `COLLECTED`, and `readingStatus` stores `FINISHED` while config says `DONE`. Your backup contains `LENT` ×29, `COLLECTED` ×2, `My Collection` ×1.
- **Magic string:** `location === 'To Person'` defines "lent".
- **Language is stored as display text.** `BookDetailsModal` line ~76 uses `<option>{t('legacy.Marathi')}</option>`, so the stored value is whatever the UI language rendered ("Marathi" or "मराठी"). Switching language later splits your data in filters.
- **People are keyed by name.** Two readers with the same name merge; rename updates books by string match.
- **No loan ledger.** `people[].records` is rebuilt from each book's *current* `person` (or `prevPerson` once returned). Once a book moves to a second reader, the first reader's history for it disappears. A reader's "Returned" count can only ever include the last loan of each book.
- **Journey notes are English sentences stored in data** (`"Updated status to LENT · Reading: UNREAD · Reader: …"`, `localDb.js` lines ~148-157, ~190-200). On return, `person` is blank, so the timeline does not say who returned it.
- No `isbn`, `cover`, `publisher`, `pages`, `rating`, `tags`, `translator`, `schemaVersion` fields in the zip. Your backup also has none, so none of your 32 books has an ISBN or cover on file.
- Author field holds translators in brackets (for example `रे ब्रॅडबरी ( माया पंडित )`), so one author spelling variant becomes several tag filters.
- Backup format: a `.csv` whose only row is a 31,997-character JSON cell. Excel caps a cell at 32,767 characters, so this file is about 98% of the way to being unreadable in Excel. The app can still re-import it, but any larger library will fail if anyone opens and re-saves it in Excel.

## 5. Findings

Severity: **P0** fix before any release, **P1** fix soon, **P2** polish.

### 5.1 Data safety

**F-01 (P0) Data can be wiped silently.** `localDb.js` `loadPayload()` (lines ~37-62): if reading `bwise-library-data.json` throws for any reason, or the JSON is corrupt, the code falls through to the legacy cache and then to `EMPTY_INITIAL_DATA`, **and immediately writes that empty payload over the real file**. `DATA_MIGRATION.md` even warns about this. Fix: never overwrite on a read error. Distinguish "file not found" (first launch) from "file unreadable", keep the broken file as `*.corrupt-<timestamp>`, show a recovery screen, and write via temp file + rename plus a rolling `.bak`.

**F-02 (P0) Restore has no safety net.** `importAllSheetsBackupCsv` accepts any JSON after a header check, with no schema validation, no pre-restore snapshot, and replaces everything. Add: validate shape, show counts ("32 books, 14 readers") before confirming, auto-save the current library first, and add `schemaVersion` to the payload.

### 5.2 Logic bugs

**F-03 (P1) The lent-date field is ignored.** `StatusUpdateModal.jsx` keeps `eventDate` state and shows the "Event / Lent Date" input (line ~196), but the payload uses `eventDate: todayStr` (line ~72). You cannot back-date a loan.

**F-04 (P1) Return flow uses `window.confirm`.** Line 47: "Click OK for 'At Home', or Cancel for 'At Office'". Cancel means a different place, not cancel. It is English only and ignores your custom locations.

**F-05 (P1) Rack locations cannot be chosen when changing status.** The status modal hardcodes `At Home / At Office / To Person` (lines ~149-151) while `config.locations` contains your R1/1 … R1/7 racks. A returned book cannot be put back on its rack except via the edit modal.

**F-06 (P1) Dates use UTC.** `new Date().toISOString().split('T')[0]` appears in 7 places (BookDetailsModal 14, StatusUpdateModal 22 and 63, App.jsx 445, localDb 149/191/227). In India (UTC+5:30), anything done between 00:00 and 05:30 is stamped with yesterday's date, in the data and in backup file names. Use a local-date helper.

**F-07 (P1) Overdue loans are invisible.** `scheduleDueDateNotifications` skips any due date before today (`dueNotifications.js`, `dayKey(due) < todayKey`), and the bell only lists "due today". In your data one loan is overdue by 3 days and another by 26 days, and neither alerts. 21 of 29 lent books have no due date at all.

**F-08 (P1) Single WhatsApp reminder ignores the real due date.** `handleSendWhatsAppReminder` (App.jsx ~294-312) always writes "return by today + 5 days", and the message is hardcoded English. Country code `91` is hardcoded in 4 places, and `handleDirectDial` forces a leading `0`.

**F-09 (P2) Filters offer values that no book has.** The status filter uses `config.currentStatuses` (UNREAD, READING, DONE…) but compares with the book's custody status, and `COLLECTED` is not in the default list, so you cannot filter by it.

**F-10 (P2) Notification scheduling reruns on every data change** (App.jsx ~160) and re-queries pending notifications each time. Fine at 32 books; it will be slow for large libraries. Also a due-today loan entered after 09:00 fires a notification 15 seconds later.

**F-11 (P2) Wishlist promotion matches by title only**, so two different books with the same title collide.

### 5.3 Play release blockers [verify]

**F-12 (P0) Target API.** The generated project uses Capacitor 6 defaults, which target an older Android level. Google now requires new apps and updates to target **Android 16 (API 36)**. Raising it needs a newer Android Gradle plugin, so plan a **Capacitor major upgrade** (6 → current). Your `AGENTS.md` says not to bump majors without approval: this is the approval you need to give. After the upgrade, test edge-to-edge (F-13).

**F-13 (P1) Edge-to-edge.** `init.js` uses `StatusBar.setOverlaysWebView({overlay:false})`, which does not work once the app targets API 35+ and edge-to-edge is enforced. Your newer-phone screenshots already show a grey translucent status bar and a faded navigation bar. Also the fixed bottom nav overlaps the last list rows. Add `viewport-fit=cover`, `env(safe-area-inset-*)` padding, and extra bottom padding for the nav.

**F-14 (P1) "Support me" via UPI.** The button shows a UPI QR and a `upi://pay` link. Google Play's payments policy limits taking payment for digital goods outside Play Billing, and tips to the developer may fall under it. I have not checked the current wording, so read the policy before release. Safer options: a Play Billing consumable "tip" product, or move the donation link to your website. Your UPI ID, phone number, LinkedIn and GitHub links are also hard-coded in source and in every PDF footer, which is public if the repo is public.

**F-15 (P1) Contacts permissions.** The manifest script adds `READ_CONTACTS` **and `WRITE_CONTACTS`**. The app never writes contacts, so remove it. The first launch asks for contacts and notifications with no explanation (`requestInitialDevicePermissions`). Prefer the system contact picker (no permission needed; check that your plugin version offers `pickContact`) and ask for notifications only when the first due date is saved. If `READ_CONTACTS` stays, the Data safety form and privacy policy must say so.

**F-16 (P1) CI is debug-only.** No AAB, no signing. Add a release job with the keystore in GitHub secrets, `./gradlew bundleRelease`, use `npm ci` (not `npm install`) for reproducible builds, run `npm audit`, and add lint, a minimal test script, and a build that fails on missing translation keys. Remove the unused `VITE_GAS_URL/TOKEN` variables.

**F-17 (P2) Privacy of third-party data.** Readers' names, phones and addresses are other people's personal data, stored locally and included in every backup file. Say so in the privacy policy and Data safety form, and warn in the share sheet before sharing a backup.

### 5.4 UI/UX and accessibility

**F-18 (P1) Text is very small.** About 190 uses of `text-[7.5px]` to `text-[11px]` (`text-[9px]` ×64, `text-[10px]` ×46, `text-[8px]` ×32). Form labels are 8px. Android body text should be about 14 px and nothing below 12 px, and it must survive the system font-size setting. Table headers (white text on the olive `moss` colour) are low contrast.

**F-19 (P1) Tables on a phone.** Four columns at 9-11px with truncated cells ("Borrowed fro…", "@Gangadhar S…"). Replace with cards.

**F-20 (P1) Icon-only buttons are tiny and unlabeled** (readers list: 28 px targets, call/edit/delete/view in a row; no `aria-label`). Delete should live in an overflow menu with an Undo snackbar.

**F-21 (P1) Native `alert()`/`confirm()` dialogs** (9 places) are English and look unlike the app.

**F-22 (P2) Header search appears on every screen**, including forms and detail pages. Footer with developer branding and contact icons is shown at the bottom of the main list pages and the book detail page.

**F-23 (P2) Home screen** shows the same books in three tables and has no "needs attention" area.

---

## 6. Your four requested features: specifications

### 6.1 ISBN scan → auto-fill genre, price and language

**Honest limits first.**
- *Language and title/author/cover/publisher* come back reliably for many books.
- *Genre* comes back as English "BISAC-style" categories (for example `Fiction / Historical`) and needs mapping to your categories.
- *Price is unreliable.* Google Books returns `saleInfo.listPrice` only for some editions and regions, and rarely for Marathi books. Open Library has no price. So: **suggest** a price only when a currency of INR is present, never overwrite what the user typed, and leave it empty otherwise. Optionally remember the last price entered for the same publisher as a one-tap suggestion.

**Data sources (check current terms and limits first):**
1. Open Library: `GET https://openlibrary.org/api/books?bibkeys=ISBN:<isbn13>&format=json&jscmd=data` (title, authors, publishers, subjects, cover URL, pages). Language comes from the edition record (`languages` as `/languages/mar`, `hin`, `eng`).
2. Google Books: `GET https://www.googleapis.com/books/v1/volumes?q=isbn:<isbn13>&country=IN` (`volumeInfo.language` as `mr`/`hi`/`en`, `categories`, `imageLinks`, `pageCount`, `saleInfo`). Works without a key at low volume; if you add a key, restrict it and do not ship it in a public repo.
3. Fallbacks when both fail: detect script of the title (Devanagari → Marathi or Hindi, ask which; Latin → English), then leave other fields for manual entry.

**Algorithm:**
1. Normalise the ISBN (strip hyphens/spaces, validate checksum, convert ISBN-10 to ISBN-13). Store `isbn` as 13 digits on the book.
2. Check the local library first (see §6.3). If found, show the existing book and stop.
3. Query sources in parallel with an 8-second timeout. Merge: prefer Open Library for cover, Google Books for language and categories.
4. Map fields:
   - **Language:** `mr→mr`, `hi→hi`, `en→en`, `sa→sa`, anything else → `other`. Store the **code**, not text (see §7).
   - **Genre:** a map table, English category keyword → your category, for example Fiction/Novel → कादंबरी, Biography & Autobiography → चरित्र (or आत्मचरित्र if the title says "my story"), History → ऐतिहासिक, Poetry → कविता, Religion → धार्मिक, Self-Help → व्यक्तिमत्व विकास, Science → विज्ञानविषयक, Business & Economics → अर्थविषयक. Auto-select only for an exact map hit. For a weak match, show up to 3 chips as suggestions. If your categories are user-defined, use the map only for categories that exist, and let the user save a custom mapping.
   - **Price:** as above.
5. Fill only **empty** fields and mark each auto-filled field with a small "from ISBN" hint the user can clear. Never silently replace user input.
6. Cache each result locally (ISBN → metadata) so rescans work offline. Handle: no internet, not found, timeout, and API errors, each with a clear localized message and a "Fill manually" path.
7. Cover: download once, downscale (about 300 px, WebP/JPEG), store in app-private storage and keep the path on the book. Do not hotlink.

**Privacy and policy:** ISBN lookups send the ISBN (and the device IP) to Open Library/Google. Add this to the privacy policy and Data safety review, keep `INTERNET` as the only new permission, and prefer a scanner that does not need a long-lived camera permission (check whether the scanning plugin you use offers Google's code scanner, which avoids requesting `CAMERA` yourself [verify]).

**Acceptance tests:** scan an English book (language en, English categories mapped, cover stored); scan a Marathi book with no price (price stays empty); scan with airplane mode (cached or a clear error); type a price and then scan (price kept); scan the same ISBN twice (no duplicate, goes to §6.3 flow).

### 6.2 Author auto-suggestion on manual entry

**Source of suggestions (local first, instant, offline):** all distinct authors already in `books` and `wishlist`, with the number of books for each.

**Behaviour:**
- Start suggesting from the 1st character. Debounce 150 ms. Show at most 6 rows, sorted by prefix match first, then contains, then book count.
- Matching is **normalised**: lowercase, strip spaces, dots and punctuation, and use Unicode NFC so `पु. ल. देशपांडे`, `पु.ल.देशपांडे` and `पु ल देशपांडे` all match. Devanagari-aware ordering with `Intl.Collator('mr-IN')`.
- Each row shows the author name and "N books". Selecting a row fills the field with the **exact stored spelling**, which prevents spelling-variant duplicates (and the several tag filters they create).
- If the typed text is a close variant of an existing author (small edit distance after normalisation), show "Did you mean X?" before saving.
- Accessibility: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, 48 dp rows, and the list must not be hidden by the on-screen keyboard (scroll it into view).
- The ISBN metadata can also suggest an author, shown as a chip.
- Optional later: remote suggestions from Open Library author search (little Marathi coverage, so treat as extra), and Latin-to-Devanagari transliteration so typing "kadambari"-style Latin text finds Marathi names.
- Add a **translator** field. Today translators are typed into the author text in brackets, which pollutes author lists.
- Add a Settings tool "Merge authors" to fix existing spelling variants in one pass.

**Acceptance tests:** typing `पु` lists existing authors starting with it; picking a suggestion stores the identical string; typing a new author shows no row and saves normally; the list works with keyboard open on a small phone.

### 6.3 ISBN scan page: matching card opens the book

Current behaviour (screenshot): the matching card shows title, author, "At Home · My Collection" and a separate "Add another copy" link, but the card itself is not tappable.

**Spec:**
- The **whole card** is a button (`role="link"`, minimum 56 dp height, chevron on the right). Tapping opens the Book detail screen (`setSelectedBook(book); setActiveTab('bookDetail')` in this codebase) and closes the scan view. Back returns to the scan page with the previous state preserved.
- "Add another copy" stays as a secondary button inside the card and must `stopPropagation()` so it does not trigger the card.
- Multiple copies: list one card per copy, each showing its location and holder or "Out to @reader, due 01 Dec", so the user can tell the copies apart. Show "You have 2 copies" as the heading.
- Matching rule: normalised ISBN-13 first. Your existing 32 books have **no ISBN**, so also run a fallback: after the metadata lookup, compare normalised title (+ author) with the library and show "Possible match, same book?" with Yes (link this ISBN to that book) / No (new book). Add a one-time tool "Fill missing ISBNs and covers" to enrich old books in batch.
- State chip on the card uses the localized custody label (see §7), not raw `COLLECTED`.

**Acceptance tests:** scan an ISBN you own → tapping the card opens that book; scan a title-only legacy book → possible-match prompt, then ISBN is saved; two copies → two cards; Back from the book returns to the scan page.

### 6.4 Everything follows the display language (Marathi means almost no English)

**Why it is wrong today [code]:** the app mixes three kinds of text:
1. Interface text through `t()` (mostly fine).
2. Stored values shown raw: `LENT`, `COLLECTED`, `My Collection`, `At Home`, `To Person`, `Purchased`, `Holding`, `Returned`, language names, and the dropdown contents of status, location and filters (App.jsx filter dropdowns, StatusUpdateModal, BookDetailsModal).
3. Hard-coded English literals: about 24 toast messages, 9 `alert`/`confirm` calls, "Saving..." / "Save Book Details" / "Update Status" buttons, the notification titles and bodies, the WhatsApp texts, the PDF titles ("LIBRARY STATEMENT REPORT"), month names (`jan, feb…`), the "Due: …" and "N Holding" labels, and "No matching books for this author". Some translations exist but are not used, for example `legacy.Due today · {{count}}`.

**Design:**
1. **Store codes, show labels.** Replace stored English phrases with stable codes and translate at display time with `t()`.

| Concept | Codes |
|---|---|
| Custody | `IN_LIBRARY, LENT, GIFTED_OUT, LOST, DAMAGED` |
| Reading | `UNREAD, READING, FINISHED, WISHLISTED` |
| Acquisition | `PURCHASED, GIFT, BORROWED_LIBRARY, BORROWED_FRIEND` |
| Reader status | `HOLDING, RETURNED, GIFTED, LOST` |
| Language | `mr, hi, en, sa, other` |
| Built-in places | `HOME, OFFICE, WITH_READER` |

2. **User-defined items** (categories, rack locations like R1/1, custom statuses) show **as typed**, because they cannot be translated automatically. For the built-in defaults, ship translations. Optionally let users give a name per language when they create a category.
3. **One-time migration** with a mapping table that recognises every old value in all three languages (`Marathi`, `मराठी`, `LENT`, `OUT`, `My Collection`, `COLLECTED`, `At Home`, …) and converts it to a code. Run it on load, bump `schemaVersion`, keep the pre-migration `.bak`, and test it on your real backup first.
4. **Do not store sentences.** Journey entries keep structured fields only (`fromStatus, toStatus, person, dueDate, location`) and render the sentence at display time in the current language. Existing English journey notes are rebuilt from their fields during migration.
5. **Dates and numbers** through `Intl` with the active locale: `Intl.DateTimeFormat('mr-IN', …)`, optional Devanagari digits (`-u-nu-deva`) as a setting. Offer a date-style choice: *Locale (default)* or the existing compact `dd-mmm-0yy`.
6. **Messages:** WhatsApp reminder templates and notification text per language, built from the same `t()` keys, using the book's real due date (fixes F-08). Make the default country code a setting instead of hard-coding `91`.
7. **Dialogs and toasts:** replace `alert`/`confirm` with one localized `<ConfirmDialog>`/snackbar component. Move all toast strings to `t()`.
8. **Exports:** PDF titles, CSV headers and the report footer localized. Test Devanagari rendering in PDFs. They are image-based today (large and not searchable), so consider a text PDF later.
9. **Native strings:** launcher shortcut labels and any Android resource strings need `values-mr` and `values-hi` resource folders. The notification channel name needs the same. The app display name may stay "B-wise Library".
10. **Allowed English:** brand name, "ISBN", currency symbol. Everything else localized.
11. **Guardrails in CI:** a script that fails the build when (a) the three language files have different keys, (b) a JSX string literal contains Latin letters and is not wrapped in `t()` (an ESLint `no-literal-string` rule or a simple grep), and (c) a stored code has no label key.

**Acceptance test:** set the app to Marathi, walk every screen, modal, dropdown, toast, notification, WhatsApp message and exported PDF, and record any Latin-script text other than the allowed list. Then switch to English, then Hindi, and confirm that nothing stored changed and filters still match.

---

## 7. Recommended roadmap

**Phase 0: prerequisites (before feature work)**
1. Push the latest branch (§0). Tag it.
2. Fix F-01 and F-02 (data safety) and add `schemaVersion`. Add auto-backup before restore.
3. Decide the Capacitor upgrade (F-12) and do it on its own branch.

**Phase 1: correctness and release blockers**
F-06 local dates, F-03 lent date, F-04/F-05 status modal, F-07 overdue handling (+ default loan period and a due date required when lending), F-08 reminders, F-13 edge-to-edge, F-15 permissions, F-14 support button, F-16 CI and signing.

**Phase 2: the four requested features**
Data model with codes and migration (§6.4) → author suggestions (§6.2) → ISBN fields, lookup and autofill (§6.1) → clickable match card (§6.3). The code migration comes first because everything else stores and displays those codes.

**Phase 3: UI polish**
Card lists instead of tables, minimum 12 px text, a Home "needs attention" section, a bulk-scan mode, a reader loan ledger (a separate `loans[]` collection so history is never lost), safe delete with Undo, remove legacy Google Sheet code.

**Phase 4: growth and revenue** (only after §5.3 is clean)
Pro unlock via Play Billing, backup to the user's own Drive, reports, rack QR labels.

## 8. Test checklist (add to `docs/TEST_PLAN.md`)

- Fresh install, upgrade from the current build, and restore of your real backup. Library counts match before and after.
- Corrupt `bwise-library-data.json` on purpose: the app must refuse to overwrite it and offer recovery.
- Date checks at 00:30 and 23:30 India time.
- Lend → extend → return → re-lend to another reader: both readers' histories keep the loan.
- Overdue and due-soon notifications; permission denied path.
- Marathi, Hindi and English walk-through (§6.4 test), including exported PDFs and WhatsApp text.
- ISBN: valid, invalid checksum, ISBN-10, not found, offline, duplicate.
- Android 8 → 16, small phone, large phone and tablet, font size set to largest, TalkBack on.
- Release build (AAB) smoke test and Play pre-launch report.

## 9. About the `AGENTS.md` I wrote earlier

Your repo already has a better-targeted `AGENTS.md` (it correctly says not to add billing, sign-in or analytics without your approval, and not to claim Play readiness from a debug build). **Keep yours.** Copy only these items from mine: the checklist in its §10, the account-deletion rule (relevant only if you add sign-in), and the quality bar in its §8. Update yours with the points from this document's §5.3 (target API, permissions, support-button check) and with the new rules from §6.4 (codes not text; no hardcoded user-visible strings).

## 10. Review against the current repository checkout

This note was based on an older project ZIP and should not be treated as a description of the current branch. In the current checkout, Capacitor has already been upgraded to 8, the Google Sheets bridge has already been removed, Firebase sign-in is partially wired, and the repository does not contain the phone-only ISBN features or a reading-progress tab. The Capacitor 6 upgrade item in F-12 is therefore stale; verify the generated Android target level in the release build instead of repeating that upgrade.

### Confirmed and addressed in the current implementation

- **F-01/F-02:** local JSON writes now preserve a rolling `.bak`; malformed primary data is preserved, a valid local backup is recovered when available, and failure is explicit rather than resetting to an empty library. Backup restore validates its payload, previews record counts, and keeps the previous valid library before replacement.
- **F-03/F-04/F-05:** the status form now saves its selected event/lent date, returning a book no longer uses Cancel to mean a different shelf, and the location list includes configured rack locations.
- **F-06:** new date keys use the device's local calendar date.
- **F-07/F-08:** overdue loans appear in the in-app reminder list and WhatsApp text distinguishes overdue from due-today loans using the stored due date.
- **F-15:** startup no longer requests contacts or notification access; contact permission is requested when contact import is used, and `WRITE_CONTACTS` is not added. The installed contacts plugin does not expose a system contact picker. Capacitor Local Notifications 8.3 requests notification access when the first notification is scheduled.
- The supplied milestone art is used for lifetime finished-book badges at 1, 5, 10, 25, 50, 100, 250, and 500 unique books. The user-approved annual goal counts only completion dates recorded in the current year; books already marked FINISHED without a date count toward lifetime badges only.

### Still deferred or requiring owner input/configuration

- ISBN scan/lookup, author suggestions/merge, full status-code migration, complete translation of every legacy literal, and a separate loan ledger remain unimplemented; these features need their own data migrations and acceptance checks.
- Notification default loan periods, a required due date, and changing the country-code default remain product decisions; no default was invented here.
- Play policy review, privacy/Data safety disclosures, signed AAB configuration, and the remaining release-candidate checks must be completed by the owner before publishing. Firebase project/OAuth configuration, Play product IDs, and service-account access are still prerequisites for Drive sync and billing.
- The images and branding inventory are documented in [Brand assets](BRAND_ASSETS.md).
