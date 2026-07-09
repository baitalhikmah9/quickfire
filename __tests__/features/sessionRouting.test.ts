import { describe, expect, it } from '@jest/globals';

import {
  isActiveMatchStep,
  isResumableSessionStep,
  routeForPlayStep,
} from '@/features/play/sessionRouting';

describe('sessionRouting', () => {
  it('treats board, question, and answer as active match steps', () => {
    expect(isActiveMatchStep('board')).toBe(true);
    expect(isActiveMatchStep('question')).toBe(true);
    expect(isActiveMatchStep('answer')).toBe(true);
    expect(isActiveMatchStep('team-setup')).toBe(false);
    expect(isActiveMatchStep('quick-play-length')).toBe(false);
    expect(isActiveMatchStep('categories')).toBe(false);
    expect(isActiveMatchStep('end')).toBe(false);
    expect(isActiveMatchStep(null)).toBe(false);
  });

  it('marks in-progress setup and match steps as resumable, but not hub/mode/end', () => {
    expect(isResumableSessionStep('board')).toBe(true);
    expect(isResumableSessionStep('team-setup')).toBe(true);
    expect(isResumableSessionStep('quick-play-length')).toBe(true);
    expect(isResumableSessionStep('hub')).toBe(false);
    expect(isResumableSessionStep('mode')).toBe(false);
    expect(isResumableSessionStep('end')).toBe(false);
  });

  it('routes active match steps back into the match screens', () => {
    expect(routeForPlayStep('board')).toBe('/play/board');
    expect(routeForPlayStep('question')).toBe('/play/question');
    expect(routeForPlayStep('answer')).toBe('/play/question');
    expect(routeForPlayStep('quick-play-length')).toBe('/play/quick-length');
    expect(routeForPlayStep('team-setup')).toBe('/play/team-setup');
    expect(routeForPlayStep('categories')).toBe('/play/categories');
    expect(routeForPlayStep('end')).toBe('/play/end');
    expect(routeForPlayStep('hub')).toBeNull();
  });
});
