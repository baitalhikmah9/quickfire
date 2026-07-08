# Task for scout

AUDIT shared layout primitives in an Expo Router app at '/Users/mikhail/Documents/CURSOR CODES/In Progress/backfire'. Scope: components/*.tsx (ScreenContent, LegalScrollScreen, WebAwareModal, ErrorBoundary, others), features/lobby/**, and all router layout files: app/_layout.tsx, app/(app)/_layout.tsx, app/(auth)/_layout.tsx, app/(app)/play/_layout.tsx, app/admin/_layout.tsx, app/(admin)/_layout.tsx. Questions: 1) What screen-scaffold components exist and which screens actually import them (grep usage counts)? 2) Do the router _layout files configure headers/safe-areas consistently (headerShown, screenOptions, contentStyle)? 3) Is there duplication between app/admin/ and app/(admin)/ routes — are they copies with divergent styles? 4) Are modals presented consistently (compare docs/modals.md to actual usage of WebAwareModal / presentation:'modal')? 5) Where do screens re-implement what a shared scaffold could provide (safe area + gutter + maxWidth + scroll)? Output: inventory of primitives with usage counts, gaps, and a recommendation for what a single shared Screen scaffold should own vs what stays per-screen. Read constants/theme.ts for tokens. Do NOT edit anything.

---
**Output:**
Write your findings to exactly this path: /Users/mikhail/Documents/CURSOR CODES/In Progress/backfire/.pi-subagents/artifacts/outputs/43f2c386/.pi-subagents/artifacts/outputs/audit-primitives.md
This path is authoritative for this run.
Ignore any other output filename or output path mentioned elsewhere, including output destinations in the base agent prompt, system prompt, or task instructions.

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```