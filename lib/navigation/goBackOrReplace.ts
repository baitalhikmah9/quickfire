import type { Href, Router } from 'expo-router';

/** Stack back when possible; otherwise replace so auth screens always have an exit. */
export function goBackOrReplace(router: Router, fallbackHref: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref);
}
