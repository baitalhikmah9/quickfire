# Double Down — Brand Guidelines

Authoritative reference for color and typography when implementing UI. Align app tokens (`constants/theme.ts`, components) with these rules where practical.

## Color palette

The system uses three primary colors with corresponding shade scales (define scales in theme tokens as the product matures).

| Role | Name | Hex | Usage |
|------|------|-----|--------|
| Primary accent | Electric Blue | `#007BFF` | Progress bars; main **Start Challenge** button |
| Secondary brand | Lively Orange | `#FF8C00` | Segmented progress bars; secondary button outlines |
| Tertiary | Vivid Purple | `#A18FFC` | Utility actions (e.g. **Settings**, **Profile**) |

## Typography

Two typefaces establish hierarchy.

| Level | Typeface | Usage |
|-------|----------|--------|
| Headlines | **Clash Display** | Primary headings; gaming experience and core brand messaging |
| Body | **General Sans** | Descriptive paragraphs; functional copy (game mode setup, invitations, etc.) |
| Labels & caplines | **General Sans** | UI labels such as `ROUND 1`, `PLAYER STATUS` — use **all caps** for these elements |

### Bundled fonts

The app loads **Clash Display** (600 / 700) and **General Sans** (400–700) from `assets/fonts/` via `expo-font` in `app/_layout.tsx`. Files are from [Fontshare](https://www.fontshare.com/) (ITF FFL — see `assets/fonts/README.txt`).
