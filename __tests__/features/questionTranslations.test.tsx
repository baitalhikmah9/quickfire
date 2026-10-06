import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { getQuestionTranslationVariants } from '@/convex/content';
import {
  buildBoard,
  clearQuestionTranslations,
  getPlayableCategories,
} from '@/features/play/data';
import {
  applyQuestionTranslations,
  clearRequestedQuestionTranslations,
} from '@/features/play/questionTranslations';
import { useQuestionVariants } from '@/features/play/useQuestionVariants';
import type { QuestionCard } from '@/features/shared';
import type { NonEnglishContentLocale } from '@/lib/i18n/config';
import { parseQuestionsLong } from '@/scripts/lib/questionsLong';
import { buildLocalePacks } from '@/scripts/lib/localePacks';
import { useLocaleStore } from '@/store/locale';
import { getConvexHandler } from '../helpers/convexHandler';
import { createConvexTestCtx, userDoc, type ConvexDoc } from '../helpers/convexTestCtx';
import {
  __getConvexMocks,
  __resetConvexReactDouble,
  __setConvexAuthState,
  __setConvexClientQuery,
} from '../doubles/convexReact';

type VariantRow = { canonicalKey: string; locale: string; prompt: string; answer: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A real bundled question: its English text comes from constants/questions.json. */
function bundledCard(): QuestionCard {
  const category = getPlayableCategories(['en'])[0]!;
  const card = buildBoard([category.slug])[0]!;
  expect(card.canonicalKey).toMatch(/^q\d+$/);
  return card;
}

/** A card whose key is not in the bundle, so its own text is the English source. */
function remoteCard(canonicalKey: string, overrides: Partial<QuestionCard> = {}): QuestionCard {
  return {
    id: `categories_1:${canonicalKey}:left`,
    canonicalKey,
    categoryId: 'categories_1',
    categoryName: 'General Knowledge',
    prompt: 'Remote English prompt',
    answer: 'Remote answer',
    promptImageKey: 'flags/tr.png',
    pointValue: 100,
    locale: 'en',
    resolvedFromFallback: false,
    used: false,
    boardSide: 'left',
    ...overrides,
  } as QuestionCard;
}

/** One consumer, matching a single play mount. */
function Probe({ card, id = 'a' }: { card: QuestionCard; id?: string }) {
  const variants = useQuestionVariants(card);
  return (
    <>
      <Text testID={`${id}-english-prompt`}>{variants?.english.prompt ?? ''}</Text>
      <Text testID={`${id}-english-answer`}>{variants?.english.answer ?? ''}</Text>
      <Text testID={`${id}-english-locale`}>{variants?.english.locale ?? ''}</Text>
      <Text testID={`${id}-translation-0-prompt`}>{variants?.translations[0]?.prompt ?? ''}</Text>
      <Text testID={`${id}-translation-0-answer`}>{variants?.translations[0]?.answer ?? ''}</Text>
      <Text testID={`${id}-translation-0-locale`}>{variants?.translations[0]?.locale ?? ''}</Text>
      <Text testID={`${id}-translation-1-prompt`}>{variants?.translations[1]?.prompt ?? ''}</Text>
      <Text testID={`${id}-translation-1-locale`}>{variants?.translations[1]?.locale ?? ''}</Text>
    </>
  );
}

/**
 * Two simultaneous consumers of the same card, like question.tsx + PlayAnswerPanel.tsx.
 * Both must keep English and pick up translations together once the shared cache fills.
 */
function DualProbe({ card }: { card: QuestionCard }) {
  return (
    <>
      <Probe card={card} id="question" />
      <Probe card={card} id="answer" />
    </>
  );
}

function rowsFor(canonicalKey: string): { ja: VariantRow; ar: VariantRow; de: VariantRow } {
  return {
    ja: { canonicalKey, locale: 'ja', prompt: '日本語の質問', answer: '日本語の答え' },
    ar: { canonicalKey, locale: 'ar', prompt: 'سؤال عربي', answer: 'جواب عربي' },
    de: { canonicalKey, locale: 'de', prompt: 'Deutsche Frage', answer: 'Deutsche Antwort' },
  };
}

function setLocales(
  primary: NonEnglishContentLocale | null,
  secondary: NonEnglishContentLocale | null
) {
  useLocaleStore.setState({ contentLocales: { primary, secondary } });
}

function clientQueryMock() {
  return __getConvexMocks().clientQueryMock;
}

async function settle(promise: Promise<unknown>) {
  await act(async () => {
    await promise.catch(() => undefined);
  });
}

beforeEach(() => {
  jest.spyOn(Math, 'random').mockReturnValue(0);
  __resetConvexReactDouble();
  clearRequestedQuestionTranslations();
  clearQuestionTranslations();
  setLocales(null, null);
});

afterEach(() => {
  clearQuestionTranslations();
  clearRequestedQuestionTranslations();
  jest.restoreAllMocks();
});

describe('useQuestionVariants with Convex translations', () => {
  it('keeps English on both consumers and updates translations together when the cache fills', async () => {
    const card = bundledCard();
    const { ja } = rowsFor(card.canonicalKey);
    setLocales('ja', null);
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    render(<DualProbe card={card} />);

    expect(screen.getByTestId('question-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('answer-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('question-translation-0-prompt')).toHaveTextContent('');
    expect(screen.getByTestId('answer-translation-0-prompt')).toHaveTextContent('');

    request.resolve([ja]);
    await settle(request.promise);

    await waitFor(() => {
      expect(screen.getByTestId('question-translation-0-locale')).toHaveTextContent('ja');
      expect(screen.getByTestId('answer-translation-0-locale')).toHaveTextContent('ja');
    });
    expect(screen.getByTestId('question-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('answer-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('question-translation-0-prompt')).toHaveTextContent('日本語の質問');
    expect(screen.getByTestId('answer-translation-0-prompt')).toHaveTextContent('日本語の質問');
  });

  it('re-resolves a second consumer from cache filled by the first', async () => {
    const card = bundledCard();
    const { ja } = rowsFor(card.canonicalKey);
    setLocales('ja', null);
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    const first = render(<Probe card={card} id="question" />);
    request.resolve([ja]);
    await settle(request.promise);
    await waitFor(() =>
      expect(screen.getByTestId('question-translation-0-locale')).toHaveTextContent('ja')
    );
    first.unmount();

    // New mount after the registry is already warm, like opening the answer panel later.
    render(<Probe card={card} id="answer" />);

    expect(screen.getByTestId('answer-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('answer-translation-0-prompt')).toHaveTextContent('日本語の質問');
    expect(screen.getByTestId('answer-translation-0-locale')).toHaveTextContent('ja');
    // First consumer already filled the cache; second must not issue another query.
    expect(clientQueryMock().mock.calls.length).toBe(1);
  });

  it('shows English first before and after both fetched languages land', async () => {
    const card = bundledCard();
    const { ja, ar } = rowsFor(card.canonicalKey);
    setLocales('ja', 'ar');
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    render(<Probe card={card} />);

    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-english-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');
    expect(screen.getByTestId('a-translation-1-prompt')).toHaveTextContent('');

    request.resolve([ja, ar]);
    await settle(request.promise);

    await waitFor(() =>
      expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('日本語の質問')
    );
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-english-answer')).toHaveTextContent(card.answer);
    expect(screen.getByTestId('a-english-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('a-translation-0-answer')).toHaveTextContent('日本語の答え');
    expect(screen.getByTestId('a-translation-0-locale')).toHaveTextContent('ja');
    expect(screen.getByTestId('a-translation-1-prompt')).toHaveTextContent('سؤال عربي');
    expect(screen.getByTestId('a-translation-1-locale')).toHaveTextContent('ar');

    expect(clientQueryMock()).toHaveBeenCalledTimes(1);
    expect(clientQueryMock().mock.calls[0]?.[1]).toEqual({
      canonicalKeys: [card.canonicalKey],
      locales: ['ja', 'ar'],
    });
  });

  it('keeps the English question visible when the query rejects', async () => {
    const card = bundledCard();
    setLocales('ja', null);
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    render(<Probe card={card} />);
    request.reject(new Error('Could not find function content:getQuestionTranslationVariants'));
    await settle(request.promise);

    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-english-answer')).toHaveTextContent(card.answer);
    expect(screen.getByTestId('a-english-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');
  });

  it('keeps text fetched earlier when a later question fails', async () => {
    const card = bundledCard();
    const { ja } = rowsFor(card.canonicalKey);
    setLocales('ja', null);
    const first = deferred<VariantRow[]>();
    __setConvexClientQuery(() => first.promise);

    const view = render(<Probe card={card} />);
    first.resolve([ja]);
    await settle(first.promise);
    await waitFor(() =>
      expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('日本語の質問')
    );
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);

    const failing = deferred<VariantRow[]>();
    __setConvexClientQuery(() => failing.promise);
    view.rerender(<Probe card={remoteCard('q999999')} />);
    failing.reject(new Error('offline'));
    await settle(failing.promise);

    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent('Remote English prompt');
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');

    view.rerender(<Probe card={card} />);
    await waitFor(() =>
      expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('日本語の質問')
    );
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
  });

  it('ignores a late response for a language the player already replaced', async () => {
    const card = bundledCard();
    const { ja, de } = rowsFor(card.canonicalKey);
    setLocales('ja', null);
    const requests: ReturnType<typeof deferred<VariantRow[]>>[] = [];
    __setConvexClientQuery(() => {
      const request = deferred<VariantRow[]>();
      requests.push(request);
      return request.promise;
    });

    render(<Probe card={card} />);
    expect(requests).toHaveLength(1);

    await act(async () => {
      setLocales('de', null);
    });
    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(2));

    requests[0]!.resolve([ja]);
    await settle(requests[0]!.promise);

    // Stale ja must not appear under the current de selection.
    expect(screen.getByTestId('a-english-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');

    requests[1]!.resolve([de]);
    await settle(requests[1]!.promise);
    await waitFor(() => expect(screen.getByTestId('a-translation-0-locale')).toHaveTextContent('de'));
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('Deutsche Frage');
  });

  it('ignores a late response after the current/bonus card changes', async () => {
    const boardCard = bundledCard();
    const bonusCard = remoteCard('q999998', {
      id: 'bonus:q999998',
      prompt: 'Bonus English prompt',
      answer: 'Bonus answer',
    });
    const boardJa = rowsFor(boardCard.canonicalKey).ja;
    const bonusJa = rowsFor(bonusCard.canonicalKey).ja;
    setLocales('ja', null);

    const requests: ReturnType<typeof deferred<VariantRow[]>>[] = [];
    __setConvexClientQuery(() => {
      const request = deferred<VariantRow[]>();
      requests.push(request);
      return request.promise;
    });

    const view = render(<Probe card={boardCard} />);
    expect(requests).toHaveLength(1);

    view.rerender(<Probe card={bonusCard} />);
    await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(2));

    // Older board response arrives after the bonus card is current.
    requests[0]!.resolve([boardJa]);
    await settle(requests[0]!.promise);
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent('Bonus English prompt');
    expect(screen.getByTestId('a-english-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');

    requests[1]!.resolve([bonusJa]);
    await settle(requests[1]!.promise);
    await waitFor(() =>
      expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('日本語の質問')
    );
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent('Bonus English prompt');
  });

  it('cancels a pending request when auth drops and keeps English on screen', async () => {
    const card = bundledCard();
    const { ja } = rowsFor(card.canonicalKey);
    setLocales('ja', null);
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    const view = render(<Probe card={card} />);
    expect(clientQueryMock()).toHaveBeenCalledTimes(1);

    await act(async () => {
      __setConvexAuthState({ isAuthenticated: false, isLoading: false });
    });
    // Auth is module state in the double; rerender so the effect cleanup cancels the in-flight request.
    view.rerender(<Probe card={card} />);

    request.resolve([ja]);
    await settle(request.promise);

    expect(screen.getByTestId('a-english-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');
  });

  it('omits a missing language instead of duplicating English', async () => {
    const card = bundledCard();
    const { ja } = rowsFor(card.canonicalKey);
    setLocales('ja', 'ar');
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    render(<Probe card={card} />);
    request.resolve([ja]);
    await settle(request.promise);

    await waitFor(() => expect(screen.getByTestId('a-translation-0-locale')).toHaveTextContent('ja'));
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('日本語の質問');
    expect(screen.getByTestId('a-translation-1-prompt')).toHaveTextContent('');
    expect(screen.getByTestId('a-translation-1-locale')).toHaveTextContent('');
  });

  it('ignores blank or whitespace-only translations instead of replacing English', async () => {
    const card = bundledCard();
    setLocales('ja', 'ar');
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    render(<Probe card={card} />);
    request.resolve([
      { canonicalKey: card.canonicalKey, locale: 'ja', prompt: '   ', answer: '答え' },
      { canonicalKey: card.canonicalKey, locale: 'ar', prompt: 'سؤال', answer: '\t  ' },
      {
        canonicalKey: card.canonicalKey,
        locale: 'ja',
        prompt: '日本語の質問',
        answer: '日本語の答え',
      },
    ]);
    await settle(request.promise);

    await waitFor(() =>
      expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('日本語の質問')
    );
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-translation-1-prompt')).toHaveTextContent('');
    expect(screen.getByTestId('a-translation-1-locale')).toHaveTextContent('');

    // Direct apply path: pure blanks never enter the registry.
    clearQuestionTranslations();
    clearRequestedQuestionTranslations();
    expect(
      applyQuestionTranslations([
        { canonicalKey: card.canonicalKey, locale: 'de', prompt: ' ', answer: ' ' },
      ])
    ).toBe(false);
  });

  it('asks once per question and language, even across rerenders', async () => {
    const card = bundledCard();
    const { ja } = rowsFor(card.canonicalKey);
    setLocales('ja', null);
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    const view = render(<Probe card={card} />);
    request.resolve([ja]);
    await settle(request.promise);
    await waitFor(() => expect(screen.getByTestId('a-translation-0-locale')).toHaveTextContent('ja'));

    view.rerender(<Probe card={card} />);
    view.rerender(<Probe card={{ ...card, id: `${card.id}:right` }} />);

    expect(clientQueryMock()).toHaveBeenCalledTimes(1);
  });

  it('asks nothing while signed out and keeps English on screen', async () => {
    const card = bundledCard();
    setLocales('ja', 'ar');
    __setConvexAuthState({ isAuthenticated: false, isLoading: false });

    render(<Probe card={card} />);

    expect(clientQueryMock()).not.toHaveBeenCalled();
    expect(screen.getByTestId('a-english-prompt')).toHaveTextContent(card.prompt);
    expect(screen.getByTestId('a-translation-0-prompt')).toHaveTextContent('');
    expect(screen.getByTestId('a-translation-1-prompt')).toHaveTextContent('');
  });

  it('loads dual consumers from real server-handler output of a synthetic CSV fixture', async () => {
    const header =
      'userId,canonicalKey,topic,categorySlug,difficulty,pointValue,locale,prompt,answer,status,duplicateOf,promptImageKey,sourceIssue';
    const fixture = parseQuestionsLong(
      [
        header,
        '10,q10,Naruto,naruto,Easy,100,en,English ten,Ten,active,,,',
        '10,q10,Naruto,naruto,Easy,100,ja,日本語 十,十,active,,,',
        '10,q10,Naruto,naruto,Easy,100,ar,عشرة,عشرة,active,,,',
      ].join('\n')
    );
    const { packs } = buildLocalePacks(fixture, {
      locales: ['ja', 'ar'],
      keys: new Set(['q10']),
    });
    expect(packs.ja?.q10?.prompt).toBe('日本語 十');
    expect(packs.ar?.q10?.prompt).toBe('عشرة');

    const rows: ConvexDoc[] = [
      {
        _id: 'en10',
        categoryId: 'categories_1',
        canonicalKey: 'q10',
        prompt: 'English ten',
        answer: 'Ten',
        pointValue: 100,
        locale: 'en',
        status: 'active',
      },
      {
        _id: 'ja10',
        categoryId: 'categories_1',
        canonicalKey: 'q10',
        prompt: packs.ja!.q10!.prompt,
        answer: packs.ja!.q10!.answer,
        pointValue: 100,
        locale: 'ja',
        status: 'active',
      },
      {
        _id: 'ar10',
        categoryId: 'categories_1',
        canonicalKey: 'q10',
        prompt: packs.ar!.q10!.prompt,
        answer: packs.ar!.q10!.answer,
        pointValue: 100,
        locale: 'ar',
        status: 'active',
      },
    ];

    const handler = getConvexHandler<
      ReturnType<typeof createConvexTestCtx>,
      { canonicalKeys: string[]; locales: string[] },
      VariantRow[]
    >(getQuestionTranslationVariants);
    const ctx = createConvexTestCtx({
      identity: { subject: 'clerk_1' },
      tables: { users: [userDoc({ clerkId: 'clerk_1' })], questions: rows },
    });
    const serverRows = await handler(ctx, {
      canonicalKeys: ['q10'],
      locales: ['ja', 'ar'],
    });
    expect(serverRows).toEqual([
      { canonicalKey: 'q10', locale: 'ja', prompt: '日本語 十', answer: '十' },
      { canonicalKey: 'q10', locale: 'ar', prompt: 'عشرة', answer: 'عشرة' },
    ]);

    const card = remoteCard('q10', {
      prompt: 'English ten',
      answer: 'Ten',
      categoryName: 'Naruto',
    });
    setLocales('ja', 'ar');
    const request = deferred<VariantRow[]>();
    __setConvexClientQuery(() => request.promise);

    render(<DualProbe card={card} />);
    request.resolve(serverRows);
    await settle(request.promise);

    await waitFor(() => {
      // Bundled English wins over the card's synthetic "English ten" text.
      expect(screen.getByTestId('question-english-prompt')).toHaveTextContent(
        'Which small pug summoned by Kakashi helps track targets by scent?'
      );
      expect(screen.getByTestId('answer-english-prompt')).toHaveTextContent(
        'Which small pug summoned by Kakashi helps track targets by scent?'
      );
      expect(screen.getByTestId('question-translation-0-prompt')).toHaveTextContent('日本語 十');
      expect(screen.getByTestId('answer-translation-0-prompt')).toHaveTextContent('日本語 十');
      expect(screen.getByTestId('question-translation-1-prompt')).toHaveTextContent('عشرة');
      expect(screen.getByTestId('answer-translation-1-prompt')).toHaveTextContent('عشرة');
    });
  });
});
