import { describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { hapticButtonPress } from '@/lib/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'Light' },
}));

describe('hapticButtonPress', () => {
  it('does not throw when the native haptics call fails synchronously', () => {
    if (Platform.OS === 'web') {
      return;
    }

    jest.mocked(Haptics.impactAsync).mockImplementationOnce(() => {
      throw new Error('Native haptics unavailable');
    });

    expect(() => hapticButtonPress()).not.toThrow();
  });
});
