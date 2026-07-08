import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

const MAX_SPLASH_MS = 1000;

/** Dismiss the native splash as soon as the root layout mounts; never hold longer than 1s. */
export function SplashHider() {
  useEffect(() => {
    void SplashScreen.hideAsync();

    const forceHide = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, MAX_SPLASH_MS);

    return () => clearTimeout(forceHide);
  }, []);

  return null;
}
