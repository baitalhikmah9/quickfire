import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('categoryPictures asset loading', () => {
  it('uses Metro-safe relative asset requires for bundled artwork', () => {
    const source = readFileSync(
      join(process.cwd(), 'constants/categoryPictures.ts'),
      'utf8'
    );

    expect(source).not.toMatch(/require\((['"])@\/assets\//);
  });
});
