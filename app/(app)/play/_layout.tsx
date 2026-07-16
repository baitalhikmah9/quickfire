import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { isAuthDisabled } from '@/lib/authMode';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';
import { useThemeStore } from '@/store/theme';

export default function PlayLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();
  useThemeStore((state) => state.paletteId);
  const surfaceColors = getPlaySurfaceColors();

  if (!isSignedIn && !authDisabled && isLoaded) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  /**
   * Never return `null` here: unmounting this Stack resets the nested navigator to `play/index`,
   * which redirects to home (`/(app)/`). Show a boot overlay instead when Clerk is still settling.
   */
  return (
    <View style={[styles.stackRoot, { backgroundColor: surfaceColors.canvas }]}>
      <Stack screenOptions={landscapeStackScreenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="mode" />
        <Stack.Screen name="quick-length" />
        <Stack.Screen name="team-setup" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="board" />
        <Stack.Screen name="question" />
        <Stack.Screen name="answer" />
        <Stack.Screen name="end" />
      </Stack>
      {!isLoaded && !authDisabled ? (
        <View
          style={[styles.bootOverlay, { backgroundColor: surfaceColors.bootScrim }]}
          pointerEvents="auto"
        >
          <ActivityIndicator size="large" color={surfaceColors.textPrimary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stackRoot: { flex: 1 },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
