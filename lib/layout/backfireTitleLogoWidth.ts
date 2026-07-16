/**
 * Default Backfire wordmark width - matches `GameHeader` `logoOnly` / `logoTitle`
 * when `logoWidth` is not overridden.
 */
export function getBackfireTitleLogoWidth(windowWidth: number, windowHeight: number): number {
  const defaultWidth = Math.min(
    240,
    Math.max(120, Math.round(Math.min(windowWidth, 700) * 0.28))
  );
  const compact = windowHeight < 560;
  return compact ? Math.min(defaultWidth, 160) : defaultWidth;
}

/**
 * Width passed to `BackfireTitleLogo` from `<GameHeader />` (base width + optional override,
 * then the same short-window cap as the header bar).
 */
export function getGameHeaderLogoDisplayWidth(
  windowWidth: number,
  windowHeight: number,
  logoWidthOverride?: number
): number {
  const base = logoWidthOverride ?? getBackfireTitleLogoWidth(windowWidth, windowHeight);
  const compact = windowHeight < 560;
  return compact ? Math.min(base, 160) : base;
}
