import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Providers } from '@/lib/providers';
import { useThemeStore } from '@/store/theme';
import { FONTS, paletteUsesLightStatusBarContent } from '@/constants/theme';

// Required for OAuth redirect handling (Google/Apple sign-in)
WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const paletteId = useThemeStore((state) => state.paletteId);
  const [loaded, error] = useFonts({
    [FONTS.display]: require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    [FONTS.displayBold]: require('../assets/fonts/ClashDisplay-Bold.ttf'),
    [FONTS.ui]: require('../assets/fonts/GeneralSans-Regular.ttf'),
    [FONTS.uiMedium]: require('../assets/fonts/GeneralSans-Medium.ttf'),
    [FONTS.uiSemibold]: require('../assets/fonts/GeneralSans-Semibold.ttf'),
    [FONTS.uiBold]: require('../assets/fonts/GeneralSans-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const lockLandscape = () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
    lockLandscape();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') lockLandscape();
    });
    return () => sub.remove();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Providers>
        <StatusBar
          style={paletteUsesLightStatusBarContent(paletteId) ? 'light' : 'dark'}
        />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="how-to-play" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </Providers>
    </ErrorBoundary>
  );
}
