/**
 * Production web origin for SEO (canonical URLs, Open Graph, sitemaps).
 * Override per deployment with EXPO_PUBLIC_SITE_ORIGIN when previews should not canonicalize to prod.
 */
export const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://playbackfire.com';
export const DEFAULT_PAGE_TITLE = 'Backfire | Competitive Trivia';

/** Display label for the public site (native footer link). */
export const PUBLIC_SITE_HOST_LABEL = 'playbackfire.com';

/** App Store Connect Apple ID from eas.json submit.production.ios.ascAppId. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6790765031';

/** Google Play listing for the production package. */
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.playbackfire.app';

const PAGE_TITLES: Record<string, string> = {
  '/how-to-play': 'How to Play',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
  '/delete-account': 'Delete Account',
  '/sso-callback': 'Signing In',
  '/sign-in': 'Sign In',
  '/sign-up': 'Sign Up',
  '/forgot-password': 'Reset Password',
  '/store': 'Store',
  '/settings': 'Settings',
  '/create-game': 'Create Game',
  '/game': 'Game',
  '/game-recap': 'Game Recap',
  '/rules': 'Rules',
  '/theme-picker': 'Choose Theme',
  '/language-picker': 'Choose Language',
  '/content-languages-picker': 'Content Languages',
  '/lobby-settings': 'Lobby Settings',
  '/play': 'Play',
  '/play/mode': 'Choose Mode',
  '/play/quick-length': 'Game Length',
  '/play/team-setup': 'Team Setup',
  '/play/categories': 'Choose Categories',
  '/play/board': 'Game Board',
  '/play/question': 'Question',
  '/play/answer': 'Answer',
  '/play/end': 'Match Complete',
  '/admin': 'Dashboard',
  '/admin/transactions': 'Transactions',
  '/admin/purchases': 'Purchases',
  '/admin/promo-codes': 'Promo Codes',
  '/admin/wallets': 'Wallets',
  '/admin/audit': 'Audit Log',
  '/admin/sign-in': 'Admin Sign In',
  '/admin/sign-out': 'Signing Out',
};

export function pageTitleForPath(pathname: string | undefined): string {
  const normalized = pathname && pathname !== '/' ? pathname.replace(/\/+$/, '') : '/';
  if (/^\/admin\/purchases\/[^/]+$/.test(normalized)) return 'Purchase Details | Backfire';
  if (/^\/admin\/promo-codes\/[^/]+$/.test(normalized)) return 'Promo Code Details | Backfire';
  if (/^\/admin\/wallets\/[^/]+$/.test(normalized)) return 'Wallet Details | Backfire';
  const pageTitle = PAGE_TITLES[normalized];
  return pageTitle ? `${pageTitle} | Backfire` : DEFAULT_PAGE_TITLE;
}

export function getPublicSiteOrigin(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SITE_ORIGIN : undefined;
  const trimmed = fromEnv?.trim();
  if (trimmed) {
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }
  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

/** Absolute public homepage URL (native outbound link target). */
export function getPublicSiteUrl(): string {
  return getPublicSiteOrigin();
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
