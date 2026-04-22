import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { isAuthDisabled } from '@/lib/authMode';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';

export default function PlayLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const authDisabled = isAuthDisabled();

  if (!isLoaded && !authDisabled) {
    return null;
  }

  if (!isSignedIn && !authDisabled) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
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
  );
}
