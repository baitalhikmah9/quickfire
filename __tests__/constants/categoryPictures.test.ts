import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getCategoryPictureSource,
  MISSING_CATEGORY_PICTURE_LABEL,
} from '@/constants/categoryPictures';

describe('categoryPictures asset loading', () => {
  const source = readFileSync(
    join(process.cwd(), 'constants/categoryPictures.ts'),
    'utf8'
  );

  it('uses Metro-safe relative asset requires for bundled artwork', () => {
    expect(source).not.toMatch(/require\((['"])@\/assets\//);
  });

  it('does not use remote URL fallbacks for missing category art', () => {
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/FALLBACK_URIS/);
    expect(source).not.toMatch(/postimg/);
  });

  it('returns null when a category has no local image', () => {
    // h6 (Arab History) previously used a remote fallback; must stay null without local art
    expect(getCategoryPictureSource('h6')).toBeNull();
    expect(getCategoryPictureSource('__no_such_category__')).toBeNull();
  });

  it('returns a local source for categories with bundled art', () => {
    expect(getCategoryPictureSource('h1')).toBeTruthy();
    expect(getCategoryPictureSource('pc14')).toBeTruthy();
  });

  it('exports MISSING as the placeholder label for absent art', () => {
    expect(MISSING_CATEGORY_PICTURE_LABEL).toBe('MISSING');
  });
});
