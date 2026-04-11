import { query } from './_generated/server';
import { v } from 'convex/values';

export const listPlayableCategories = query({
  args: {
    localeChain: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const localeChain = args.localeChain?.length ? args.localeChain : ['en'];
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .collect();

    return await Promise.all(
      categories.map(async (category) => {
        const questions = await ctx.db
          .query('questions')
          .withIndex('by_category_status', (q) =>
            q.eq('categoryId', category._id).eq('status', 'active')
          )
          .collect();
        const questionCount = new Set(
          questions.map((question) => question.canonicalKey)
        ).size;

        for (const locale of localeChain) {
          const translation = await ctx.db
            .query('category_translations')
            .withIndex('by_category_locale', (q) =>
              q.eq('categoryId', category._id).eq('locale', locale)
            )
            .unique();

          if (translation) {
            return {
              ...category,
              title: translation.title,
              questionCount,
              resolvedLocale: locale,
              fellBackToEnglish: locale === 'en',
            };
          }
        }

        return {
          ...category,
          questionCount,
          resolvedLocale: 'en',
          fellBackToEnglish: true,
        };
      })
    );
  },
});

export const getModeQuestionPool = query({
  args: {
    mode: v.string(),
    localeChain: v.optional(v.array(v.string())),
    categoryIds: v.optional(v.array(v.id('categories'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 36;
    const localeChain = args.localeChain?.length ? args.localeChain : ['en'];
    const merged = new Map<string, any>();

    if (args.categoryIds && args.categoryIds.length > 0) {
      const perCategory = Math.ceil(limit / args.categoryIds.length);

      for (const catId of args.categoryIds) {
        const categoryQuestions = await ctx.db
          .query('questions')
          .withIndex('by_category', (q) => q.eq('categoryId', catId))
          .collect();

        const byCanonical = new Map<string, typeof categoryQuestions>();
        for (const question of categoryQuestions) {
          const bucket = byCanonical.get(question.canonicalKey) ?? [];
          bucket.push(question);
          byCanonical.set(question.canonicalKey, bucket);
        }

        for (const variants of byCanonical.values()) {
          const localized = pickLocalizedQuestion(variants, localeChain);
          if (!localized || merged.has(localized.canonicalKey)) {
            continue;
          }
          merged.set(localized.canonicalKey, localized);
          if (merged.size >= perCategory * args.categoryIds.length) {
            break;
          }
        }
      }

      return Array.from(merged.values()).slice(0, limit);
    }

    const questions = await ctx.db
      .query('questions')
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();

    const byCanonical = new Map<string, typeof questions>();
    for (const question of questions) {
      const bucket = byCanonical.get(question.canonicalKey) ?? [];
      bucket.push(question);
      byCanonical.set(question.canonicalKey, bucket);
    }

    for (const variants of byCanonical.values()) {
      const localized = pickLocalizedQuestion(variants, localeChain);
      if (!localized || merged.has(localized.canonicalKey)) {
        continue;
      }
      merged.set(localized.canonicalKey, localized);
      if (merged.size >= limit) {
        break;
      }
    }

    return Array.from(merged.values()).slice(0, limit);
  },
});

function pickLocalizedQuestion<T extends { canonicalKey: string; locale: string }>(
  variants: T[],
  localeChain: string[]
) {
  for (const locale of localeChain) {
    const question = variants.find((variant) => variant.locale === locale);
    if (question) {
      return {
        ...question,
        resolvedFromFallback: locale !== localeChain[0],
      };
    }
  }

  return undefined;
}
