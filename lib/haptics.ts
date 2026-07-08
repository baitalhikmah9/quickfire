import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Light impact on press-in; no-op on web and if the runtime rejects (e.g. unsupported). */
export function hapticButtonPress(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    /* Haptics are optional; tapping should never crash when the native module is unavailable. */
  }
}

/** Tiny selection tick (e.g. randomizer reel passing tiles); no-op on web/unsupported. */
export function hapticTick(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.selectionAsync().catch(() => {});
  } catch {
    /* optional */
  }
}

/** Success notification haptic (e.g. randomizer landing); no-op on web/unsupported. */
export function hapticSuccess(): void {
  if (Platform.OS === 'web') return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {
    /* optional */
  }
}
