import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { immersiveStatusBarScreenOptions } from '@/lib/navigation/statusBar';

const webSafeStack: NativeStackNavigationOptions =
  Platform.OS === 'web'
    ? {
        /** Avoid native-gesture / animation combos that can error on react-native-web. */
        animation: 'fade',
      }
    : {
        animation: 'fade',
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      };

/**
 * Native stack defaults for a landscape-only app: card transitions and horizontal
 * swipe-back only (no modal slide-from-bottom).
 */
export const landscapeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'card',
  // Omit statusBarHidden in Expo Go — RNScreens redboxes without VC-based status bar plist.
  // Standalone/dev-client: keep system bar hidden on every native-stack push.
  ...immersiveStatusBarScreenOptions(),
  ...webSafeStack,
};
