# Rumble Mode Feature Requirements

## Goal
- [x] Replace the existing plus/minus team selector with a fixed team-count control.
- [x] Enforce fair question distribution across teams, guesser order, and difficulty.

## Team Count Selection
- [x] Display a top-row control labeled `Number of teams`.
- [x] Show four selectable options: `2`, `3`, `4`, `6`.
- [x] Default selected option is `2`.
- [x] Keep selection behavior single-select (radio-style), so selecting one option deselects the previous option.
- [x] Update team slots in the UI immediately when selection changes.

## Supported Team Counts
- [x] Rumble mode only supports `2`, `3`, `4`, and `6` teams.
- [x] Remove the legacy increment/decrement (plus/minus) control for team count in this mode.

## Question Pool and Distribution
- [x] Total questions in a Rumble match:
  - [x] `12 easy`
  - [x] `12 medium`
  - [x] `12 hard`
- [x] Assign questions randomly while keeping distribution exactly balanced.

## Fairness Rules (Must-Have)
For each team, distribute questions so each team receives an equal count of:
- [x] first-guesser easy
- [x] second-guesser easy
- [x] first-guesser medium
- [x] second-guesser medium
- [x] first-guesser hard
- [x] second-guesser hard

In short: balance by **team x guesser order x difficulty**, not just by total question count.
- [x] Balance by **team x guesser order x difficulty**, not only total question count.

## Functional Acceptance Criteria
- [x] Team selector renders `2/3/4/6` and defaults to `2`.
- [x] Only one team-count button is active at a time.
- [x] Switching team count updates visible team rows/cards instantly.
- [x] Rumble game start rejects any unsupported team count.
- [x] On game initialization, assignment logic produces equal per-team distribution across:
  - [x] guesser order (first vs second)
  - [x] difficulty (easy/medium/hard)
- [x] Distribution is random within those constraints (not fixed question-order deterministic).

## Open Implementation Notes
- [x] If strict balancing is impossible for a selected team count and pool shape, fail early with a clear validation error instead of silently degrading fairness.
