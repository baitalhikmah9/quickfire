/** Launch / boot chrome — aligned with home canvas and system dark mode. */
export const BOOT_SCREEN_COLORS = {
  light: '#FAF9F6',
  dark: '#000000',
} as const;

export function getBootScreenBackground(
  scheme: 'light' | 'dark' | null | undefined
): string {
  return scheme === 'dark' ? BOOT_SCREEN_COLORS.dark : BOOT_SCREEN_COLORS.light;
}
