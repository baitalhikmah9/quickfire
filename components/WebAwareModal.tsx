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
 */
export function WebAwareModal({ visible, onRequestClose, children }: WebAwareModalProps) {
  if (!visible) {
    return null;
  }

  if (Platform.OS === 'web') {
    return <View style={styles.webOverlayRoot}>{children}</View>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlayRoot: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
});
