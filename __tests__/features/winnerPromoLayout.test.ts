import { describe, expect, it } from '@jest/globals';
import {
  getWinnerActionLabelSize,
  getWinnerPromoLayout,
  getWinnerPromoQrSize,
} from '@/features/play/winnerPromoLayout';

/** iPhone landscape-ish short viewport used on the match-end screen. */
const IPHONE_LANDSCAPE = { windowWidth: 874, windowHeight: 402 };

describe('getWinnerPromoLayout', () => {
  it('sizes iOS phone landscape QR cards larger than the prior tight height cap', () => {
    const ios = getWinnerPromoLayout({ ...IPHONE_LANDSCAPE, platform: 'ios' });
    const android = getWinnerPromoLayout({ ...IPHONE_LANDSCAPE, platform: 'android' });
    const web = getWinnerPromoLayout({ ...IPHONE_LANDSCAPE, platform: 'web' });

    // Prior formula: min(150, max(96, 874*0.14), max(72, 402*0.24)) ≈ 96.5
    expect(android.promoWidth).toBeCloseTo(96.48, 1);
    expect(web.promoWidth).toBeCloseTo(96.48, 1);

    // iOS fills more of the flex promo band between scoreboard and slogan.
    expect(ios.promoWidth).toBeGreaterThan(android.promoWidth + 30);
    expect(ios.promoWidth).toBeGreaterThanOrEqual(140);
    expect(ios.promoWidth).toBeLessThanOrEqual(150);
    expect(ios.tiny).toBe(true);
    expect(ios.compact).toBe(true);
  });

  it('keeps large desktop web cards on tall viewports', () => {
    const layout = getWinnerPromoLayout({
      windowWidth: 1280,
      windowHeight: 900,
      platform: 'web',
    });
    expect(layout.compact).toBe(false);
    expect(layout.tiny).toBe(false);
    // min(240, max(130, 1280*0.16=204.8), max(72, 900*0.34=306)) = 204.8
    expect(layout.promoWidth).toBeCloseTo(204.8, 1);
  });
});

describe('getWinnerPromoQrSize', () => {
  it('uses tighter card chrome on iOS so the bitmap fills more of the tile', () => {
    const promoWidth = 148;
    const iosQr = getWinnerPromoQrSize(promoWidth, true, 'ios');
    const androidQr = getWinnerPromoQrSize(promoWidth, true, 'android');
    // compact pad 6×2 = 12; iOS +2 tighten → 148-12+2 = 138
    expect(iosQr).toBe(138);
    expect(androidQr).toBe(136);
    expect(iosQr).toBeGreaterThan(androidQr);
  });
});

describe('getWinnerActionLabelSize', () => {
  it('bumps iOS phone action labels by 2pt without changing android/web', () => {
    expect(
      getWinnerActionLabelSize({ platform: 'ios', compact: true, tiny: true })
    ).toBe(16);
    expect(
      getWinnerActionLabelSize({ platform: 'android', compact: true, tiny: true })
    ).toBe(14);
    expect(
      getWinnerActionLabelSize({ platform: 'web', compact: true, tiny: true })
    ).toBe(14);
    expect(
      getWinnerActionLabelSize({ platform: 'ios', compact: false, tiny: false })
    ).toBe(17);
  });
});
