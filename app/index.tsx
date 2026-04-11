import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/** Redirects to the main app. No landing screen. */
export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(app)/');
  }, [router]);

  return null;
}
