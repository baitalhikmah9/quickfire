import { describe, expect, it } from '@jest/globals';
import {
  buildCanonicalPool,
  pickLocalizedFromVariants,
  seededShuffle,
  selectUnaskedWithFallback,
} from '@/convex/lib/contentRules';

describe('contentRules', () => {
  it('excludes device-asked canonical keys from the primary pool', () => {
    const pool = [
      { canonicalKey: 'a', locale: 'en', id: 1 },
      { canonicalKey: 'b', locale: 'en', id: 2 },
    ];
    const asked = new Set(['a']);
    const { selection, usedFallbackToFullPool } = selectUnaskedWithFallback(pool, asked, 1, 'seed-a');
    expect(usedFallbackToFullPool).toBe(false);
    expect(selection.map((q) => q.canonicalKey)).toEqual(['b']);
  });

  it('falls back to the full pool when unasked set cannot satisfy the limit', () => {
    const pool = [
      { canonicalKey: 'a', locale: 'en' },
      { canonicalKey: 'b', locale: 'en' },
    ];
    const asked = new Set(['a', 'b']);
    const { selection, usedFallbackToFullPool } = selectUnaskedWithFallback(pool, asked, 2, 'seed-fb');
    expect(usedFallbackToFullPool).toBe(true);
    expect(selection).toHaveLength(2);
  });

  it('preserves locale fallback order when picking variants', () => {
    const variants = [
      { canonicalKey: 'x', locale: 'en', text: 'en' },
      { canonicalKey: 'x', locale: 'es', text: 'es' },
    ];
    expect(pickLocalizedFromVariants(variants, ['es', 'en'])?.text).toBe('es');
    expect(pickLocalizedFromVariants(variants, ['es', 'en'])?.resolvedFromFallback).toBe(false);
    expect(pickLocalizedFromVariants(variants, ['fr', 'en'])?.text).toBe('en');
    expect(pickLocalizedFromVariants(variants, ['fr', 'en'])?.resolvedFromFallback).toBe(true);
  });

  it('buildCanonicalPool dedupes by canonical key using locale chain', () => {
    const rows = [
      { canonicalKey: 'a', locale: 'en', n: 1 },
      { canonicalKey: 'a', locale: 'es', n: 2 },
      { canonicalKey: 'b', locale: 'en', n: 3 },
    ];
    const pool = buildCanonicalPool(rows, ['es', 'en']);
    expect(pool.map((p) => p.n)).toEqual([2, 3]);
  });

  it('returns deterministic order for the same seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, 'fixed-seed-1')).toEqual(seededShuffle(items, 'fixed-seed-1'));
    expect(seededShuffle(items, 'fixed-seed-1')).not.toEqual(seededShuffle(items, 'fixed-seed-2'));
  });
});
