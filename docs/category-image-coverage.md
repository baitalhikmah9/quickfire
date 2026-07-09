# Category image coverage

Playable category IDs resolve artwork via `getCategoryPictureSource()`:

- **Local only** — PNGs under `assets/topics/` mapped in `constants/categoryPictures.ts`
- **No remote fallbacks** — if a category has no local image, the function returns `null` and UI shows **MISSING** (`MISSING_CATEGORY_PICTURE_LABEL`)

When adding a new category, add a local PNG and a `LOCAL` entry before shipping.
