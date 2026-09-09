import { afterEach, describe, expect, it } from '@jest/globals';
import { getPlaySurfaceColors } from '@/features/play/playSurfaceColors';
import { PALETTES, relativeLuminance } from '@/constants/theme';
import { useThemeStore } from '@/store/theme';

describe('getPlaySurfaceColors', () => {
  afterEach(() => {
    useThemeStore.setState({ paletteId: 'default' });
  });

  it('provides a visible light-mode topic matte distinct from white surface and cream canvas', () => {
    const colors = getPlaySurfaceColors();
    // Default soft-ui palette is light (cream canvas).
    expect(colors.isDark).toBe(false);
    expect(colors.topicImageMatte).toBeDefined();
    expect(colors.topicImageMatte).toEqual(expect.any(String));
    expect(colors.topicImageMatte).not.toBe(colors.surface);
    expect(colors.topicImageMatte).not.toBe(colors.canvas);
    // Must be darker than pure white so MISSING frames read as cards, not voids.
    expect(relativeLuminance(colors.topicImageMatte!)).toBeLessThan(0.85);
    // Readable label color for the matte.
    expect(colors.missingPictureLabelColor).toBeDefined();
    expect(colors.missingPictureLabelColor).toEqual(expect.any(String));
  });

  it('uses distinct navy canvas and surface colors in dark mode', () => {
    useThemeStore.setState({ paletteId: 'dark' });

    const colors = getPlaySurfaceColors();

    expect(colors.isDark).toBe(true);
    expect(colors.canvas).toBe(PALETTES.dark.background);
    expect(colors.surface).toBe(PALETTES.dark.cardBackground);
    expect(colors.canvas).not.toBe('#000000');
    expect(colors.surface).not.toBe(colors.canvas);
    expect(PALETTES.dark.border).not.toBe(colors.surface);
  });

  // SAFETY: Test fixture / double boundary cast justified by controlled test setup.
  it('keeps light-mode topic labels as white bars with dark type', () => {
    const colors = getPlaySurfaceColors();

    expect(colors.isDark).toBe(false);
    expect(colors.topicLabelBackground).toBe('#FFFFFF');
    expect(colors.topicLabelText).toBe('#111111');
    expect(colors.controlBackground).toBe(colors.surface);
    expect(colors.hoverSurface).toBe('#FDFCFA');
  });

  it('uses dark-friendly topic labels and chrome tokens in dark mode', () => {
    useThemeStore.setState({ paletteId: 'dark' });

    const colors = getPlaySurfaceColors();

    expect(colors.isDark).toBe(true);
    expect(colors.topicLabelBackground).toBe(PALETTES.dark.cardBackground);
    expect(colors.topicLabelBackground).not.toBe('#FFFFFF');
    expect(colors.topicLabelText).toBe(PALETTES.dark.textOnBackground);
    expect(colors.topicLabelText).not.toBe('#111111');
    expect(colors.controlBackground).toBe(PALETTES.dark.cardBackground);
    expect(colors.hairlineBorder).not.toContain('15, 23, 42');
    expect(colors.iconChipBackground).not.toBe('rgba(255, 255, 255, 0.95)');
    expect(colors.dangerSoftBackground).not.toBe('#FEE2E2');
    expect(colors.hoverSurface).not.toBe('#FDFCFA');
    expect(colors.bootScrim).not.toContain('240, 235, 227');
    expect(colors.activeTurnFace).not.toBe('#FFF3EC');
    expect(colors.activeTurnFace).toBe('#163749');
    expect(colors.activeTurnNestedFill).toBe(colors.activeTurnFace);
    expect(colors.activeTurnOnFace).toBe('#06B6D4');
    expect(colors.activeTurnAccent).toBe('#06B6D4');
    expect(colors.boardCanvas).toBe('#0F172A');
    expect(colors.boardCardBackground).toBe('#1E293B');
    expect(colors.boardInnerFrame).toBe('#0B1120');
    expect(colors.boardTileBackground).toBe('#334155');
    expect(colors.boardTileBorder).toBe('#475569');
    expect(colors.boardSpentBackground).toBe('#475569');
  });

  it('keeps the warm light-mode active-turn face (not solid brand orange)', () => {
    const colors = getPlaySurfaceColors();

    expect(colors.isDark).toBe(false);
    expect(colors.activeTurnFace).toBe('#FFF3EC');
    expect(colors.activeTurnOnFace).toBe('#FF6B00');
    expect(colors.activeTurnNestedFill).toBe(colors.activeTurnFace);
    expect(colors.activeTurnAccent).toBe('#FF6B00');
    expect(colors.boardCanvas).toBe('#F5F5F0');
    expect(colors.boardCardBackground).toBe('#FFFFFF');
    expect(colors.boardInnerFrame).toBe('#FFF7F0');
    expect(colors.boardTileBackground).toBe('#F9FAFB');
    expect(colors.boardTileBorder).toBe('#D1D5DB');
    expect(colors.boardSpentBackground).toBe('#E5E7EB');
  });
});
