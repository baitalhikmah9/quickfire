import { Platform } from 'react-native';
import { Redirect, Stack } from 'expo-router';

/**
 * Standalone admin routes (public entry points like sign-in).
 * The `(admin)/` group provides the authenticated admin shell.
 */
export default function AdminStandaloneLayout() {
  // Block native access — admin is web-only
  if (Platform.OS !== 'web') {
    return <Redirect href="/(app)/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="promo-codes" />
      <Stack.Screen name="wallets" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-out" />
    </Stack>
  );
}
