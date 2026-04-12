import { useEffect } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Providers } from '@/lib/providers';
import { useThemeStore } from '@/store/theme';
import {
  FONTS,
  PALETTES,
  paletteUsesLightStatusBarContent,
} from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const paletteId = useThemeStore((state) => state.paletteId);

  useEffect(() => {
    // Run after mount so a thrown error cannot abort the whole module (empty #root on web).
    WebBrowser.maybeCompleteAuthSession();
  }, []);

  const [loaded, error] = useFonts({
    [FONTS.display]: require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    [FONTS.displayBold]: require('../assets/fonts/ClashDisplay-Bold.ttf'),
    [FONTS.ui]: require('../assets/fonts/GeneralSans-Regular.ttf'),
    [FONTS.uiMedium]: require('../assets/fonts/GeneralSans-Medium.ttf'),
    [FONTS.uiSemibold]: require('../assets/fonts/GeneralSans-Semibold.ttf'),
    [FONTS.uiBold]: require('../assets/fonts/GeneralSans-Bold.ttf'),
  });

  const fontsSettled = loaded || Boolean(error);

  useEffect(() => {
    // Web: splash + `return null` while fonts load often reads as a stuck white screen;
    // custom fonts still apply once `useFonts` resolves.
    if (Platform.OS === 'web' || fontsSettled) {
      void SplashScreen.hideAsync();
    }
  }, [fontsSettled]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let appStateSub: ReturnType<typeof AppState.addEventListener> | undefined;
    let cancelled = false;

    void import('expo-screen-orientation')
      .then((ScreenOrientation) => {
        if (cancelled) return;
        const lockLandscape = () => {
          void ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
        };
        lockLandscape();
        appStateSub = AppState.addEventListener('change', (next) => {
          if (next === 'active') lockLandscape();
        });
      })
      .catch(() => {
        /* orientation optional; avoid breaking app bootstrap */
      });

    return () => {
      cancelled = true;
      appStateSub?.remove();
    };
  }, []);

  const waitOnFonts = !fontsSettled && Platform.OS !== 'web';
  if (waitOnFonts) {
    return (
      <View
        style={[
          styles.fontWaitRoot,
          { backgroundColor: PALETTES.default.background },
        ]}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Providers>
        <StatusBar
          style={paletteUsesLightStatusBarContent(paletteId) ? 'light' : 'dark'}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { flex: 1, backgroundColor: PALETTES[paletteId].background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="how-to-play" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </Providers>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fontWaitRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
