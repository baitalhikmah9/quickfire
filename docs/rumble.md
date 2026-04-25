# Rumble Mode Feature Requirements

## Goal
Replace the existing plus/minus team selector with a fixed team-count control and enforce fair question distribution across teams, guesser order, and difficulty.

## Team Count Selection
- Display a top-row control labeled `Number of teams`.
- Show four selectable options: `2`, `3`, `4`, `6`.
- Default selected option is `2`.
- Selection behavior is single-select (radio-style):
  - selecting one option automatically deselects the previous option.
- When selection changes, team slots shown in UI must update immediately to match the selected count.

## Supported Team Counts
- Rumble mode only supports `2`, `3`, `4`, and `6` teams.
- Any legacy increment/decrement (plus/minus) control must be removed for this mode.

## Question Pool and Distribution
- Total questions in a Rumble match:
  - `12 easy`
  - `12 medium`
  - `12 hard`
- Questions are assigned randomly, but distribution must remain exactly balanced.

## Fairness Rules (Must-Have)
For each team, distribute questions so each team receives an equal count of:
- first-guesser easy
- second-guesser easy
- first-guesser medium
- second-guesser medium
- first-guesser hard
- second-guesser hard

In short: balance by **team x guesser order x difficulty**, not just by total question count.

## Functional Acceptance Criteria
- Team selector renders `2/3/4/6` and defaults to `2`.
- Only one team-count button can be active at a time.
- Switching from one team count to another updates visible team rows/cards instantly.
- Rumble game start rejects any unsupported team count.
- On game initialization, assignment logic produces equal per-team distribution across:
  - guesser order (first vs second)
  - difficulty (easy/medium/hard)
- Distribution is random within those constraints (not fixed/question-order deterministic).

## Open Implementation Notes
- If strict balancing is impossible for a selected team count and pool shape, fail early with a clear validation error instead of silently degrading fairness.
