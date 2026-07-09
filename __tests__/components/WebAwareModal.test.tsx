import React from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { WebAwareModal } from '@/components/WebAwareModal';

describe('WebAwareModal', () => {
  it('renders nothing when closed', () => {
    render(
      <WebAwareModal visible={false} onRequestClose={() => {}}>
        <Text>Hidden body</Text>
      </WebAwareModal>
    );

    expect(screen.queryByText('Hidden body')).toBeNull();
  });

  it('hosts children in a full-viewport shell when open', () => {
    render(
      <WebAwareModal visible onRequestClose={() => {}}>
        <View testID="modal-child">
          <Text>Open body</Text>
        </View>
      </WebAwareModal>
    );

    expect(screen.getByText('Open body')).toBeTruthy();

    if (Platform.OS === 'web') {
      expect(screen.UNSAFE_queryByType(Modal)).toBeNull();
      const child = screen.getByTestId('modal-child');
      const shell = child.parent;
      expect(shell).toBeTruthy();
      const shellStyle = StyleSheet.flatten(shell!.props.style);
      expect(shellStyle.top).toBe(0);
      expect(shellStyle.right).toBe(0);
      expect(shellStyle.bottom).toBe(0);
      expect(shellStyle.left).toBe(0);
      expect(shellStyle.width).toBe('100%');
      expect(shellStyle.height).toBe('100%');
    } else {
      expect(screen.UNSAFE_queryByType(Modal)).not.toBeNull();
    }
  });
});
