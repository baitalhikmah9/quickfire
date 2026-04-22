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
      '3 or 4 parties. Each question assigns a first answer and a steal party.'
    );
  });
});
