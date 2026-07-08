/**
 * Temporary startup instrumentation. View on Android via:
 *   adb logcat -s ReactNativeJS
 * ponytail: dev-only console marks; delete once launch timing is diagnosed.
 */
const t0 = Date.now();
const seen = new Set<string>();

export function mark(name: string) {
  console.log(`[startup] +${Date.now() - t0}ms ${name}`);
}

/** Marks only the first occurrence — safe to call from render. */
export function markOnce(name: string) {
  if (seen.has(name)) return;
  seen.add(name);
  mark(name);
}
