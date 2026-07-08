import { describe, expect, it } from '@jest/globals';
import { getLeadingTeamId } from '@/features/play/categorySections';

describe('getLeadingTeamId', () => {
  it('returns no leader when teams are tied', () => {
    expect(getLeadingTeamId([
      { id: 'team_1', score: 0 },
      { id: 'team_2', score: 0 },
    ])).toBeUndefined();
  });

  it('returns the sole highest team', () => {
    expect(getLeadingTeamId([
      { id: 'team_1', score: 100 },
      { id: 'team_2', score: 300 },
      { id: 'team_3', score: 200 },
    ])).toBe('team_2');
  });
});
