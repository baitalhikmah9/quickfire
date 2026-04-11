/**
 * Internal seed mutations. Call via dashboard or npx convex run.
 * Usage: npx convex run seed:seedCategories '[]'
 * For bulk import, use a script that reads the JSON and calls these.
 */

import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const seedCategories = internalMutation({
  args: {
    categories: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        themeGroup: v.optional(v.string()),
        artwork: v.optional(v.string()),
        enabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const cat of args.categories) {
      const existing = await ctx.db
        .query('categories')
        .withIndex('by_slug', (q) => q.eq('slug', cat.slug))
        .unique();
      if (!existing) {
        await ctx.db.insert('categories', {
          slug: cat.slug,
          title: cat.title,
          themeGroup: cat.themeGroup,
          artwork: cat.artwork,
          enabled: cat.enabled,
        });
      }
    }
  },
});

export const seedCategoryTranslations = internalMutation({
  args: {
    translations: v.array(
      v.object({
        categorySlug: v.string(),
        locale: v.string(),
        title: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const translation of args.translations) {
      const category = await ctx.db
        .query('categories')
        .withIndex('by_slug', (i) => i.eq('slug', translation.categorySlug))
        .unique();

      if (!category) continue;

      const existing = await ctx.db
        .query('category_translations')
        .withIndex('by_category_locale', (q) =>
          q.eq('categoryId', category._id).eq('locale', translation.locale)
        )
        .unique();

      if (existing) {
        continue;
      }

      await ctx.db.insert('category_translations', {
        categoryId: category._id,
        locale: translation.locale,
        title: translation.title,
      });
    }
  },
});

export const seedQuestions = internalMutation({
  args: {
    questions: v.array(
      v.object({
        categorySlug: v.string(),
        canonicalKey: v.string(),
        prompt: v.string(),
        answer: v.string(),
        pointValue: v.number(),
        locale: v.string(),
        status: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const q of args.questions) {
      const category = await ctx.db
        .query('categories')
        .withIndex('by_slug', (i) => i.eq('slug', q.categorySlug))
        .unique();
      if (!category) continue;

      await ctx.db.insert('questions', {
        categoryId: category._id,
        canonicalKey: q.canonicalKey,
        prompt: q.prompt,
        answer: q.answer,
        pointValue: q.pointValue,
        locale: q.locale,
        status: q.status,
      });
    }
  },
});
