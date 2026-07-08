# Task for scout

AUDIT layout consistency in an Expo Router app at '/Users/mikhail/Documents/CURSOR CODES/In Progress/backfire'. Scope: main app screens app/(app)/*.tsx (NOT the play/ subfolder), app/(auth)/*.tsx, and root screens app/index.tsx, app/terms.tsx, app/privacy.tsx, app/how-to-play.tsx. For EACH screen record concretely: 1) safe-area handling (SafeAreaView vs useSafeAreaInsets vs none, which edges), 2) horizontal padding value used and whether it comes from SPACING.screenPadding / LAYOUT.screenGutter in constants/theme.ts or a hardcoded number, 3) whether content max-width (LAYOUT.contentMaxWidth=560) is applied on wide screens, 4) scroll handling (ScrollView with contentContainerStyle? plain View? KeyboardAvoidingView?), 5) header pattern (custom back button? Stack header? inline title style), 6) background color source, 7) hardcoded fontSize/color instead of TYPE_SCALE/COLORS tokens, 8) shared scaffold components used (components/ScreenContent.tsx, LegalScrollScreen.tsx etc). Output a compact markdown table per screen plus a ranked list of the top inconsistencies (what differs, which screens, which pattern is the majority/best to standardize on). Read constants/theme.ts first to know the tokens. Do NOT edit anything.

---
**Output:**
Write your findings to exactly this path: /Users/mikhail/Documents/CURSOR CODES/In Progress/backfire/.pi-subagents/artifacts/outputs/43f2c386/.pi-subagents/artifacts/outputs/audit-main-screens.md
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