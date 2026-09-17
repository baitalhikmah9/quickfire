---
name: trivia-gen
description: >-
  Generate, fact-check, QA, de-dupe, and import Backfire trivia packs.
  Use when creating new topic questions, topping up packs, running trivia
  fact-check/QA, checking against the live question DB, or importing CSV
  into constants/questions.json. Repo-local only.
---

# Backfire trivia generation

Repo-local workflow for new general-knowledge trivia packs. Working scratch lives in `tmp/trivia-gen/` (untracked). Do not invent a parallel pipeline.

## Current state (read this first)

| Item | Value |
| --- | --- |
| Batch 1 topics (done, shipped) | Corporations, Capital Cities, Famous Firsts, In between:, Guess The Decade |
| Batch 1 shipped count | **301** rows in `tmp/trivia-gen/game-import/trivia-batch1-import.csv` (UserIDs 8598+) after live-dupe drops. User said "last 302"; treat **301 file rows** as source of truth unless a later import log says otherwise. |
| Old pack target (batch 1) | 75 per topic (25/25/25). Superseded. |
| **New pack target** | **120 questions per topic: 40 Easy / 40 Medium / 40 Hard** |
| Live corpus | `constants/source-questions.csv` (flat CSV) and `constants/questions.json` (grouped). Rebuild JSON via `bun run seed:import` from the master CSV. |
| Import script | `scripts/import-questions-from-csv.ts` (`bun run seed:import`) |
| PinchTab driver pattern | `tmp/trivia-gen/pt_driver.py`, `fc_runner.py`, `qa_run.py` |
| Sheet insert (new way) | `gws` (Google Workspace CLI), Sheets API. Never the browser. Helper scripts in `tmp/trivia-gen/b2/`: `build_sheet_batch3_final.py`, plus `.agents/skills/backfire-question-sheet/` for the sheet itself. |
| Sheet contents | 1261 data rows, UserIDs 8598-9858, ids unique with no gaps. 13 topic blocks. Rows 1023-1262 are batch 4 (What's the connection?, Which Country). |

Batch 1 packs in `tmp/trivia-gen/export/ready-for-factcheck/` are historical (75 each). Do not regenerate those five topics unless topping up toward 120.

## Batch 2 topic queue (start here)

Exact `Topic` strings must match live category names in `constants/categories.ts` / the master CSV:

1. Match the Nickname
2. National Icons
3. Odd One Out
4. UK
5. USA
6. What year?
7. What's the connection?
8. Which Country

One topic at a time unless the user says otherwise. Prefer finishing create → fact-check → game-sense → QA → **live-dupe** → top-up before opening the next topic.

Live pack already has material in these topics (counts drift; always re-count before generate). New questions **add** toward 120 net **new** keepers after kills and live-dupe drops, or top the topic to 120 total if the user says top-up instead of net-new. Default for batch 2: **120 net new keepers per topic** (40/40/40), de-duped against the full live DB and against the new pack itself.

If the user only wants the topic brought to 120 total including existing live rows, ask once and lock that choice for the batch.

## Hard product rules

- **Family-friendly / halal filter.** Kill: music industry (songs, albums, artists, MTV-as-music, streaming-music brands as the point of the Q), alcohol-as-trivia-focus, gambling-as-trivia-focus, explicit sexual content, same-sex marriage / LGBT political framing as the answer hook, graphic violence for its own sake. Incidental brand names that are not "about music" can stay (e.g. Vienna + classical music landmark is borderline; Spotify-as-answer was killed).
- **Hostable live.** Short prompt, one clear answer a host can score. No essay answers, no multi-part, no "name any three".
- **No answer giveaways.** Question text must not contain the answer string or an obvious near-homophone spell-out.
- **No trick / None / counting-the-alphabet filler.**
- **No science-lab obscurity** unless the topic is Science. Prefer mainstream memory hooks.
- **Unique fact inside the pack.** Distinct questions can share an answer entity only when the facts differ (documented judgment call in batch 1).
- **No cross-topic duplicate facts** against live DB or other new packs in the same batch.
- **ASCII punctuation only in shipped files.** No unicode en/em dashes. Run `python3 ~/.agents/scripts/no_unicode_dashes.py` on changed pack files.
- **British-friendly spelling OK** (centre, colour) if consistent with surrounding pack tone; do not bikeshed.

### Difficulty (40 / 40 / 40)

| Tier | Intent |
| --- | --- |
| Easy | Most adults in a mixed party get it cold or with the clue. Famous landmarks, household brands, huge world events. |
| Medium | Requires a solid pub-quiz memory; one specific hook (year range, secondary fact, less famous capital). |
| Hard | Enthusiasts and sharp players; still hostable, not academic footnote bait. |

QA may retier. After retier + kills, **top up the thin tiers** until 40/40/40 keepers remain. Prefer topping Hard when Hard is thin (batch 1 lesson).

## Canonical line formats

**Working pack (semicolon, local ids):**

```text
id;question;answer;tier;topic
1;Which European capital is home to the Eiffel Tower and the Louvre Museum?;Paris;Easy;Capital Cities
```

- `tier` ∈ `Easy` | `Medium` | `Hard`
- `topic` = exact live category string
- Local `id` contiguous `1..N` per topic while editing. Renumber after removals.

**Game import CSV (comma, global UserID):**

```text
UserID,Question,Answer,Difficulty,Topic
8598,Which fast food chain introduced the Big Mac nationally in the United States in 1968?,McDonald's,Easy,Corporations
```

- Next UserID = `max(existing UserID in master CSV) + 1`
- Master reference used in batch 1: merge against full QF export; see `tmp/trivia-gen/build_game_import.py`, `merge_and_dryrun.py`

**Human review export:** numbered Q/A text under `tmp/trivia-gen/export/` (see existing `*.txt` / `ALL.txt` pattern).

## Pipeline (every topic)

Do not skip steps. **Live-dupe is mandatory before import.**

```text
1. CREATE
2. FACT-CHECK (ChatGPT wiki / web-backed tab)
3. APPLY factual corrections + re-check until NO FACTUAL MISTAKES
4. GAME-SENSE pass (hostability: KEEP / REWORK / KILL)
5. APPLY game-sense edits
6. QA ASSESSOR (tier + unsuitable/halal) → user decisions on removals/tiers
7. APPLY QA decisions, renumber
8. LIVE-DUPE + INTRA-PACK DUPE  ← required
9. TOP-UP thin tiers / holes from kills+dupes (then re-run 2-8 on new rows only)
10. FINAL MECHANICAL CHECKS
11. BUILD import CSV slice + dry-run merge
12. IMPORT only when user says ship
```

### 1. Create

Generate **at least 120** (often 130-140 raw so kills do not force a huge top-up). Enforce 40/40/40 in the generator brief.

Creator brief must include:

- topic name and format gimmick (e.g. In between = what sits between X and Y; Guess the Decade = answer is a decade string like `1980s`)
- 40 Easy / 40 Medium / 40 Hard
- output **only** `id;question;answer;tier;topic` lines
- exclusion list: music, non-halal hooks, live near-dupes already known, science-only filler when off-topic
- "no answer in question text"
- "answers short and scoreable"

Paste into ChatGPT (Trivia Creator style). Save raw to `tmp/trivia-gen/<slug>-creator.txt`. Optional v2 rewrite: `<slug>-creator-v2.txt`.

PinchTab automation may follow `tmp/trivia-gen/pt_driver.py` (max ~2 heavy tabs; fresh tab per topic).

### 2-3. Fact-check

Prompt pattern (keep stable):

```text
Please fact-check this FULL updated trivia set carefully. Only flag factual mistakes.
Ignore pure style preferences unless they create a false claim.
Keep semicolon format for any corrections.

Trivia set:
<lines>

After checking, summarize remaining factual mistakes. If none remain, say clearly on its own line:
NO FACTUAL MISTAKES
```

- Apply corrections to the pack CSV/TXT.
- Re-check full pack or corrected subset until the model returns `NO FACTUAL MISTAKES`.
- Log every factual edit in `tmp/trivia-gen/export/.../CHANGELOG.md` (or per-batch changelog).

Scripts: `fc_runner.py`, `fc_orchestrate.py`, `apply_fc2_fixes.py`.

### 4-5. Game-sense

Hostability only, not facts:

- KILL: unscoreable answers, no mainstream hook, pure counting tricks, template clones inside the pack
- REWORK: tighten wording, remove giveaways, make the answer unique
- KEEP: shippable

Apply edits; do not "fix-check" during this pass.

### 6-7. QA assessor

Prompt framing used in batch 1 (`tmp/trivia-gen/qa-in/prompts/`):

```text
Here is a trivia set for Backfire, a family-friendly live party game.
Format: id;question;answer;tier;topic
...
```

Ask for: tier changes, REMOVE list with reasons, unsuitable/non-halal section.

**User owns removal and tier final calls.** Default stance from batch 1 if user is silent and had already set policy: remove all music items and explicit sensitivity kills; apply sensible tier changes; top up afterward.

### 8. Live-dupe + intra-pack dupe (mandatory)

**Never import without this step.**

Sources of "already exists":

1. `constants/questions.json` (all live groups / prompts / answers)
2. `constants/source-questions.csv` (flat; same corpus after import)
3. Any other batch files already staged in `tmp/trivia-gen/game-import/` or export packs not yet merged
4. The current topic pack itself (exact question text, and same-fact clones)

**Exact match:** same normalized question text, or same answer + heavily overlapping question tokens on the same fact.

**Near match (batch 1 method in `tmp/trivia-gen/find_dupes_vs_live.py`):**

- Tokenize question: lowercase, strip non-alnum, words length > 3
- Jaccard on question word sets
- If answer word-sets nest either way, add **+0.30** to score (same-fact boost)
- Flag candidates with score **≥ 0.70** for human/agent review
- Also flag **same answer + same topic** when the question is a rephrase of a live row

Actions:

| Verdict | Action |
| --- | --- |
| Exact or clear same-fact dupe vs live | DROP from new pack (do not import). Log in `dropped-duplicates.csv`. |
| Near-dupe, different enough angle | Optional KEEP with note; prefer DROP when batch is healthy on count. |
| Intra-pack duplicate fact | Keep best wording; kill the rest. |
| Cross-topic same fact (new vs new or new vs live) | DROP one; live wins if already shipped. |

Write review artifacts:

- `tmp/trivia-gen/game-import/near-dup-candidates.txt`
- `tmp/trivia-gen/game-import/dropped-duplicates.csv`

Re-run after every top-up batch (new rows only is fine if the script accepts a slice).

Minimal check command (adapt paths):

```bash
python3 tmp/trivia-gen/find_dupes_vs_live.py
```

Update that script's `PACK` / topic list for batch 2 rather than copying a third version. If the script still points at `~/Downloads/trivia-gen-batch1/`, retarget it to `tmp/trivia-gen/export/...` or the current pack dir before running.

### 9. Top-up

After kills + dupes + retier, count per tier. Generate only the missing cells (e.g. "12 Hard for Which Country").

Top-up brief **must** include:

- full exclusion list of existing question texts (or at least answers+short hooks) in that topic
- music/halal bans
- "do not repeat these facts: ..."

Each top-up row re-enters fact-check → game-sense → QA → live-dupe.

Batch 1 failure mode: top-up without exclusion lists produced clones and music. Discard and regenerate when that happens; do not "edit around" a bad top-up set.

### 10. Final mechanical checks

Before import CSV build:

- [ ] Exactly **120** keepers per new topic (or user-agreed total)
- [ ] **40 / 40 / 40** Easy / Medium / Hard
- [ ] Local ids contiguous
- [ ] Schema clean: 5 fields, no bare `None` answers, no blank lines
- [ ] No answer-word giveaways (answer string not substring of question, case-insensitive, allow tiny words like `a`/`the` only)
- [ ] No duplicate question text in pack
- [ ] No duplicate facts in pack
- [ ] Live near-dupe report reviewed; drops applied
- [ ] Zero unicode en/em dashes
- [ ] Topic string matches live category spelling (`In between:`, `Guess The Decade`, `What year?`, `What's the connection?`, …)

Helpers: `final_checks.py`, `classify_export.py` (extend rather than replace).

### 11-12. Import path

1. Build `tmp/trivia-gen/game-import/trivia-batchN-import.csv` with new global UserIDs.
2. Dry-run merge into a scratch copy of the master CSV (`merge_and_dryrun.py` pattern). Confirm header `UserID,Question,Answer,Difficulty,Topic` and no id collisions.
3. On user approval, append to the real master CSV the import script reads (default `~/Downloads/QF full - Copy(No dupes).csv` unless project scripts were repointed).
4. `bun run seed:import` → refreshes `constants/questions.json`.
5. Seed Convex only when user asks (`scripts/push-seed-to-convex.ts` / dashboard). Do not push prod without an explicit order.

## PinchTab / ChatGPT ops notes

- Fresh chat tab per topic for fact-check and for create when context is dirty.
- Cap concurrent heavy tabs at 2, and never more than 2 ChatGPT generations in flight.
- Stop condition for fact-check: assistant text matches `NO FACTUAL MISTAKES`, or it returns
a `PART 1 / PART 2` revision list. Read the whole reply: a "PART 1: FATAL ERRORS" heading
alone does not mean it found errors.

### Hard-won lessons (batch 2, 13 Sep)

1. **Always pass `--tab <id>` to every pinchtab command.** The server's "current tab" is
global mutable state, so two processes that call `pinchtab tab <id>` then `pinchtab eval`
race each other and read the wrong tab. `eval`, `click`, `press`, `wait`, `text`, `snap`,
`screenshot`, `close` all accept `--tab`. Long-running waiters must be `--tab`-scoped or
they will silently cross-contaminate another topic's extraction.
2. **Verify every send.** `pinchtab click button[data-testid="send-button"] --mode dom` can
return `OK` without submitting (React state stale after a page re-render). Check that the
user-message count rose or the composer cleared, then fall back to focusing
`#prompt-textarea` and `pinchtab press Enter --tab <id>`. An unverified send is how a prompt
ends up submitted twice, into two different tabs.
3. **Extract long replies through the conversation API, not `innerText`.** ChatGPT
virtualises long messages, so `innerText` of the assistant node returns a clipped fragment
(often just a heading plus citation chips). `tmp/trivia-gen/b2/fetch_conv.py <tab> <dest>`
calls `/api/auth/session` then `/backend-api/conversation/<id>` in the page context with
`eval --await-promise` and returns the full message text.
4. **Agent sessions expire (401 `bad_session`).** A waiter that only sees errors will spin
until its timeout and report a false failure. On 401, create a new session token and
re-read the tabs: the browser tabs survive, so extract from them instead of regenerating.
5. **Select a reply by index when a tab holds two exchanges.**
`b2_run.py extract create <slug> 0` takes the first assistant message, `-1` the last.
6. **Do not trust the create reply's tier counts.** Always re-count from the parsed pack
(`normalize_pack.py`) and fix in the game-sense/QA pass.
7. Giveaway detection is a false positive for Odd One Out: the answer is one of the five
options by design. Only run the giveaway check on the other topic shapes.

### Batch 2 lessons (13 Sep, 3 topics)

1. **Apply game-sense reports by question text, not by id.** A report covering three packs
uses one id space, so `id 110` and `id 119` exist in every pack. An id-keyed applier silently
applies the wrong pack's decision. `tmp/trivia-gen/b2/apply_newrows.py` matches on question.
2. **Scope kills per pack.** A single global kill set removed the same ids from all three
packs, deleting four innocent rows. Withdrawing rows is the one step that is expensive to
undo, so log the pack name with every drop and verify row counts after each apply.
3. **Never read the topic from the header line.** `header.split(";")[-1]` is the literal string
`topic`. Read it from a data row. This wrote `topic` into 23 rows and a reviewer caught it.
4. **Phrase-level dupe checks are not enough.** A row was cleared as free because the nickname
phrase was unused, but the live DB already asked the same fact with different wording (Florence
as the birthplace of the Renaissance versus its cradle). Always probe the ANSWER and the fact,
not just the phrasing.
5. **Top-up exclusion lists must cover the whole live corpus, not one topic.** A National Icons
prompt that listed only National Icons exclusions still produced Mount Kilimanjaro and the
Lebanese cedar flag, because those live in Geography and Which Country.
6. **The creator ignores exclusion lists.** Treat every generated row as untrusted until the
dupe gate has run. Do not merge a batch before checking it.
7. **Cap creator iteration at two rounds, then author by hand.** National Icons Easy toppers
drifted off-shape three times (United Kingdom constituent nations, sensitive answers,
long multi-clause prompts). Writing 8 rows directly, with a programmatic free-check against
live and the pack, was faster and better. The agent-authored batch then needed only one
fact-check message.
8. **Decide up front whether the tier target or the reviewer's tier judgement wins.** A
reviewer judging recognition will keep pushing Hard items down to Medium; a fixed 40/40/40
target then cannot be met without re-tiering most of the pack. Batch 2 resolved it by applying
reviewer tiers and rebalancing inside the pack, and by defining Odd One Out Hard as "subtle
link" rather than "obscure subject".
9. **Rebalance by re-tiering, not by generating filler.** Work the arithmetic before generating:
with `x` rows moved up and `y` moved down, the new-row split is `a = 12 - x`, `b = x + y - 6`,
`c = 11 - y` for a 103-row pack heading to 120. Choosing `x` and `y` well avoided generating
Hard items, which are the slowest and most kill-prone to produce.
10. **Halal filter applies to hooks, not just answers.** A Moldovan wine-cellar complex passed
fact-check and game-sense because the answer was a country, but the hook is alcohol. Replace
it: the Soroca Fortress carries the same country cleanly.

Keep `created` and `fc` prompts in `b2/prompts/` as files, never as inline shell heredocs.

## Batch 2 script set

`tmp/trivia-gen/b2_run.py` drives create and fact-check (`start|wait|extract|close|tabs|status`).
Helpers live next to it in `tmp/trivia-gen/b2/`:

| Script | Purpose |
| --- | --- |
| `build_prompts.py` | Builds create prompts, injecting the live exclusion list per topic |
| `normalize_pack.py` | Raw reply to clean pack CSV + tier counts + giveaway scan |
| `build_fc_prompt.py` | Pack CSV to fact-check prompt |
| `fetch_conv.py` | Exact assistant text via the conversation API |
| `apply_fc.py` | Applies `id;question;answer;tier;topic` replacement lines to a pack |
| `apply_newrows.py` | Applies a multi-pack game-sense report, matched on question text |
| `apply_fixes.py` | Replaces rows by current id from an `id;question;answer;tier` file |
| `apply_tiers.py` | Forces ids to a tier, reports per-tier counts |
| `add_rows.py` | Appends hand-authored `question;answer;tier` rows |
| `merge_topup.py` | Appends selected creator rows by id |
| `dupe_check.py` | Live-DB Jaccard near-dupes + repeated answers + near-dup report |
| `final_check_b2.py` | Counts, contiguity, topic, duplicates, giveaways, unicode dashes |
| `classify_report.py` | Splits a game-sense report into tier-only vs text changes |

Run order for a batch:

```bash
python3 tmp/trivia-gen/b2/build_prompts.py
python3 tmp/trivia-gen/b2_run.py start create <slug>      # then: wait create <slug>
python3 tmp/trivia-gen/b2_run.py extract create <slug> 0  # 0 = first assistant msg
python3 tmp/trivia-gen/b2/normalize_pack.py <slug> "<Topic Name>"
python3 tmp/trivia-gen/b2/build_fc_prompt.py <slug>
python3 tmp/trivia-gen/b2_run.py start fc <slug>          # then: wait fc <slug>
python3 tmp/trivia-gen/b2/fetch_conv.py <fc-tab> tmp/trivia-gen/b2/fc-out/<slug>-fc.txt
python3 tmp/trivia-gen/b2/apply_fc.py <slug>
python3 tmp/trivia-gen/b2/dupe_check.py <slug>
```

## PinchTab session setup

```bash
umask 077 && pinchtab session create --agent-id trivia-gen > /tmp/pinchtab-trivia-gen.token
P_T="$(cat /tmp/pinchtab-trivia-gen.token)"
PINCHTAB_SESSION="$P_T" pinchtab tab    # verify instance is headless first
```

Check `pinchtab instance list` before starting: the instance must be `headless` so the run
does not steal window focus. Close only tabs you opened; other sessions may own tabs in the
same browser instance.

## File map

```text
tmp/trivia-gen/
  <slug>-creator.txt                 raw generate
  <slug>-creator-v2.txt              cleaned generate
  <slug>-factcheck-prompt.txt
  <slug>-factcheck.txt               model output
  <slug>-apply-corrections.txt
  export/ready-for-factcheck/        pack CSV+TXT + STATUS + CHANGELOG
  qa-in/prompts/                     QA prompts
  qa-out/                            QA_REPORT.md + per-topic
  game-import/
    trivia-batchN-import.csv         shippable new rows
    near-dup-candidates.txt          live similarity hits
    dropped-duplicates.csv
    QF-full-plus-batchN.csv          optional merged dry-run
  find_dupes_vs_live.py              live Jaccard near-dupe
  build_game_import.py
  merge_and_dryrun.py
  final_checks.py
  pt_driver.py / fc_runner.py / qa_run.py
  b2_run.py                           batch 2 driver (--tab scoped, verified send)
  b2/                                 batch 2 scratch: prompts, packs, out, dupe
```

## Agent behavior

- Load this skill for any Backfire trivia pack work.
- Prefer extending scripts in `tmp/trivia-gen/` over new frameworks.
- **Always run live-dupe before calling a pack import-ready.**
- Do not cloud-seed or overwrite `constants/questions.json` without a dry-run and user go-ahead.
- Keep STATUS.md current: topic, counts by tier, last pass, open holes.
- When something is a judgment call (borderline music, repeated answer entity), log it under Known judgment calls and move on.

## Quick start (next session)

```bash
# 1) count live rows for the next topic
python3 - <<'PY'
import csv
from collections import Counter
rows=list(csv.DictReader(open("constants/source-questions.csv")))
# or the current master QF csv if that is newer than source-questions
c=Counter(r["Topic"] for r in rows)
for t in ["Match the Nickname","National Icons","Odd One Out","UK","USA","What year?","What's the connection?","Which Country"]:
    print(t, c.get(t, 0))
PY

# 2) create 120 (40/40/40) for the first queue topic into tmp/trivia-gen/
# 3) fact-check → game-sense → QA → live-dupe → top-up → final_checks
# 4) stop for user review before import
```

Default first topic unless user overrides: **Match the Nickname**.

## Batch status

- Batch 1 (shipped further): Corporations, Capital Cities, Famous Firsts, In between:, Guess The Decade.
- Batch 2 (complete, not imported): Match the Nickname, National Icons, Odd One Out. See
  `tmp/trivia-gen/b2/STATUS.md` for counts, corrections, kills, live-dupe drops and known
  judgment calls.
- Batch 2 queue remaining: UK, USA, What year?, What's the connection?, Which Country.
- Batch 3 (complete, **in the Google Sheet**, not imported): UK, USA, What year?. `Mikhail` tab
  rows 663-1022, UserIDs 9259-9618, each pack 120 rows at 40/40/40, written through the
  Sheets API. See the batch-3 section in `tmp/trivia-gen/b2/STATUS.md`.
- Batch 3 queue remaining: What's the connection?, Which Country.
- Batch 4 (complete, **in the Google Sheet**, not imported): What's the connection? and
  Which Country. `Mikhail` tab rows 1023-1262, UserIDs 9619-9858, 120 rows each at 40/40/40.
  Queue is now empty: every topic in the batch plan has 120 rows.

## Batch 4 lessons (13 Sep, connection + country packs)

1. **The live-dupe gate is blind to un-imported packs.** `dupe_check.py` reads
   `constants/questions.json`, which only contains imported rows, so the batch-2 packs that sit
   in the sheet but were never imported are invisible to it. Batch 4 shipped 9 same-fact
   collisions with National Icons and Odd One Out before `cross_pack_check.py` caught them. Run
   `python3 tmp/trivia-gen/b2/cross_pack_check.py <new-slugs>` in the same round as the live
   gate, every time.
2. **"National Icons" overlaps every country-shaped topic.** Its rows are "X is most strongly
   associated with which country?", which is the same fact as "In which country would you find
   X?". Add `National Icons` and `Match the Nickname` to the exclusion lists of any country,
   icon or landmark topic (done in `build_prompts_b4.py` RELATED).
3. **A creator can re-emit a live row that is already in its exclusion list.** Batch 4
   reproduced the live Shrek-characters and major-currencies rows verbatim, and the live
   Colosseum row. Exclusion lists reduce, they do not prevent. The gates are mandatory.
4. **A reviewer's duplicate claim needs quoting, not trusting.** The peer claimed 11 live
   duplicates; 7 were real, 4 did not exist. Verify each claim against
   `constants/source-questions.csv` with a *narrow* search and print every hit, not the first
   four (a truncated grep for "Colosseum" hid the real row and made a correct claim look
   fabricated).
5. **"Which country contains X" is the category's house style.** The live Which Country rows
   use the same stems, so a reviewer's "82 of 120 rows share three shells, rewrite 50 of them"
   is over-strict. Cap the real sub-clusters instead (cuisine, flags, modern cities) and leave
   the stems alone.
6. **Short replies never trip `b3_wait.py`.** Its completion test needs `asstLen > 300`, so a
   142-character replacement reply loops until timeout. Pull it with
   `python3 tmp/trivia-gen/b2/fetch_conv.py <tab-id>` instead.
7. **Never call `pinchtab tab close` with an empty argument.** It closes the active tab, which
   during a run is the live generation tab. Also close each phase's tab when it finishes: batch 4
   reached 12 open ChatGPT tabs, well past the 2-tab budget.
8. **Hand-authoring beats another create round when the model is rate limited.** Six replacement
   rows were written by hand and verified against the live CSV plus all eight packs with a
   one-off grep script. Cheaper, faster, and no quality loss for single well-known facts.
9. **Cross-pack collisions are usually the same fact in two shapes**, for example "Goulash is
   most strongly associated with which country?" (National Icons) and "Which country is
   traditionally associated with goulash?" (Which Country). The scoring in
   `cross_pack_check.py` catches these through the shared answer plus the +0.30 nesting bonus.

## Batch 3 lessons (13 Sep, sheet via `gws` + second-opinion review)

1. **Exclusion lists must be the WHOLE live corpus, not the same topic.** `build_topup_b3.py`
   filtered live rows by `Topic == <this topic>`, so top-ups duplicated live rows from other
   topics: UK "Granite City"/Aberdeen cloned a live Match the Nickname row, and USA Brown v.
   Board + JFK Peace Corps cloned live US History rows (caught by `dupe_check.py`). Filter the
   full question list for top-up prompts.
2. **Template clusters are the number one game-sense finding.** The batch-3 reviewer and the
   peer both flagged the US state-capital run (15 rows originally) and the amendment run
   (11 rows). Keep about 4-6 of each shape in a 120-row pack; top-up prompts that list the
   pack will make the creator regenerate the same shapes, so exclude them explicitly.
3. **Two review passes disagree, and that is useful.** The first reviewer proposed 29 kills,
   the peer (gpt-5.6-sol over pi-intercom) rejected 9 of them as obscure-but-fair and found
   more template clones. Verify each kill against the actual row before applying (the first
   reviewer's `uk 79` "same Salisbury fact as 42" was real, its `A Clockwork Orange` kill was
   taste, not fact).
4. **Kills break 40/40/40.** Recompute `Easy - n / Medium - n / Hard - n` after every kill and
   tier move, then generate exactly the missing counts. `apply_review.py` prints the deficit.
   Tier moves can push a band over 40: UK ended at 44 Easy after the reviewer's moves, so four
   genuine Easy rows had to be cut (`fixes/b3-review-kills2.txt`).
5. **`merge_topup.py <slug> <comma-separated-ids>`** takes ids **from `create/<slug>-topup.txt`**,
   not a file path. Copy the creator reply into that exact path first (keep the raw reply under
   `create/raw/`).
6. **Fact-check prompts must carry the REAL pack ids.** `build_fc_slice.py` renumbers the slice
   1..N, so a later `apply_fc.py` would write corrections onto the wrong rows. Use
   `build_fc_tail.py <slug> <phase> <n>`, which keeps the pack ids.
7. **Apply fact-check and review rounds before any id-changing step, or re-run the fact-check.**
   Killing rows renumbers the tail, which invalidates any in-flight prompt built on the old ids.
   When in doubt, rebuild the prompt and re-run.
8. **`gws` sheet insert gotchas.** The sheet's grid was only 1000 rows, so table and
   conditional-format ranges silently clamped to `endRowIndex: 1000` until
   `appendDimension` added 200 rows. Table `TriviaBank_2` and the three `TEXT_EQ` rules on
   column D then extended to row 1022 normally. Duplicate UserIDs are not allowed: rows 8896-8898
   were duplicated across `In between:` and `Match the Nickname`, fixed by shifting every
   batch-2/batch-3 id by +3 (`A303:A1022`) so the imported batch-1 ids stayed untouched.
