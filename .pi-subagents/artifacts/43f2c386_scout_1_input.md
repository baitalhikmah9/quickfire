# Task for scout

AUDIT layout consistency in the play flow of an Expo Router app at '/Users/mikhail/Documents/CURSOR CODES/In Progress/backfire'. Scope: app/(app)/play/*.tsx and features/play/** (especially features/play/components/PlayScaffold.tsx and PlayAnswerPanel.tsx), plus app/(app)/game.tsx and app/(app)/game-recap.tsx. Note the game screen forces landscape. For EACH screen record: 1) whether it uses PlayScaffold or hand-rolls layout, 2) safe-area handling and edges, 3) padding/gutter values vs SPACING/LAYOUT tokens in constants/theme.ts, 4) scroll/overflow handling (project rule: flex:1/minHeight:0, ScrollView when content can overflow, density from useWindowDimensions), 5) header/back-button pattern, 6) hardcoded sizes/colors vs tokens, 7) landscape handling differences. Output a compact markdown table per screen plus ranked top inconsistencies with the pattern that should become standard. Read constants/theme.ts and PlayScaffold.tsx first. Do NOT edit anything.

---
**Output:**
Write your findings to exactly this path: /Users/mikhail/Documents/CURSOR CODES/In Progress/backfire/.pi-subagents/artifacts/outputs/43f2c386/.pi-subagents/artifacts/outputs/audit-play-flow.md
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