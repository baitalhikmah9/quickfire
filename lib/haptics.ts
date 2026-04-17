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
