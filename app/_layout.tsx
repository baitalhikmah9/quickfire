import { useEffect, useMemo } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WebSeoHead } from '@/components/WebSeoHead';
import { Providers } from '@/lib/providers';
import { useThemeStore } from '@/store/theme';
import {
  FONTS,
  PALETTES,
  paletteUsesLightStatusBarContent,
} from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

/** Stable reference for static layout groups — avoids navigation descriptor churn each render. */
const ROOT_NESTED_STACK_SCREEN_OPTIONS = { headerShown: false };

export default function RootLayout() {
  const paletteId = useThemeStore((state) => state.paletteId);
  const rootStackScreenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: {
        flex: 1,
        backgroundColor: PALETTES[paletteId].background,
      },
    }),
    [paletteId]
  );

  useEffect(() => {
    // Run after mount so a thrown error cannot abort the whole module (empty #root on web).
    // Web: Clerk may normalize the return URL (path/query); skip strict pathname equality so the
    // popup can postMessage the opener and `openAuthSessionAsync` resolves with `success`.
    WebBrowser.maybeCompleteAuthSession(
      Platform.OS === 'web' ? { skipRedirectCheck: true } : {}
    );
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
        <WebSeoHead />
        <StatusBar
          style={paletteUsesLightStatusBarContent(paletteId) ? 'light' : 'dark'}
        />
        <Stack screenOptions={rootStackScreenOptions}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sso-callback" />
          <Stack.Screen name="how-to-play" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="(auth)" options={ROOT_NESTED_STACK_SCREEN_OPTIONS} />
          <Stack.Screen name="(app)" options={ROOT_NESTED_STACK_SCREEN_OPTIONS} />
          <Stack.Screen name="(admin)" options={ROOT_NESTED_STACK_SCREEN_OPTIONS} />
          <Stack.Screen name="admin" options={ROOT_NESTED_STACK_SCREEN_OPTIONS} />
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
