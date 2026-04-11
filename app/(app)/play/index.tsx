import { Redirect } from 'expo-router';

/** Play flow starts from home; `/play` alone redirects for deep links / old stack fallbacks. */
export default function PlayIndexRedirect() {
  return <Redirect href="/(app)/" />;
}
