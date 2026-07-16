/**
 * Guards store screen layout contracts:
 * - STORE title is truly centered (aligns with the middle / 30-token card)
 * - Outer vertical padding above STORE matches padding below redeem
 * - Page uses even vertical distribution rather than flex spacers under the header
 */
import fs from 'node:fs';
import path from 'node:path';

const storePath = path.join(__dirname, '../../app/(app)/store.tsx');

describe('store layout spacing', () => {
  const source = fs.readFileSync(storePath, 'utf8');

  it('centers the STORE title absolutely so it lines up with the middle token card', () => {
    const headerCenterBlock = source.match(/headerCenter:\s*\{[\s\S]*?\},[\s\n]*headerSideRight|headerCenter:\s*\{[\s\S]*?\},[\s\n]*backButton|headerCenter:\s*\{[\s\S]*?\}/)?.[0];
    expect(headerCenterBlock).toBeTruthy();
    expect(headerCenterBlock).toMatch(/position:\s*['"]absolute['"]/);
    expect(headerCenterBlock).toMatch(/left:\s*0/);
    expect(headerCenterBlock).toMatch(/right:\s*0/);
    expect(source).toMatch(/styles\.headerCenter[^\}]*pointerEvents=["']none["']|headerCenter[^>]*pointerEvents=["']none["']/);
  });

  it('uses equal outer vertical padding above STORE and below redeem', () => {
    // Same chrome top pad token must drive both outer edges.
    expect(source).toMatch(/paddingTop:\s*getStandardChromeTopPadding/);
    expect(source).toMatch(/paddingBottom:\s*getStandardChromeTopPadding/);
  });

  it('distributes page sections evenly instead of dual flex pageSpacers', () => {
    expect(source).not.toMatch(/pageSpacer/);
    expect(source).toMatch(/justifyContent:\s*['"]space-between['"]/);
  });
});
