import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

export type WebAwareModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * RN `Modal` inside nested web layouts (Expo Router, SafeAreaView, etc.) can crash or fail to paint.
 * Match `WagerInfoModal` / `TopicColumnPickerModal`: unmount when closed; on web use `position: fixed`
 * instead of `Modal`; on native use `Modal` with hardware back via `onRequestClose`.
 *
 * Always host children in a full-viewport shell so overlay scrims (flex:1 or absoluteFill) cover the
 * entire screen — native `Modal` does not size direct children by default.
 */
export function WebAwareModal({ visible, onRequestClose, children }: WebAwareModalProps) {
  if (!visible) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlayRoot} testID="web-aware-modal-shell">
        {children}
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.nativeFillShell} testID="web-aware-modal-shell">
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlayRoot: {
    // `fixed` escapes nested RN-web layouts (SafeAreaView, padded scaffolds).
    // Explicit width/height keeps flex children and absoluteFill scrims full-viewport.
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    flex: 1,
    zIndex: 99999,
  },
  nativeFillShell: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
