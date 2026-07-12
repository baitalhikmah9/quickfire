import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

const webSafeStack: NativeStackNavigationOptions =
  Platform.OS === 'web'
    ? {
        /** Avoid native-gesture / animation combos that can error on react-native-web. */
        animation: 'fade',
      }
    : {
        animation: 'slide_from_right',
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
  // Keep system status bar hidden on every native-stack push (Expo Go re-shows it otherwise).
  statusBarHidden: true,
  ...webSafeStack,
};
