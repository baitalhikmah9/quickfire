import { describe, expect, it } from '@jest/globals';
import { getMatchScorePillMetrics } from '@/features/play/scorePillLayout';

describe('getMatchScorePillMetrics', () => {
  it('grows score chrome on wide/tall viewports vs phone landscape', () => {
    const phone = getMatchScorePillMetrics({
      width: 780,
      height: 360,
      teamCount: 2,
    });
    const desktop = getMatchScorePillMetrics({
      width: 1440,
      height: 900,
      teamCount: 2,
    });

    expect(desktop.minHeight).toBeGreaterThan(phone.minHeight);
    expect(desktop.scoreFont).toBeGreaterThan(phone.scoreFont);
    expect(desktop.adjustSize).toBeGreaterThan(phone.adjustSize);
    expect(desktop.minWidth).toBeGreaterThan(phone.minWidth);
  });

  it('densifies when many teams share the header', () => {
    const two = getMatchScorePillMetrics({ width: 1200, height: 700, teamCount: 2 });
    const six = getMatchScorePillMetrics({ width: 1200, height: 700, teamCount: 6 });

    expect(six.minHeight).toBeLessThan(two.minHeight);
    expect(six.scoreFont).toBeLessThan(two.scoreFont);
    expect(six.minWidth).toBe(0);
    expect(six.nameMaxWidth).toBeNull();
  });

  it('respects play text scale on fonts', () => {
    const normal = getMatchScorePillMetrics({ width: 800, height: 400, teamCount: 2, textScale: 1 });
    const tv = getMatchScorePillMetrics({ width: 800, height: 400, teamCount: 2, textScale: 0.8 });
    const phone = getMatchScorePillMetrics({ width: 800, height: 400, teamCount: 2, textScale: 1.22 });

    expect(tv.scoreFont).toBeLessThan(normal.scoreFont);
    expect(normal.scoreFont).toBeLessThan(phone.scoreFont);
    expect(tv.minHeight).toBe(normal.minHeight); // chrome size unchanged by text scale
  });
});
