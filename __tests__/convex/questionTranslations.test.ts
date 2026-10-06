import { describe, expect, it } from '@jest/globals';
import { getQuestionTranslationVariants } from '@/convex/content';
import {
  CONTENT_LOCALES as SERVER_CONTENT_LOCALES,
  MAX_CONTENT_LOCALES,
  MAX_TRANSLATION_KEYS,
  assertTranslationRequestWithinBounds,
  boundedCanonicalKeys,
  boundedContentLocales,
} from '@/convex/lib/contentLocales';
import { buildBoard, getPlayableCategories } from '@/features/play/data';
import { CONTENT_LOCALES as CLIENT_CONTENT_LOCALES } from '@/lib/i18n/config';
import { getConvexHandler } from '../helpers/convexHandler';
import { createConvexTestCtx, userDoc, type ConvexDoc } from '../helpers/convexTestCtx';

type Args = { canonicalKeys: string[]; locales: string[] };
type Variant = { canonicalKey: string; locale: string; prompt: string; answer: string };
type TestCtx = ReturnType<typeof createConvexTestCtx>;

const handler = getConvexHandler<TestCtx, Args, Variant[]>(getQuestionTranslationVariants);

function questionDoc(args: {
  id: string;
  canonicalKey: string;
  locale: string;
  status?: string;
  prompt?: string;
  answer?: string;
}): ConvexDoc {
  return {
    _id: args.id,
    categoryId: 'categories_1',
    canonicalKey: args.canonicalKey,
    prompt: args.prompt ?? `${args.locale} prompt ${args.canonicalKey}`,
    answer: args.answer ?? `${args.locale} answer ${args.canonicalKey}`,
    pointValue: 100,
    locale: args.locale,
    status: args.status ?? 'active',
  };
}

const CATALOG_ROWS: ConvexDoc[] = [
  questionDoc({ id: 'r1', canonicalKey: 'q1', locale: 'ar' }),
  questionDoc({ id: 'r2', canonicalKey: 'q1', locale: 'ur' }),
  questionDoc({ id: 'r3', canonicalKey: 'q1', locale: 'en' }),
  questionDoc({ id: 'r4', canonicalKey: 'q2', locale: 'ar', status: 'retired' }),
  questionDoc({ id: 'r5', canonicalKey: 'q3', locale: 'fr' }),
  questionDoc({ id: 'r6', canonicalKey: 'q3', locale: 'de' }),
];

function authedCtx(rows: ConvexDoc[] = CATALOG_ROWS): TestCtx {
  return createConvexTestCtx({
    identity: { subject: 'clerk_1' },
    tables: { users: [userDoc({ clerkId: 'clerk_1' })], questions: rows },
  });
}

/** Question lookups only; requireUser does one users lookup on every call. */
function questionQueryCalls(ctx: TestCtx): number {
  const queryFn = ctx.db.query as { mock?: { calls?: unknown[][] } };
  const calls = queryFn.mock?.calls ?? [];
  return calls.filter((call) => call[0] === 'questions').length;
}

describe('getQuestionTranslationVariants', () => {
  it('requires an authenticated user', async () => {
    const ctx = createConvexTestCtx({
      identity: null,
      tables: { questions: CATALOG_ROWS },
    });

    await expect(
      handler(ctx, { canonicalKeys: ['q1'], locales: ['ar'] })
    ).rejects.toThrow(/Not authenticated/);
  });

  it('returns the active translated rows for the exact key and locale', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, {
      canonicalKeys: ['q1', 'q2', 'q3'],
      locales: ['ar', 'ur'],
    });

    expect(variants).toEqual([
      { canonicalKey: 'q1', locale: 'ar', prompt: 'ar prompt q1', answer: 'ar answer q1' },
      { canonicalKey: 'q1', locale: 'ur', prompt: 'ur prompt q1', answer: 'ur answer q1' },
    ]);
  });

  it('never returns a retired row', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, { canonicalKeys: ['q2'], locales: ['ar'] });

    expect(variants).toEqual([]);
  });

  it('never returns English, so English always comes from the bundled catalog', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, { canonicalKeys: ['q1'], locales: ['en'] });

    expect(variants).toEqual([]);
    expect(questionQueryCalls(ctx)).toBe(0);
  });

  it('drops locales outside the allowlist without reading them', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, {
      canonicalKeys: ['q3'],
      locales: ['xx', 'de'],
    });

    expect(variants).toEqual([
      { canonicalKey: 'q3', locale: 'de', prompt: 'de prompt q3', answer: 'de answer q3' },
    ]);
    expect(questionQueryCalls(ctx)).toBe(1);
  });

  it('refuses a request for more locales than the UI can show', async () => {
    const ctx = authedCtx();

    await expect(
      handler(ctx, { canonicalKeys: ['q3'], locales: ['de', 'fr', 'ar'] })
    ).rejects.toThrow(/translation_request_too_many_locales/);
    expect(questionQueryCalls(ctx)).toBe(0);
  });

  it('ignores keys that are not stable q<UserID> keys', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, {
      canonicalKeys: ['ark-survival-evolved:100:0', 'q1', '', 'q1 '],
      locales: ['ar'],
    });

    expect(variants.map((variant) => variant.canonicalKey)).toEqual(['q1']);
    expect(questionQueryCalls(ctx)).toBe(1);
  });

  it('refuses an oversized key list instead of silently truncating it', async () => {
    const ctx = authedCtx();
    const keys = Array.from({ length: MAX_TRANSLATION_KEYS + 1 }, (_, index) => `q${index + 1}`);

    await expect(handler(ctx, { canonicalKeys: keys, locales: ['ar'] })).rejects.toThrow(
      /translation_request_too_many_keys/
    );
    expect(questionQueryCalls(ctx)).toBe(0);
  });

  it('dedupes repeated keys and locales', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, {
      canonicalKeys: ['q1', 'q1', 'q1'],
      locales: ['ar', 'ar'],
    });

    expect(variants).toHaveLength(1);
    expect(questionQueryCalls(ctx)).toBe(1);
  });

  it('omits a key that has no translated row instead of inventing one', async () => {
    const ctx = authedCtx();

    const variants = await handler(ctx, {
      canonicalKeys: ['q1', 'q404'],
      locales: ['ar'],
    });

    expect(variants.map((variant) => variant.canonicalKey)).toEqual(['q1']);
  });

  it('returns only text, never ids, points, categories or picture keys', async () => {
    const ctx = authedCtx();

    const [variant] = await handler(ctx, { canonicalKeys: ['q1'], locales: ['ar'] });

    expect(Object.keys(variant!).sort()).toEqual(['answer', 'canonicalKey', 'locale', 'prompt']);
  });
});

describe('content locale bounds', () => {
  it('matches the client content locale list exactly', () => {
    expect(SERVER_CONTENT_LOCALES).toEqual(CLIENT_CONTENT_LOCALES);
  });

  it('covers the largest board plus a bonus question', () => {
    // Random and Rumble allow six topics, so build the largest board the app can generate and
    // pin the number the server bound has to cover rather than assuming one.
    const slugs = getPlayableCategories().slice(0, 6).map((category) => category.slug);
    expect(slugs).toHaveLength(6);

    const distinctKeys = new Set(buildBoard(slugs).map((question) => question.canonicalKey));

    expect(distinctKeys.size).toBe(36); // 6 topics x 3 point buckets x 2 sides
    expect(MAX_TRANSLATION_KEYS).toBeGreaterThanOrEqual(distinctKeys.size + 1);
  });

  it('keeps allowlisted locales only, in request order', () => {
    expect(boundedContentLocales(['ar', 'ur'])).toEqual(['ar', 'ur']);
    expect(boundedContentLocales(['en', 'ar'])).toEqual(['ar']);
    expect(boundedContentLocales(['nope'])).toEqual([]);
  });

  it('keeps stable keys only and dedupes them', () => {
    expect(boundedCanonicalKeys(['q1', 'q1', 'x', 'ark-survival-evolved:100:0', 'q2'])).toEqual([
      'q1',
      'q2',
    ]);
  });

  it('allows a request exactly at the bound and refuses one above it', () => {
    const keys = Array.from({ length: MAX_TRANSLATION_KEYS }, (_, index) => `q${index + 1}`);
    expect(() =>
      assertTranslationRequestWithinBounds({ canonicalKeys: keys, locales: ['ar', 'ur'] })
    ).not.toThrow();
    expect(() =>
      assertTranslationRequestWithinBounds({ canonicalKeys: keys, locales: ['ar', 'ur', 'fr'] })
    ).toThrow(/translation_request_too_many_locales/);
    expect(() =>
      assertTranslationRequestWithinBounds({
        canonicalKeys: [...keys, 'q1'],
        locales: ['ar'],
      })
    ).toThrow(/translation_request_too_many_keys/);
    expect(MAX_CONTENT_LOCALES).toBe(2);
  });
});
