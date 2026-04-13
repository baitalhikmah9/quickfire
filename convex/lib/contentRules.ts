/**
 * Pure content selection helpers (deterministic, testable, no Math.random).
 */

export type LocaleChain = readonly string[];

export function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  const rng = seededRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function pickLocalizedFromVariants<T extends { locale: string; canonicalKey: string }>(
  variants: readonly T[],
  localeChain: LocaleChain
): (T & { resolvedFromFallback: boolean }) | undefined {
  if (variants.length === 0) return undefined;
  for (const locale of localeChain) {
    const row = variants.find((v) => v.locale === locale);
    if (row) {
      return {
        ...row,
        resolvedFromFallback: locale !== localeChain[0],
      };
    }
  }
  return undefined;
}

/** One row per canonical key, using locale chain order. */
export function buildCanonicalPool<T extends { canonicalKey: string; locale: string }>(
  rows: readonly T[],
  localeChain: LocaleChain
): Array<T & { resolvedFromFallback: boolean }> {
  const byCanon = new Map<string, T[]>();
  for (const row of rows) {
    const list = byCanon.get(row.canonicalKey) ?? [];
    list.push(row);
    byCanon.set(row.canonicalKey, list);
  }
  const out: Array<T & { resolvedFromFallback: boolean }> = [];
  for (const variants of byCanon.values()) {
    const picked = pickLocalizedFromVariants(variants, localeChain);
    if (picked) out.push(picked);
  }
  return out;
}

export function filterExcludingCanonicalKeys<T extends { canonicalKey: string }>(
  pool: readonly T[],
  askedKeys: ReadonlySet<string>
): T[] {
  return pool.filter((q) => !askedKeys.has(q.canonicalKey));
}

export function selectUnaskedWithFallback<T extends { canonicalKey: string }>(
  fullPool: readonly T[],
  askedCanonicalKeys: ReadonlySet<string>,
  limit: number,
  seed: string
): { selection: T[]; usedFallbackToFullPool: boolean } {
  const unasked = filterExcludingCanonicalKeys(fullPool, askedCanonicalKeys);
  let candidate = unasked;
  let usedFallback = false;
  if (candidate.length < limit) {
    candidate = [...fullPool];
    usedFallback = true;
  }
  const shuffled = seededShuffle(candidate, seed);
  return { selection: shuffled.slice(0, limit), usedFallbackToFullPool: usedFallback };
}
