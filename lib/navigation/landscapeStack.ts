import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Native stack defaults for a landscape-only app: card transitions and horizontal
 * swipe-back only (no modal slide-from-bottom).
 */
export const landscapeStackScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureDirection: 'horizontal',
  fullScreenGestureEnabled: true,
  presentation: 'card',
};
