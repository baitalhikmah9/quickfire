import React from 'react';
import { afterEach } from '@jest/globals';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import type { GameConfig, GameSessionState, TeamState } from '@/features/shared';
import { PlayMatchTopBar } from '@/features/play/components/PlayMatchTopBar';
import { useThemeStore } from '@/store/theme';

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
  afterEach(() => {
    useThemeStore.setState({ paletteId: 'default' });
  });

  it('uses the theme accent for the active team indicator', () => {
    const session = createRumbleSession(['Alpha', 'Beta']);
    const { unmount } = render(
      <PlayMatchTopBar
        session={session}
        onLogoPress={jest.fn()}
        showTeamScores={false}
        scorePillsNextToLogo
      />
    );

    expect(StyleSheet.flatten(screen.getByTestId('logo-score-pill-team_2').props.style).borderColor).toBe('#FF6B00');
    unmount();

    useThemeStore.setState({ paletteId: 'dark' });
    const darkRender = render(
      <PlayMatchTopBar
        session={session}
        onLogoPress={jest.fn()}
        showTeamScores={false}
        scorePillsNextToLogo
      />
    );

    expect(StyleSheet.flatten(screen.getByTestId('logo-score-pill-team_2').props.style).borderColor).toBe('#06B6D4');
    darkRender.unmount();
  });

  it('keeps the active card face while adding the turn outline', () => {
    const session = createRumbleSession(['Alpha', 'Beta']);

    render(
      <PlayMatchTopBar
        session={session}
        onLogoPress={jest.fn()}
        showTeamScores={false}
        scorePillsNextToLogo
      />
    );

    const activeStyle = StyleSheet.flatten(screen.getByTestId('logo-score-pill-team_1').props.style);
    const inactiveStyle = StyleSheet.flatten(screen.getByTestId('logo-score-pill-team_2').props.style);

    expect(activeStyle.backgroundColor).toBe(inactiveStyle.backgroundColor);
    expect(activeStyle.borderColor).not.toBe(inactiveStyle.borderColor);
    expect(StyleSheet.flatten(screen.getByText('Alpha').props.style).color).toBe(
      StyleSheet.flatten(screen.getByText('Beta').props.style).color
    );
    expect(StyleSheet.flatten(screen.getByTestId('logo-score-value-team_1').props.style).color).toBe(
      StyleSheet.flatten(screen.getByTestId('logo-score-value-team_2').props.style).color
    );

    const minusLabels = screen.getAllByText('−');
    const plusLabels = screen.getAllByText('+');
    expect(StyleSheet.flatten(minusLabels[0].props.style).color).toBe(
      StyleSheet.flatten(minusLabels[1].props.style).color
    );
    expect(StyleSheet.flatten(plusLabels[0].props.style).color).toBe(
      StyleSheet.flatten(plusLabels[1].props.style).color
    );
  });

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

  it('keeps multi-digit scores fully visible with shrink-to-fit for six rumble teams', () => {
    const teamNames = ['A', 'B', 'C', 'D', 'E', 'F'];
    const session = createRumbleSession(teamNames);
    // Large / negative scores that previously clipped inside equal-width pills.
    session.teams = session.teams.map((team, index) => ({
      ...team,
      score: index === 0 ? 1250 : index === 1 ? -350 : (index + 1) * 100,
    }));

    render(
      <PlayMatchTopBar
        session={session}
        onLogoPress={jest.fn()}
        showTeamScores={false}
        scorePillsNextToLogo
      />
    );

    for (const team of session.teams) {
      const scoreNode = screen.getByTestId(`logo-score-value-${team.id}`);
      expect(scoreNode).toHaveTextContent(String(team.score));
      expect(scoreNode.props.adjustsFontSizeToFit).toBe(true);
      expect(scoreNode.props.numberOfLines).toBe(1);
      expect(scoreNode.props.minimumFontScale).toBeLessThanOrEqual(0.5);

      const style = StyleSheet.flatten(scoreNode.props.style);
      expect(style.width).toBe('100%');
    }
  });

  // SAFETY: Test fixture / double boundary cast justified by controlled test setup.
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

      // Scores always shrink-to-fit so digits are never mid-number clipped.
      for (const team of session.teams) {
        const scoreNode = screen.getByTestId(`logo-score-value-${team.id}`);
        expect(scoreNode.props.adjustsFontSizeToFit).toBe(true);
      }

      unmount();
    }
  });
});
