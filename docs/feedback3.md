# Feedback 3 - Implementation Checklist

## Feature: Rumble Mode UI Cleanup
- [ ] Remove top cluttered controls for theme/lifeline switching in Rumble (lifelines are not used in this mode).
- [ ] Replace top display with a simpler header showing each team name (small text) and score.
- [ ] Keep Rumble UI trimmed to only gameplay-critical elements.

## Feature: Rumble Round Timing and Flow
- [x] Implement question flow timeline:
  - [x] `0-30s`: question visible, no team name shown.
  - [x] `31s`: first selected team appears and starts answer window.
  - [x] `61-75s`: transition window (no second team yet).
  - [x] `76s`: second selected team appears.
  - [x] `90s`: round ends; no further answers accepted.
- [x] Ensure "Show answer" control is unavailable until second team is revealed (after `76s`).
- [x] After reveal, allow result marking for:
  - [x] first-picked team correct
  - [x] second-picked team correct
  - [x] neither correct

## Feature: Rumble Team Selection Per Question
- [x] For each question, randomly select two distinct teams from active teams:
  - [x] one assigned as first picker
  - [x] one assigned as second picker
- [x] Prevent duplicate selection of the same team for both pick slots on one question.

## Feature: Rumble Fairness Algorithm
- [x] At game start, precompute assignment to keep distribution fair across all teams.
- [x] Enforce equal distribution by:
  - [x] question value bucket (`100`, `200`, `300`)
  - [x] pick order (first vs second)
- [x] Guarantee each team gets the same count of:
  - [x] first-pick `100`
  - [x] second-pick `100`
  - [x] first-pick `200`
  - [x] second-pick `200`
  - [x] first-pick `300`
  - [x] second-pick `300`
- [x] Keep assignments randomized within constraints (not fixed/static order).
- [x] Add validation: if strict fairness cannot be met for current configuration, fail early with a clear error.

## Feature: Question Select Screen Layout Polish
- [ ] Align question cards/boxes level with the related icon row.
- [ ] Reduce question box height to create a tighter, more level layout.
- [ ] Increase image/icon visual size so cards and imagery match target mockup.
- [ ] Apply final spacing and alignment pass after reference image is received/confirmed.

## Feature: Tokens, Coupons, and Store
- [ ] Implement token system UX and logic end-to-end.
- [ ] Add coupon/code redemption flow (including free-token codes).
- [ ] Finish store surface and connect it to token balances and redemptions.

## Feature: Release Readiness / Pilot Distribution
- [ ] Prepare a build/release candidate suitable for external feedback.
- [ ] Share with pilot users and gather structured feedback.
- [ ] Prepare a "free permanent access" path for selected community/youth groups.
