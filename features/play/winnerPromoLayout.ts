/**
 * Match-end (winner) promo QR card sizing.
 *
 * Phone landscape leaves a flex band between the scoreboard and slogan.
 * iOS was under-sized by tight height/width shares (~height*0.24), leaving
 * empty cream around the three QR tiles. Android/web keep prior density.
 */

export type WinnerPromoLayoutInput = {
  windowWidth: number;
  windowHeight: number;
  platform: string;
};

export type WinnerPromoLayout = {
  compact: boolean;
  tiny: boolean;
  /** Outer promo card width (QR is slightly smaller by card padding). */
  promoWidth: number;
  /** Horizontal gap between the three platform cards. */
  promoGap: number;
};

/**
 * Size the three QR promo cards for the match-end screen.
 * iOS phone landscape uses a larger share of width/height so codes fill the flex band.
 */
export function getWinnerPromoLayout(input: WinnerPromoLayoutInput): WinnerPromoLayout {
  const width = Math.max(0, input.windowWidth);
  const height = Math.max(0, input.windowHeight);
  const compact = height < 800;
  const tiny = height < 500;
  const iosPhone = input.platform === 'ios' && compact;

  const maxCap = compact ? 150 : 240;
  const widthFloor = compact ? 96 : 130;
  // iOS: grow past the old 0.14 width share so cards use horizontal room too.
  const widthShare = width * (iosPhone ? (tiny ? 0.17 : 0.16) : compact ? 0.14 : 0.16);
  const widthCap = Math.max(widthFloor, widthShare);

  // Prior tiny share (0.24) capped cards at ~96pt on 402-tall phones.
  const heightShare = iosPhone
    ? tiny
      ? 0.38
      : 0.34
    : tiny
      ? 0.24
      : compact
        ? 0.28
        : 0.34;
  const heightCap = Math.max(72, height * heightShare);

  const promoWidth = Math.min(maxCap, widthCap, heightCap);
  const promoGap = Math.min(36, Math.max(10, width * (iosPhone ? 0.02 : 0.025)));

  return { compact, tiny, promoWidth, promoGap };
}

/**
 * QR bitmap size inside a promo card of the given width.
 * Chrome matches promo card horizontal padding (compact 6×2 / roomy 8×2).
 * iOS trims 2pt so the code fills more of the white tile face.
 */
export function getWinnerPromoQrSize(promoWidth: number, compact: boolean, platform: string): number {
  const chrome = compact ? 12 : 16;
  const iosTighten = platform === 'ios' ? 2 : 0;
  return Math.max(56, Math.max(0, promoWidth) - chrome + iosTighten);
}

/**
 * Font size for the orange / green / red match-end action buttons.
 * iOS phone landscape was a touch small at 14–15pt; bump by 2pt there only.
 */
export function getWinnerActionLabelSize(input: {
  platform: string;
  compact: boolean;
  tiny: boolean;
  textScale?: number;
}): number {
  const scale = input.textScale ?? 1;
  const base = input.tiny ? 14 : input.compact ? 15 : 17;
  const iosPhoneBump = input.platform === 'ios' && input.compact ? 2 : 0;
  return Math.round((base + iosPhoneBump) * scale);
}
