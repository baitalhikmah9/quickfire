import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { isAuthDisabled } from '@/lib/authMode';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';

export default function PlayLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();

  if (!isSignedIn && !authDisabled && isLoaded) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  /**
   * Never return `null` here: unmounting this Stack resets the nested navigator to `play/index`,
   * which redirects to home (`/(app)/`). Show a boot overlay instead when Clerk is still settling.
   */
  return (
    <View style={styles.stackRoot}>
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
        <View style={styles.bootOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" />
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
    backgroundColor: 'rgba(250, 249, 246, 0.92)',
  },
});
