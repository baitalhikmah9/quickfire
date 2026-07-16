/**
 * Guards the store redeem field against a hard-coded light fill that breaks dark mode.
 * Source-level check keeps the regression small without mounting Clerk/Convex.
 */
import fs from 'node:fs';
import path from 'node:path';

const storePath = path.join(__dirname, '../../app/(app)/store.tsx');

describe('store redeem input dark mode', () => {
  const source = fs.readFileSync(storePath, 'utf8');

  it('does not hard-code pure white on redeemInput styles', () => {
    // The StyleSheet redeemInput block must not pin backgroundColor: '#FFFFFF'.
    const redeemInputBlock = source.match(
      /redeemInput:\s*\{[\s\S]*?\},[\s\n]*redeemInputCompact/
    )?.[0];
    expect(redeemInputBlock).toBeTruthy();
    expect(redeemInputBlock).not.toMatch(/backgroundColor:\s*['"]#FFFFFF['"]/i);
    expect(redeemInputBlock).not.toMatch(/backgroundColor:\s*['"]#FFF['"]/i);
  });

  it('applies a theme-aware background on the redeem TextInput', () => {
    // Runtime style object on TextInput should set backgroundColor from a themed token.
    expect(source).toMatch(
      /backgroundColor:\s*redeemFieldBackground|redeemFieldBackground[\s\S]{0,200}backgroundColor/
    );
    expect(source).toMatch(/redeemFieldBackground\s*=/);
  });
});
