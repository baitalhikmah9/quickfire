/**
 * Production web origin for SEO (canonical URLs, Open Graph, sitemaps).
 * Override per deployment with EXPO_PUBLIC_SITE_ORIGIN when previews should not canonicalize to prod.
 */
export const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://playbackfire.com';

export function getPublicSiteOrigin(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SITE_ORIGIN : undefined;
  const trimmed = fromEnv?.trim();
  if (trimmed) {
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }
  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

/** Builds an absolute canonical URL for the current path (web SEO). */
export function canonicalUrlForPath(pathname: string | undefined): string {
  const origin = getPublicSiteOrigin();
  const raw =
    !pathname || pathname === ''
      ? '/'
      : pathname.startsWith('/')
        ? pathname
        : `/${pathname}`;
  return new URL(raw, origin).href;
}
