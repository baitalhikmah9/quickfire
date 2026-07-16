import { useEffect, useMemo } from 'react';
import { AppState, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar, setStatusBarHidden } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashHider } from '@/components/SplashHider';
import { WebSeoHead } from '@/components/WebSeoHead';
import { Providers } from '@/lib/providers';
import { useThemeStore } from '@/store/theme';
import { mark, markOnce } from '@/lib/startupTiming';
import {
  FONTS,
  paletteUsesLightStatusBarContent,
} from '@/constants/theme';
import { HOME_SOFT_UI } from '@/themes';
import { immersiveStatusBarScreenOptions } from '@/lib/navigation/statusBar';

mark('root layout module loaded');

SplashScreen.preventAutoHideAsync();
void SplashScreen.hideAsync();

/** Stable reference for static layout groups - avoids navigation descriptor churn each render. */
const ROOT_NESTED_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  // Standalone only — Expo Go cannot use RNScreens statusBarHidden (plist flag).
  ...immersiveStatusBarScreenOptions(),
} as const;

function hideSystemStatusBar() {
  if (Platform.OS === 'web') return;
  // expo-status-bar + RN StatusBar: covers Expo Go (no VC-based bar) and standalone races.
  try {
    setStatusBarHidden(true, 'fade');
    RNStatusBar.setHidden(true, 'fade');
  } catch {
    /* Expo Go / OS may reject; immersive UI still usable */
  }
}

export default function RootLayout() {
  markOnce('RootLayout first render');
  const paletteId = useThemeStore((state) => state.paletteId);
  // Soft-UI canvas (cream / dark) — not palette.background white, which flashes under fade pushes.
  const backgroundColor = HOME_SOFT_UI.colors.canvas;
  const navigationTheme = useMemo(() => {
    const baseTheme = paletteId === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: backgroundColor,
        card: backgroundColor,
      },
    };
  }, [backgroundColor, paletteId]);
  const rootStackScreenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: 'fade' as const,
      ...immersiveStatusBarScreenOptions(),
      contentStyle: {
        flex: 1,
        backgroundColor,
      },
    }),
    [backgroundColor]
  );

  useEffect(() => {
    // Run after mount so a thrown error cannot abort the whole module (empty #root on web).
    // Web: Clerk may normalize the return URL (path/query); skip strict pathname equality so the
    // popup can postMessage the opener and `openAuthSessionAsync` resolves with `success`.
    WebBrowser.maybeCompleteAuthSession(
      Platform.OS === 'web' ? { skipRedirectCheck: true } : {}
    );
  }, []);

  const [fontsLoaded] = useFonts({
    [FONTS.display]: require('../assets/fonts/ClashDisplay-Semibold.ttf'),
    [FONTS.displayBold]: require('../assets/fonts/ClashDisplay-Bold.ttf'),
    [FONTS.ui]: require('../assets/fonts/GeneralSans-Regular.ttf'),
    [FONTS.uiMedium]: require('../assets/fonts/GeneralSans-Medium.ttf'),
    [FONTS.uiSemibold]: require('../assets/fonts/GeneralSans-Semibold.ttf'),
    [FONTS.uiBold]: require('../assets/fonts/GeneralSans-Bold.ttf'),
  });

  if (fontsLoaded) markOnce('fonts loaded');

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Immersive chrome: keep system status bar (time / battery / wifi) hidden so
    // play UI gets vertical space. Users still open notifications / Control Center
    // with an edge swipe; OS may flash bars briefly, then we re-hide on resume.
    // Note: app.json UIStatusBarHidden only applies to standalone/dev builds, not Expo Go.
    hideSystemStatusBar();

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
          if (next === 'active') {
            lockLandscape();
            hideSystemStatusBar();
          }
        });
      })
      .catch(() => {
        /* orientation optional; avoid breaking app bootstrap */
        appStateSub = AppState.addEventListener('change', (next) => {
          if (next === 'active') hideSystemStatusBar();
        });
      });

    return () => {
      cancelled = true;
      appStateSub?.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SplashHider />
      <Providers>
        <WebSeoHead />
        <StatusBar
          hidden
          style={paletteUsesLightStatusBarContent(paletteId) ? 'light' : 'dark'}
        />
        <ThemeProvider value={navigationTheme}>
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
        </ThemeProvider>
      </Providers>
    </ErrorBoundary>
  );
}
