# API flows (gws)

`gws` is the Google Workspace CLI (`/opt/homebrew/bin/gws`). All sheet work goes
through the Sheets API. Never drive the sheet with a browser: the UI merge bugs,
lazy pickers, and headless clipboard limits do not exist here.

Sheet id: `13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU`
Tabs: `Trivia Database`, `Mikhail`. Account: mikhailspeaks@gmail.com.

## Auth check (before any write)

```bash
gws people people get --params '{"resourceName": "people/me", "personFields": "emailAddresses"}'
```

Must return `mikhailspeaks@gmail.com`. If stale, the human re-runs the gws login.

## Read

Full tab, values only (ground truth; the UI can render a cell empty while it holds a value):

```bash
gws sheets spreadsheets values get --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "range": "Mikhail!A1:E1000"}' \
  > /tmp/mikhail.json
python3 .agents/skills/backfire-question-sheet/scripts/sheet_rows.py /tmp/mikhail.json
```

Single cell or block: `Mikhail!D342`, `Mikhail!A301:E305`.

Layout (table range, banding, CF rules):

```bash
gws sheets spreadsheets get --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "ranges": ["Mikhail"], "fields": "sheets(properties,conditionalFormats,tables)"}'
```

## Write rows

Save the current response first (recovery copy), then write the full sorted grid.
`RAW` keeps values verbatim:

```bash
gws sheets spreadsheets values update --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "range": "Mikhail!A1:E662", "valueInputOption": "RAW"}' \
  --json "$(cat /tmp/mikhail-sorted-values.json)"
```

Where `/tmp/mikhail-sorted-values.json` is
`{"range":"Mikhail!A1:E662","majorDimension":"ROWS","values":[...]}` — header plus all
rows. Build it with `sheet_rows.py --sort --out grid.json`.

Single cell:

```bash
gws sheets spreadsheets values update --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "range": "Mikhail!D342", "valueInputOption": "RAW"}' \
  --json '{"range": "Mikhail!D342", "majorDimension": "ROWS", "values": [["Medium"]]}'
```

The API edits values only. Formatting, tables, banding are untouched. Re-read after writing.

Sorting recipe (stable within a tier; unknown Difficulty sorts last in its topic):

```python
drank = {"Easy": 1, "Medium": 2, "Hard": 3}
topics = list(dict.fromkeys(r[4] for r in rows))
rows.sort(key=lambda r: (topics.index(r[4]), drank.get(r[3], 9)))
```

## Conditional formatting

List rules:

```bash
gws sheets spreadsheets get --params \
  '{"spreadsheetId": "13sCvR45Gzar8uUrZk9DT2LLqv4PK-JxSsb2Egz-prxU", "ranges": ["Mikhail"], "fields": "sheets(properties.title,conditionalFormats)"}'
```

Row indices are 0-based and the header is row 0, so sheet rows `D2:D662` are
`startRowIndex: 1, endRowIndex: 662`, columns `startColumnIndex: 3, endColumnIndex: 4`.

Expected: exactly three `TEXT_EQ` rules (Easy `#E2F0D9`, Medium `#FFF2CC`, Hard `#FCE4D6`),
hex as `backgroundColor` `red/green/blue` 0-1 floats. Example request body:

```json
{"requests": [{"addConditionalFormatRule": {"rule": {
  "ranges": [{"sheetId": 859722469, "startRowIndex": 1, "endRowIndex": 662, "startColumnIndex": 3, "endColumnIndex": 4}],
  "booleanRule": {"condition": {"type": "TEXT_EQ", "values": [{"userEnteredValue": "Easy"}]},
    "format": {"backgroundColor": {"red": 0.8862745, "green": 0.9411765, "blue": 0.8509804}}}},
  "index": 0}}]}
```

Delete stale rules highest index first (one `deleteConditionalFormatRule` per rule; each
`{sheetId, index}` pair in the same batch is applied in order):

```json
{"requests": [
  {"deleteConditionalFormatRule": {"sheetId": 859722469, "index": 4}},
  {"deleteConditionalFormatRule": {"sheetId": 859722469, "index": 3}}
]}
```

## Table range

`TriviaBank_2` must cover `A1:E<last>`. The API row write does not move it; confirm after
any row-count change in the `spreadsheets.get` output above. Adjust in the Sheets UI
(`Table menu > Adjust table range`) or the API table request.

## Recovery

- Data: rewrite from the saved pre-write pull.
- Formatting: Sheets UI `File > Version history > See version history`, restore the last
  good version, then re-apply data with the write above.

## Banned

The Sheets UI CSV import ("Replace current sheet") wipes formatting and deletes the
Sheet Table. The gviz endpoints (`out:json` errors, `out:html` merges row 1) and headless
clipboard reads are unreliable. Use the API for everything.
