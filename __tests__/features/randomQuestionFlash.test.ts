import { describe, expect, it } from '@jest/globals';
import {
  RANDOM_FLASH_COUNT,
  buildRandomFlashSequence,
} from '@/features/play/randomQuestionFlash';

describe('buildRandomFlashSequence', () => {
  it('returns an empty sequence when there is no pool and no final id', () => {
    expect(buildRandomFlashSequence([], '', { random: () => 0 })).toEqual([]);
  });

  it('ends on the final chosen question after the configured flash count', () => {
    const remaining = ['q1', 'q2', 'q3', 'q4'];
    const sequence = buildRandomFlashSequence(remaining, 'q3', {
      flashCount: RANDOM_FLASH_COUNT,
      random: () => 0,
    });

    expect(sequence).toHaveLength(RANDOM_FLASH_COUNT);
    expect(sequence[sequence.length - 1]).toBe('q3');
    expect(sequence.every((id) => remaining.includes(id))).toBe(true);
  });

  it('avoids consecutive repeats when more than one remaining question exists', () => {
    const remaining = ['q1', 'q2', 'q3'];
    // Alternates deterministically between first candidates after filtering previous.
    let call = 0;
    const sequence = buildRandomFlashSequence(remaining, 'q1', {
      flashCount: 7,
      random: () => {
        call += 1;
        return call % 2 === 0 ? 0.99 : 0;
      },
    });

    for (let i = 1; i < sequence.length; i++) {
      expect(sequence[i]).not.toBe(sequence[i - 1]);
    }
    expect(sequence[sequence.length - 1]).toBe('q1');
  });

  it('allows the sole remaining question to flash every step', () => {
    const sequence = buildRandomFlashSequence(['only'], 'only', {
      flashCount: 5,
      random: () => 0.5,
    });

    expect(sequence).toEqual(['only', 'only', 'only', 'only', 'only']);
  });

  it('includes finalId even if it was missing from the remaining list', () => {
    const sequence = buildRandomFlashSequence(['q1', 'q2'], 'q-final', {
      flashCount: 3,
      random: () => 0,
    });

    expect(sequence[sequence.length - 1]).toBe('q-final');
    expect(sequence).toContain('q-final');
  });
});
