import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { Head } from 'expo-router/head';
import { canonicalUrlForPath } from '@/constants/site';

const DEFAULT_TITLE = 'QuickFire — competitive trivia';
const DEFAULT_DESCRIPTION =
  'QuickFire is a competitive multiplayer trivia game. Play real-time matches and climb the board.';

/**
 * Injects canonical + Open Graph URLs for the static web export (official site: playquickfire.com).
 * No-op on native — web-only technical SEO.
 */
export function WebSeoHead() {
  if (Platform.OS !== 'web') return null;
  return <WebSeoHeadInner />;
}

function WebSeoHeadInner() {
  const pathname = usePathname();
  const canonical = canonicalUrlForPath(pathname);

  return (
    <Head>
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={DEFAULT_TITLE} />
      <meta property="og:description" content={DEFAULT_DESCRIPTION} />
      <meta property="og:site_name" content="QuickFire" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={DEFAULT_TITLE} />
      <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
    </Head>
  );
}
