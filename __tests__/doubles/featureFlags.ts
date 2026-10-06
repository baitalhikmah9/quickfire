/**
 * Test double for `@/constants/featureFlags`.
 * Production flags are immutable consts; tests flip flags via `__setFeatureFlags`
 * without mutating production modules or leaking feature gates.
 */

export let SHOW_HOT_SEAT_UI = false;
/** Mirrors the shipped default in `constants/featureFlags.ts`. */
export let SHOW_LANGUAGE_SETTINGS_UI = true;
export let SHOW_HOME_MODE_INFO_UI = false;

export function __setFeatureFlags(next: {
  SHOW_HOT_SEAT_UI?: boolean;
  SHOW_LANGUAGE_SETTINGS_UI?: boolean;
  SHOW_HOME_MODE_INFO_UI?: boolean;
}): void {
  if (next.SHOW_HOT_SEAT_UI !== undefined) SHOW_HOT_SEAT_UI = next.SHOW_HOT_SEAT_UI;
  if (next.SHOW_LANGUAGE_SETTINGS_UI !== undefined) {
    SHOW_LANGUAGE_SETTINGS_UI = next.SHOW_LANGUAGE_SETTINGS_UI;
  }
  if (next.SHOW_HOME_MODE_INFO_UI !== undefined) {
    SHOW_HOME_MODE_INFO_UI = next.SHOW_HOME_MODE_INFO_UI;
  }
}

export function __resetFeatureFlagsDouble(): void {
  SHOW_HOT_SEAT_UI = false;
  SHOW_LANGUAGE_SETTINGS_UI = true;
  SHOW_HOME_MODE_INFO_UI = false;
}
