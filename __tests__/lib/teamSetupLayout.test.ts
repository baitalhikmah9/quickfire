import {
  getTeamSetupClassicBodyLayout,
  getWebTeamCardMinHeight,
} from '@/lib/layout/teamSetupLayout';

describe('getWebTeamCardMinHeight', () => {
  it('uses most of a laptop viewport so cards are not short islands', () => {
    const height = getWebTeamCardMinHeight(900);
    // ~82% of 900 = 738, clamped under 900 - 150
    expect(height).toBeGreaterThanOrEqual(700);
    expect(height).toBeLessThanOrEqual(750);
  });

  it('never exceeds the viewport minus chrome', () => {
    expect(getWebTeamCardMinHeight(800)).toBeLessThanOrEqual(650);
  });

  it('keeps a usable floor on shorter windows', () => {
    expect(getWebTeamCardMinHeight(600)).toBe(560);
  });
});

describe('getTeamSetupClassicBodyLayout', () => {
  it('centers content on wide web layout even when mainJustify is flex-start', () => {
    const layout = getTeamSetupClassicBodyLayout({
      isWebLayout: true,
      mainJustify: 'flex-start',
      setupRowMaxWidth: 1400,
    });

    expect(layout.contentContainer.justifyContent).toBe('center');
    expect(layout.contentContainer.alignItems).toBe('center');
    expect(layout.contentContainer.flexGrow).toBe(1);
    // Content-sized row so ScrollView can vertically center it (not flex:1 fill).
    expect(layout.webLandscapeRow.flexGrow).toBe(0);
    expect(layout.webLandscapeRow.maxWidth).toBe(1400);
    expect(layout.webLandscapeRow.alignSelf).toBe('center');
    // Side cards pin to frame edges (align with header back / token chip).
    expect(layout.webLandscapeRow.justifyContent).toBe('space-between');
  });

  it('keeps phone classic layout top-aligned and stretch', () => {
    const layout = getTeamSetupClassicBodyLayout({
      isWebLayout: false,
      mainJustify: 'flex-start',
      setupRowMaxWidth: 1400,
    });

    expect(layout.contentContainer.justifyContent).toBe('flex-start');
    expect(layout.contentContainer.alignItems).toBe('stretch');
  });

  it('centers when mainJustify is center outside web layout', () => {
    const layout = getTeamSetupClassicBodyLayout({
      isWebLayout: false,
      mainJustify: 'center',
      setupRowMaxWidth: 960,
    });

    expect(layout.contentContainer.justifyContent).toBe('center');
    expect(layout.contentContainer.alignItems).toBe('center');
  });
});
