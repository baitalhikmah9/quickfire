# Category image coverage

All **72** playable category IDs in `constants/questions.json` resolve to artwork via `getCategoryPictureSource()`:

- **Local** assets under `assets/topics/` (preferred)
- **Remote** fallbacks in `constants/categoryPictures.ts` (`FALLBACK_URIS`)

When adding a new category, add either a local PNG or a fallback URI before shipping.
