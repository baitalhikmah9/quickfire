import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Pressable } from '@/components/ui/Pressable';
import { hapticButtonPress } from '@/lib/haptics';

jest.mock('@/lib/haptics', () => ({
  hapticButtonPress: jest.fn(),
}));

describe('Pressable', () => {
  it('does not trigger haptics by default', () => {
    render(
      <Pressable accessibilityRole="button">
        <Text>Tap</Text>
      </Pressable>
    );

    fireEvent(screen.getByRole('button'), 'pressIn');

    expect(hapticButtonPress).not.toHaveBeenCalled();
  });

  it('triggers haptics when explicitly enabled', () => {
    render(
      <Pressable accessibilityRole="button" hapticFeedback>
        <Text>Tap</Text>
      </Pressable>
    );

    fireEvent(screen.getByRole('button'), 'pressIn');

    expect(hapticButtonPress).toHaveBeenCalledTimes(1);
  });
});
