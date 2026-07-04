import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

/** Dismiss the native splash once real app chrome is mounted beneath it. */
export function SplashHider() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return null;
}
