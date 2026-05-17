/**
 * Default Backfire wordmark width — matches `GameHeader` `logoOnly` / `logoTitle`
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
