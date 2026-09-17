# Taste — Design / UI

- Insists on strict visual consistency across components: equal card sizes, matching edge alignment between related elements (e.g. a "continue" card's bottom edge aligned with sibling cards), and typography matched to an existing reference (e.g. button font size/boldness matched to the header cards). Confidence: 0.85
- Expects new components to scale to the viewport like the rest of the app rather than being fixed-size, and calls out when sizes are inconsistent across views/modes. Confidence: 0.8
- Reuses existing app patterns for new UI ("make it like the other modals in the app") instead of inventing new styling. Confidence: 0.8
- Wants modals to fit the viewport at scale, without needing to scroll, and with a proper dimming/overlay background covering the content behind them. Confidence: 0.75
- Dislikes layout shift — content should stay stable when switching tabs/toggling options. Confidence: 0.7
- Gives iterative visual critiques, often with screenshots, after each change ("things are overflowing and layout is weird", "modal is too squished", "i don't like the positioning") and expects the agent to refine until approved. Confidence: 0.7
- Prefers compact, unobtrusive controls placed in otherwise empty space (small buttons, floating overlay cards in a corner) rather than prominent placement. Confidence: 0.6
- Calls out rendering bugs where content is missing/overflowing ("where is the problem choices are not showing the text", "make sure all choices are consistent size") and expects text to always be visible. Confidence: 0.6
- Expects existing formatting/design of an artifact to survive content updates — editing data in a spreadsheet/document must not wipe its styling, table object, or layout ("you messed up the design of the spreadsheet"). Confidence: 0.65
- Specifies exact hex colors for spreadsheet data presentation: the Difficulty column is conditionally formatted per value (Easy = #E2F0D9 light green, Medium = #FFF2CC light yellow, Hard = #FCE4D6 light orange) using Format > Conditional formatting "Text is exactly" rules, and rows are banded light blue #C1E4F5 on even rows and white on odd rows. Confidence: 0.8
