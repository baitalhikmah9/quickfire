import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemedAlertHost } from '@/components/ThemedAlertModal';
import { hideThemedAlert, showThemedAlert, useThemedAlertStore } from '@/store/themedAlert';
import { useThemeStore } from '@/store/theme';

describe('ThemedAlert', () => {
  beforeEach(() => {
    useThemeStore.setState({ paletteId: 'dark' });
    useThemedAlertStore.setState({
      visible: false,
      title: '',
      message: '',
      buttons: [],
    });
  });

  afterEach(() => {
    act(() => {
      hideThemedAlert();
    });
  });

  it('renders nothing when no alert is shown', () => {
    render(<ThemedAlertHost />);
    expect(screen.queryByTestId('themed-alert-modal')).toBeNull();
  });

  it('shows title, message, and buttons from showThemedAlert', () => {
    render(<ThemedAlertHost />);

    act(() => {
      showThemedAlert('Leave Match?', 'Leaving discards the session.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive' },
      ]);
    });

    expect(screen.getByTestId('themed-alert-modal')).toBeTruthy();
    expect(screen.getByText('Leave Match?')).toBeTruthy();
    expect(screen.getByText('Leaving discards the session.')).toBeTruthy();
    expect(screen.getByText('Stay')).toBeTruthy();
    expect(screen.getByText('Leave')).toBeTruthy();
  });

  it('uses a dark surface card when the dark palette is active', () => {
    render(<ThemedAlertHost />);

    act(() => {
      showThemedAlert('Dark card', 'Body');
    });

    const card = screen.getByTestId('themed-alert-card');
    const style = StyleSheet.flatten(card.props.style);
    // Dark palette cardBackground is #111E2E — must not stay pure white.
    expect(style.backgroundColor).not.toBe('#FFFFFF');
    expect(style.backgroundColor).not.toBe('#fff');
    expect(String(style.backgroundColor).toLowerCase()).not.toBe('white');
  });

  it('invokes button onPress and dismisses', () => {
    const onLeave = jest.fn();
    render(<ThemedAlertHost />);

    act(() => {
      showThemedAlert('Confirm', 'Body', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]);
    });

    fireEvent.press(screen.getByText('Leave'));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('themed-alert-modal')).toBeNull();
  });

  it('defaults to a single OK button when none are provided', () => {
    render(<ThemedAlertHost />);

    act(() => {
      showThemedAlert('Need tokens', 'Buy more to play.');
    });

    expect(screen.getByText('OK')).toBeTruthy();
    fireEvent.press(screen.getByText('OK'));
    expect(screen.queryByTestId('themed-alert-modal')).toBeNull();
  });
});
