import { Redirect } from 'expo-router';

/** Redirects to the main app. No landing screen. */
export default function IndexScreen() {
  return <Redirect href="/(app)/" />;
}
