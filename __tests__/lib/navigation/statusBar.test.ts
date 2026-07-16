import { Platform } from 'react-native';
import {
  canUseNativeStackStatusBarHidden,
  immersiveStatusBarScreenOptions,
} from '@/lib/navigation/statusBar';

const originalOS = Platform.OS;

afterEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
});

describe('canUseNativeStackStatusBarHidden', () => {
  it('is false on web', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    expect(canUseNativeStackStatusBarHidden('standalone')).toBe(false);
  });

  it('is false on iOS (StatusBar API path only — avoids RNScreens/plist conflict)', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    expect(canUseNativeStackStatusBarHidden('expo')).toBe(false);
    expect(canUseNativeStackStatusBarHidden('standalone')).toBe(false);
    expect(canUseNativeStackStatusBarHidden(null)).toBe(false);
  });

  it('is false on Android for the same unified StatusBar API path', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    expect(canUseNativeStackStatusBarHidden('standalone')).toBe(false);
  });
});

describe('immersiveStatusBarScreenOptions', () => {
  it('never sets statusBarHidden (RNScreens + setHidden conflict on iOS)', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    expect(immersiveStatusBarScreenOptions('expo')).toEqual({});
    expect(immersiveStatusBarScreenOptions('standalone')).toEqual({});
  });
});
