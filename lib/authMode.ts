export function isAuthDisabled() {
  const authOverride = process.env.EXPO_PUBLIC_DISABLE_AUTH;

  if (authOverride === 'true') {
    return true;
  }

  if (authOverride === 'false') {
    return false;
  }

  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}
