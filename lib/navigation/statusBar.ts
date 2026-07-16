import { Platform } from 'react-native';

/**
 * Whether native-stack may set `statusBarHidden` on screen options.
 *
 * Always false. RNScreens drives the status bar only when Info.plist has
 * `UIViewControllerBasedStatusBarAppearance = YES`, but Expo Go and our
 * `StatusBar.setHidden` path require that key to be NO. Using both APIs
 * redboxes on iOS. Immersive chrome is applied only via StatusBar APIs in
 * `app/_layout.tsx` (and re-applied on AppState resume).
 */
export function canUseNativeStackStatusBarHidden(
  _appOwnership?: string | null
): boolean {
  void _appOwnership;
  if (Platform.OS === 'web') return false;
  return false;
}

/** Spread into native-stack `screenOptions` for immersive (status-bar-hidden) UI. */
export function immersiveStatusBarScreenOptions(
  appOwnership?: string | null
): { statusBarHidden: true } | Record<string, never> {
  return canUseNativeStackStatusBarHidden(appOwnership)
    ? { statusBarHidden: true }
    : {};
}
