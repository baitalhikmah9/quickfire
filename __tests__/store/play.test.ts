import { act } from 'react';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { usePlayStore } from '@/store/play';

beforeEach(() => {
  act(() => {
    usePlayStore.setState({ session: null, tokens: 5 });
    usePlayStore.getState().ensureDraft();
  });
});

describe('usePlayStore', () => {
  it('branches quick play through topic length before team setup', () => {
    act(() => usePlayStore.getState().setMode('quickPlay'));
    expect(usePlayStore.getState().session?.step).toBe('quick-play-length');

    act(() => usePlayStore.getState().setQuickPlayTopicCount(4));
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.config.quickPlayTopicCount).toBe(4);
  });

  it('sends rumble into team setup like classic', () => {
    act(() => usePlayStore.getState().setMode('rumble'));
    expect(usePlayStore.getState().session?.step).toBe('team-setup');
    expect(usePlayStore.getState().session?.mode).toBe('rumble');
  });

  it('requires the correct topic count and consumes a token when the board starts', () => {
    const store = usePlayStore.getState();
    act(() => store.setMode('classic'));
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    act(() => {
      for (const category of categories) {
        usePlayStore.getState().toggleCategory(category.slug);
      }
    });

    let result: { ok: boolean; error?: string } | undefined;
    act(() => {
      result = usePlayStore.getState().startBoard();
    });

    expect(result).toMatchObject({ ok: true });
    expect(usePlayStore.getState().tokens).toBe(4);
    expect(usePlayStore.getState().session?.step).toBe('board');
    expect(usePlayStore.getState().session?.board.length).toBeGreaterThan(0);
  });

  it('progresses a standard turn from board to answer and rotates to the next team', () => {
    const store = usePlayStore.getState();
    act(() => store.setMode('classic'));
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    act(() => {
      for (const category of categories) {
        usePlayStore.getState().toggleCategory(category.slug);
      }
      usePlayStore.getState().startBoard();
    });

    const session = usePlayStore.getState().session!;
    const question = session.board[0];

    act(() => {
      usePlayStore.getState().selectQuestion(question);
      usePlayStore.getState().revealAnswer();
      usePlayStore.getState().awardStandardQuestion('team_1');
      usePlayStore.getState().continueAfterStandardQuestion();
    });

    expect(usePlayStore.getState().session?.step).toBe('board');
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_2');
    expect(usePlayStore.getState().session?.scores.team_1).toBeGreaterThan(0);
  });

  it('rejects wagers in randomiser and rumble modes', () => {
    for (const mode of ['random', 'rumble'] as const) {
      act(() => {
        usePlayStore.setState({ session: null, tokens: 5 });
        usePlayStore.getState().ensureDraft();
      });
      act(() => usePlayStore.getState().setMode(mode));
      expect(usePlayStore.getState().session?.config.wagerEnabled).toBe(false);

      const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];
      act(() => {
        for (const category of categories) {
          usePlayStore.getState().toggleCategory(category.slug);
        }
        usePlayStore.getState().startBoard();
      });

      const firstQuestion = usePlayStore.getState().session!.board[0];
      act(() => {
        usePlayStore.getState().selectQuestion(firstQuestion);
        usePlayStore.getState().revealAnswer();
        usePlayStore.getState().awardStandardQuestion('team_1');
      });

      let result: { ok: boolean; error?: string } | undefined;
      act(() => {
        result = usePlayStore.getState().initiateWager();
      });
      expect(result).toMatchObject({ ok: false });
    }
  });

  it('supports the wager loop on the next team and restores turn control after resolution', () => {
    const store = usePlayStore.getState();
    act(() => store.setMode('classic'));
    const categories = usePlayStore.getState().session?.availableCategories.slice(0, 6) ?? [];

    act(() => {
      for (const category of categories) {
        usePlayStore.getState().toggleCategory(category.slug);
      }
      usePlayStore.getState().startBoard();
    });

    const firstQuestion = usePlayStore.getState().session!.board[0];

    act(() => {
      usePlayStore.getState().selectQuestion(firstQuestion);
      usePlayStore.getState().revealAnswer();
      usePlayStore.getState().awardStandardQuestion('team_1');
    });

    let result: { ok: boolean; error?: string } | undefined;
    act(() => {
      result = usePlayStore.getState().initiateWager();
    });

    expect(result).toMatchObject({ ok: true });
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_2');
    expect(usePlayStore.getState().session?.wager?.wageringTeamId).toBe('team_1');

    act(() => {
      usePlayStore.getState().confirmRandomWagerQuestion();
      usePlayStore.getState().resolveWager(false);
    });

    expect(usePlayStore.getState().session?.wager).toBeNull();
    expect(usePlayStore.getState().session?.currentTeamId).toBe('team_1');
  });
});
