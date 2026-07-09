import { describe, expect, it } from '@jest/globals';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { relativeLuminance } from '@/constants/theme';

describe('getPlaySurfaceColors', () => {
  it('provides a visible light-mode topic matte distinct from white surface and cream canvas', () => {
    const colors = getPlaySurfaceColors();
    // Default soft-ui palette is light (cream canvas).
    expect(colors.isDark).toBe(false);
    expect(colors.topicImageMatte).toBeDefined();
    expect(typeof colors.topicImageMatte).toBe('string');
    expect(colors.topicImageMatte).not.toBe(colors.surface);
    expect(colors.topicImageMatte).not.toBe(colors.canvas);
    // Must be darker than pure white so MISSING frames read as cards, not voids.
    expect(relativeLuminance(colors.topicImageMatte!)).toBeLessThan(0.85);
    // Readable label color for the matte.
    expect(colors.missingPictureLabelColor).toBeDefined();
    expect(typeof colors.missingPictureLabelColor).toBe('string');
  });
});
