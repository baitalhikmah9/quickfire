import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BORDER_RADIUS } from '@/constants/theme';

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    getTextStyle: () => ({}),
  }),
}));

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders the title', () => {
    render(<Button title="Press me" onPress={() => {}} />);
    expect(screen.getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<Button title="Tap" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Disabled" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sets accessibilityState disabled when disabled prop is true', () => {
    render(<Button title="Disabled" onPress={() => {}} disabled />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('uses rounded-square corners (not a capsule pill)', () => {
    render(<Button title="Shape" onPress={() => {}} />);
    const button = screen.getByRole('button');
    const flat = StyleSheet.flatten(button.props.style);
    expect(flat.borderRadius).toBe(BORDER_RADIUS.button);
    // Capsule pills use ~999 or half of minHeight (56); keep squircle corners.
    expect(flat.borderRadius).toBeLessThan(28);
    expect(flat.borderRadius).toBe(14);
  });
});
