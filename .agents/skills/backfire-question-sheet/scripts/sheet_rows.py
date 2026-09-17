#!/usr/bin/env python3
"""Parse a Backfire question tab and emit the sorted sheet-ready grid.

Primary input is a saved `values.get` response (see the skill):

    gws sheets spreadsheets values get --params \
      '{"spreadsheetId": "<id>", "range": "Mikhail!A1:E1000"}' > tab.json
    python3 sheet_rows.py tab.json                       # report only
    python3 sheet_rows.py tab.json --sort --out grid.json  # sheet-ready grid

It also accepts the legacy gviz out:html dump (kept for offline use).

Output is the full grid as JSON: {"range","majorDimension","values"}, ready to pass to
`values update`. Keeps the first five columns (ID, Question, Answer, Difficulty, Topic),
trims whitespace, drops fully empty rows, and reports any row with a missing cell.
--sort orders by topic (first-seen order) then Easy/Medium/Hard, stable inside a tier.
Rows with an unknown Difficulty sort last inside their topic.

Row numbers reported here match the sheet when the input is a values.get response.
For a gviz dump they are positions only: gviz can skip fully empty rows.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys

COLUMNS = ("ID", "Question", "Answer", "Difficulty", "Topic")
DIFFICULTY_RANK = {"Easy": 1, "Medium": 2, "Hard": 3}
ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S)
CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def parse_values_response(path: str) -> list[list[str]]:
    data = json.load(open(path, encoding="utf-8"))
    values = data.get("values", [])
    if not values:
        return []
    rows: list[list[str]] = []
    start = 1 if [c.strip() for c in (values[0] + [""] * 5)[:5]] == list(COLUMNS) else 0
    for raw in values[start:]:
        cells = [(c or "").strip() for c in (list(raw) + [""] * len(COLUMNS))[: len(COLUMNS)]]
        if any(cells):
            rows.append(cells)
    return rows


def parse_gviz_html(path: str) -> list[list[str]]:
    text = open(path, encoding="utf-8", errors="replace").read()
    rows: list[list[str]] = []
    for tr in ROW_RE.findall(text):
        cells = [
            html.unescape(TAG_RE.sub("", c)).replace("\xa0", " ").strip()
            for c in CELL_RE.findall(tr)
        ]
        cells = (cells[: len(COLUMNS)] + [""] * len(COLUMNS))[: len(COLUMNS)]
        if any(cells):
            rows.append(cells)
    return rows


def sort_rows(rows: list[list[str]]) -> list[list[str]]:
    topics = list(dict.fromkeys(r[4] for r in rows))
    return sorted(rows, key=lambda r: (topics.index(r[4]), DIFFICULTY_RANK.get(r[3], 9)))


def write_grid(path: str, tab: str, last_row: int, rows: list[list[str]]) -> None:
    grid = {
        "range": f"{tab}!A1:E{last_row}",
        "majorDimension": "ROWS",
        "values": [list(COLUMNS)] + rows,
    }
    if path.endswith(".json"):
        json.dump(grid, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    else:
        with open(path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
            w.writerow(list(COLUMNS))
            w.writerows(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="values.get JSON or gviz out:html dump")
    ap.add_argument("--sort", action="store_true", help="order by topic then Easy/Medium/Hard")
    ap.add_argument("--out", help="write the sheet-ready grid (JSON or CSV by extension)")
    ap.add_argument("--tab", default="Mikhail", help="tab name for the output range")
    ap.add_argument("--gviz", action="store_true", help="force gviz HTML parsing")
    args = ap.parse_args()

    text = open(args.input, encoding="utf-8", errors="replace").read(4096)
    try:
        rows = parse_gviz_html(args.input) if (args.gviz or text.lstrip().startswith("<")) else parse_values_response(args.input)
    except (json.JSONDecodeError, KeyError) as e:
        print(f"cannot parse {args.input}: {e}", file=sys.stderr)
        return 2
    print(f"rows: {len(rows)}", file=sys.stderr)

    for i, r in enumerate(rows, start=2):
        missing = [name for name, value in zip(COLUMNS, r) if not value]
        if missing:
            print(
                f"  row {i}: missing {', '.join(missing)} | {r[4] or '(no topic)'} | {r[1][:60]}",
                file=sys.stderr,
            )

    if args.sort:
        rows = sort_rows(rows)
    if args.out:
        write_grid(args.out, args.tab, len(rows) + 1, rows)
        print(f"wrote {args.out} ({len(rows)} rows)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
