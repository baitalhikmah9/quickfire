import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { isAuthDisabled } from '@/lib/authMode';
import { landscapeStackScreenOptions } from '@/lib/navigation/landscapeStack';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const authDisabled = isAuthDisabled();

  if (!isLoaded && !authDisabled) {
    return null;
  }

  if (isSignedIn || authDisabled) {
    return <Redirect href="/(app)/" />;
  }

  return <Stack screenOptions={landscapeStackScreenOptions} />;
}
