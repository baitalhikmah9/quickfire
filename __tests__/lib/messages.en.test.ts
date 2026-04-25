import { describe, expect, it } from '@jest/globals';

import { en } from '@/lib/i18n/messages/en';

describe('English mode copy', () => {
  it('uses the finalized home mode descriptions', () => {
    expect(en['play.mode.classicCopy']).toBe(
      'Six topics, wagers, and Hot Seat on the full board.'
    );
    expect(en['play.mode.quickCopy']).toBe(
      'Pick 3, 4, or 5 topics for a faster match with wagers and Hot Seat.'
    );
    expect(en['play.mode.randomCopy']).toBe(
      'The app draws each question for you. Wagers and Hot Seat stay off.'
    );
    expect(en['play.mode.rumbleCopy']).toBe(
      '2, 3, 4, or 6 teams. Each question assigns a first answer and a steal team.'
    );
  });

  it('keeps quick mode labelled as Quick Play instead of rebranding the mode', () => {
    expect(en['play.mode.quick']).toBe('Quick Play');
    expect(en['play.quickLengthTitle']).toBe('Set Quick Play Length');
    expect(en['play.quickLengthSubtitle']).toBe(
      'Choose how many topics Quick Play should use before team setup.'
    );
  });
});
