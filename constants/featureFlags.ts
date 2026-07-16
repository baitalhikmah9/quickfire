/**
 * Product toggles: implementations stay in the codebase; flip to `true` to ship surfaces again.
 * When false, Hot Seat rounds stay at 0, in-match Hot Seat never schedules, and related UI is omitted.
 */
export const SHOW_HOT_SEAT_UI = false;

/**
 * When false, App Language and Trivia Languages rows/modals are omitted from Settings.
 * Picker screens and locale store logic remain in the codebase.
 */
export const SHOW_LANGUAGE_SETTINGS_UI = false;

/**
 * When false, home mode tiles omit the information ("i") button and explanation modal entry.
 * Mode info overlay code stays in the hub screen for easy re-enable.
 */
export const SHOW_HOME_MODE_INFO_UI = false;
