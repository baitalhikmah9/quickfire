# Double Down — Brand Guidelines

Authoritative reference for color, typography, and surface treatment when implementing UI. Align app tokens (`constants/theme.ts`, components) with these rules where practical.

## Visual direction: Soft UI (neumorphism)

Primary marketing and home surfaces use a **soft, raised-surface** look: controls read as molded from the same material as the canvas, with soft outer shadows and subtle inner highlights—not flat fills or strong saturated fills for the main chrome.

- **Surfaces:** Off-white / white cards and buttons that sit slightly above a warm cream canvas.
- **Depth:** Large corner radii, soft drop shadows behind primary and secondary squircles.
- **Density:** Generous whitespace; center-weighted layout in landscape; premium, airy spacing.

## Color palette

| Role | Name | Hex (reference) | Usage |
|------|------|-----------------|--------|
| Canvas | Warm cream | `#FAF9F6`–`#FDFBF7` | Screen background; slightly warm off-white |
| Surface | Pure white | `#FFFFFF` | Raised cards and primary controls |
| Text & icons | Charcoal | `#333333` | Primary copy, icons, wordmark on light surfaces |
| Neumorphic shade | Soft gray | Derived from canvas | Very subtle shadow tones for inset/raised edges |

**Legacy accents (in-game / system):** Progress, timers, and some gameplay UI may still use **Electric Blue** (`#007BFF`), **Lively Orange** (`#FF8C00`), and **Vivid Purple** (`#A18FFC`) for functional states. New lobby/home surfaces should prioritize the cream–white–charcoal system above.

## Typography

Two bundled typefaces remain the implementation default (**Clash Display**, **General Sans** from `assets/fonts/`). Map them to this hierarchy:

| Level | Style | Usage |
|-------|--------|--------|
| Logo wordmark | Bold geometric sans; title case “DoubleDown” | Brand title on home |
| Logo capline | All caps “TRIVIA”; lighter weight; increased letter-spacing | Tagline under wordmark |
| Primary CTA | Bold; all caps | e.g. “PLAY TRIVIA” |
| Supporting line | Regular; sentence case; smaller | e.g. “Start a new challenge” |
| Status / meta | Small; regular; optional bold for emphasized numbers | e.g. countdown; “Last Score: **18/20**” |
| Functional labels | All caps (where used) | Round labels, status chips (align with existing app patterns) |

Overall voice: clean, modern **geometric sans-serif** feel—tight hierarchy, restrained decoration.

## Logo

- **Mark:** Two overlapping / interlocking **D** letterforms—thick, rounded, geometric.
- **Lockup:** Mark optional; wordmark “DoubleDown” with “TRIVIA” beneath in the capline style above.
- **Color on light UI:** Dark charcoal (`#333333`) for the full lockup on cream/white.

## Iconography

- Prefer **thin stroke / outline** icons (hollow play triangle, outlined settings with interior detail—not heavy filled glyphs).
- Stroke color aligns with charcoal text on light surfaces.

## Components (home / lobby patterns)

- **Primary action:** Large **squircle** (very high radius, ~24–32pt+ at phone scale): play icon above, bold CTA line, then smaller descriptive line; soft neumorphic shadow.
- **Secondary / settings:** Smaller squircle, same family of treatment (top-trailing placement is acceptable in landscape).
- **Footer info:** Centered stack for time-sensitive copy and last score; smaller type; emphasize numeric outcomes with weight contrast.

## Layout

- **Orientation:** Landscape-first on phone for this flow (match game orientation strategy).
- **Alignment:** Vertical axis centered for hero and primary CTA; status anchored bottom-center unless a pattern dictates otherwise.

## Implementation note

`constants/theme.ts` may still list earlier token names (e.g. blue-forward `background`). When touching home/lobby screens, prefer tokens or local styles that match **canvas, surface, and charcoal text** above, and update shared tokens when migrating surfaces wholesale.
