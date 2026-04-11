import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/" />;
  }

  return <Stack screenOptions={landscapeStackScreenOptions} />;
}
