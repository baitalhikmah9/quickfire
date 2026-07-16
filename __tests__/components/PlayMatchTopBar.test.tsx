import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { GameConfig, GameSessionState, TeamState } from '@/features/shared';
import { PlayMatchTopBar } from '@/features/play/components/PlayMatchTopBar';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => {}),
    removeItem: jest.fn(async () => {}),
  },
}));

jest.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        'play.matchMenuA11y': 'Match menu',
        'play.wagerHelpLink': 'Wager info',
        'play.wagersUsed': `Wagers ${values?.used ?? 0}/${values?.total ?? 0}`,
        'play.hotSeatInfoLink': 'Hot Seat info',
        'play.hotSeatAllRoundsPlayed': 'All Hot Seat rounds played',
      };
      return messages[key] ?? key;
    },
  }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@/components/BackfireTitleLogo', () => ({
  BackfireTitleLogo: () => null,
}));

function makeTeams(names: string[]): TeamState[] {
  return names.map((name, index) => ({
    id: `team_${index + 1}`,
    name,
    playerNames: [`Player ${index + 1}`],
    score: (index + 1) * 100,
    wagersUsed: 0,
  }));
}

function createRumbleSession(teamNames: string[]): GameSessionState {
  const teams = makeTeams(teamNames);
  const config: GameConfig = {
    mode: 'rumble',
    teams: teams.map(({ id, name, playerNames }) => ({ id, name, playerNames })),
    categories: ['science'],
    contentLocaleChain: ['en'],
    hotSeatEnabled: false,
    wagerEnabled: false,
    wagersPerTeam: 0,
  };

  return {
    id: 'session-rumble-topbar',
    mode: 'rumble',
    config,
    contentLocaleChain: ['en'],
    step: 'board',
    phase: 'wagerDecision',
    availableCategories: [],
    selectedCategoryIds: ['science'],
    currentTeamId: teams[0]?.id ?? 'team_1',
    board: [],
    teams,
    scores: Object.fromEntries(teams.map((team) => [team.id, team.score])),
    usedQuestionIds: new Set(),
    seed: 'seed-rumble-topbar',
    wagersPerTeam: 0,
    wager: null,
    bonus: { active: false, played: false, multiplier: 2 },
    scoreEvents: [],
    timerStartedAt: 1_000_000,
  };
}

describe('PlayMatchTopBar rumble score cards', () => {
  it('shows every team name without fixed max-width clipping for six rumble teams', () => {
    const teamNames = [
      'Alpha Squad',
      'Beta Brigade',
      'Gamma Gang',
      'Delta Force',
      'Epsilon Crew',
      'Zeta Zone',
    ];
    const session = createRumbleSession(teamNames);

    render(
      <PlayMatchTopBar
        session={session}
        onLogoPress={jest.fn()}
        showTeamScores={false}
        scorePillsNextToLogo
      />
    );

    for (const name of teamNames) {
      const nameNode = screen.getByText(name);
      expect(nameNode).toBeTruthy();

      const style = StyleSheet.flatten(nameNode.props.style);
      // Fixed pixel caps (88 / 56) were clipping names when N teams share the header.
      expect(style.maxWidth).not.toBe(56);
      expect(style.maxWidth).not.toBe(88);
      expect(nameNode.props.adjustsFontSizeToFit).toBe(true);
      expect(nameNode.props.numberOfLines).toBe(1);
    }
  });

  it('shows every team name for two and four rumble teams as well', () => {
    for (const names of [
      ['Red Rockets', 'Blue Bombers'],
      ['One', 'Two', 'Three', 'Four Long Name'],
    ]) {
      const session = createRumbleSession(names);
      const { unmount } = render(
        <PlayMatchTopBar
          session={session}
          onLogoPress={jest.fn()}
          showTeamScores={false}
          scorePillsNextToLogo
        />
      );

      for (const name of names) {
        const nameNode = screen.getByText(name);
        const style = StyleSheet.flatten(nameNode.props.style);
        expect(style.maxWidth).not.toBe(56);
        expect(style.maxWidth).not.toBe(88);
        expect(nameNode.props.adjustsFontSizeToFit).toBe(true);
      }

      unmount();
    }
  });
});
