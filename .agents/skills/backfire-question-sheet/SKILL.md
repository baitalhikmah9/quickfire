---
name: backfire-question-sheet
description: >-
  Maintain the Backfire question Google Sheet ("new gen knowledge qs") with the
  gws CLI (Google Workspace CLI): pull tab values, sort a tab by topic then
  Easy/Medium/Hard, write rows back, manage difficulty conditional formatting,
  and push topic renames into the app. Use when the user adds or edits questions
  in the Backfire sheet, says the sheet formatting is broken, or wants a question
  topic renamed in the sheet or in the game.
---

# Backfire question sheet

Repo-local workflow for the shared Google Sheet that holds Backfire questions. It is a
review/collation surface that mirrors what gets imported into the game. Content generation
itself lives in the `trivia-gen` skill.

The Sheets UI is read-only context here. All changes go through the Sheets API via
`gws` (`gws sheets ...`). Do not drive the sheet with a browser; the API is faster,
exact, and sees the true cell values.

## Sheet

| Item | Value |
| --- | --- |
| Sheet id | `13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU` |
| Tabs | `Trivia Database`, `Mikhail` |
| Columns | `ID`, `Question`, `Answer`, `Difficulty`, `Topic` |
| Account | mikhailspeaks@gmail.com (gws OAuth identity; check with `gws people people get`) |
| Table objects | `TriviaBank` (Trivia Database), `TriviaBank_2` (Mikhail) |

## Conventions (do not drift)

1. Rows are grouped by **Topic**, and inside each topic ordered **Easy -> Medium -> Hard**
   (stable: keep the author's order within a tier).
2. `Difficulty` is colour-coded by conditional formatting on `D2:D<last row>`, condition
   `Text is exactly`, one rule per tier:

   | Value | Hex |
   | --- | --- |
   | `Easy` | `#E2F0D9` |
   | `Medium` | `#FFF2CC` |
   | `Hard` | `#FCE4D6` |

3. The Sheet Table range must cover exactly the data: `A1:E<last row>`. Rows are banded
   `#C1E4F5` (even) / white (odd).
4. Never renumber, reorder away, or drop the user's IDs. They are the game UserIDs.
5. `Topic` strings must match the live category titles exactly (see `constants/categories.ts`).

## Prerequisites

`gws` is on PATH (`/opt/homebrew/bin/gws`). Auth lives in `~/.config/gws/`. Verify before
writing:

```bash
gws people people get --params '{"resourceName": "people/me", "personFields": "emailAddresses"}'
```

It must return `mikhailspeaks@gmail.com`. If auth is stale, the human re-runs the gws login.

## Read the tab

`values.get` returns true cell values (what the UI and copy/paste hide behind rendering):

```bash
gws sheets spreadsheets values get --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "range": "Mikhail!A1:E1000"}'
```

Query one cell or block the same way (`Mikhail!D342`, `Mikhail!A301:E305`).
`scripts/sheet_rows.py` parses a saved response, reports gap rows, and emits the sorted grid.
Sheet layout metadata (table range, banding, CF rules) comes from
`spreadsheets.get` with `fields=sheets(properties,conditionalFormats,tables)`.

## Bulk update (the only safe write path)

The API writes values only; formatting, tables, and banding on the tab are never touched.
This replaces the old browser import, and the old import is banned: the Sheets UI
"Replace current sheet" import wipes cell formatting and deletes the Sheet Table.

1. Build the full sorted grid (header + all data rows) per the conventions.
   `scripts/sheet_rows.py --sort --out` produces exactly this.
2. Write it back in one call (`RAW` so nothing is reinterpreted):

```bash
python3 - sorted.json > values.json   # {"range":"Mikhail!A1:E662","majorDimension":"ROWS","values":[...]}
gws sheets spreadsheets values update --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "range": "Mikhail!A1:E662", "valueInputOption": "RAW"}' \
  --json "$(cat values.json)"
```

Single-cell edits use the same call with a one-cell range.

## Conditional formatting (verify, do not assume)

Sorts and user edits can leave stale or duplicated rules (e.g. old `D2:D302` rules next
to live `D2:D662` ones, plus stray single-cell rules from manual fixes). Stale rules are
harmless duplicates of the same colours, but rules that vanish leave dead static fills:
colours look right yet no longer follow the values.

**Always verify rules exist and cover the data** after any write:

```bash
gws sheets spreadsheets get --params \
  '{"spreadsheetId": "...", "ranges": ["Mikhail"], "fields": "sheets(properties.title,conditionalFormats)"}'
```

Expected: exactly three `TEXT_EQ` rules on column D (`D2:D<last>`), one per tier with the
convention colours. Delete stale rules with `batchUpdate` `deleteConditionalFormatRule`
(highest index first). Recreate missing rules with `addConditionalFormatRule`.

## Table range

`spreadsheets.get` shows the table object and its range. `TriviaBank_2` on Mikhail currently
covers `A1:E<last>` and the API row write does not move it, but whenever the row count
changes, confirm it still matches. Adjust via the Sheets UI (`Table menu > Adjust table
range`) or the API's table update request.

## Recovery

If the data is wrecked, rewrite it from the last known-good pull (keep one: save the
`values.get` response before every bulk write). For formatting damage use the Sheets UI:
`File > Version history > See version history`, pick the version before the bad change,
`Restore this version`, then re-apply data with the safe write above.

## Topic rename (repo side)

A topic rename is **display-only**. The `categorySlug` is a DB key baked into every
`canonicalKey`, so keep it and pin it explicitly.

1. Change the display name in `constants/questions.json`, `constants/categories.ts`,
   `convex/seed/categories.json`, `convex/seed/categoryTranslations.json`,
   `features/play/categorySections.ts` (grouping is keyed on the title), and the `Topic`
   column of `constants/source-questions.csv`; update the expectation in
   `__tests__/app/categories.test.tsx`.
2. Pin the old slug in `scripts/normalize-questions.ts`:
   `SLUG_BY_THEME_GROUP = { <themeGroup>: '<old-slug>' }`.
3. Verify: run `normalize-questions.ts` from a temp cwd seeded with the edited
   `constants/questions.json`, and confirm the regenerated seed files are identical.
4. `bun run typecheck`.
5. Seed the game only when the user asks: `bun run seed:push` (dev) / `seed:push:prod`.

## Gotchas

- gviz (`tqx=out:json` access error, `out:html` merges the header row into row 1) and
  clipboard copy in headless browsers are unreliable. The API is the source of truth.
- gviz can skip fully empty rows, so gviz "row numbers" are positions, not sheet rows.
  Derive sheet rows from the array you wrote instead.
- Do not trust a single cell read from a rendered page; `values.get` on that range is
  the ground truth (a column can render empty while the cell holds a value).
- `batchUpdate` is atomic per request batch; unrelated collaborator edits can still shift
  what you see afterwards. Re-read after writing.

## Files

- `scripts/sheet_rows.py` - parse a saved `values.get` response (or gviz dump); report gap
  rows; emit the sorted sheet-ready JSON/CSV.
- `references/api-flows.md` - exact gws command sequences for read, write, conditional
  formatting, table range and recovery.

## See also

- `trivia-gen` skill: generating, fact-checking and de-duping the question content.
