import { describe, expect, it } from '@jest/globals';

import { DELETE_ACCOUNT_SECTIONS } from '@/lib/legal/deleteAccountSections';

describe('delete account public instructions', () => {
  it('covers in-app path, web-without-app path, deleted data, and retention', () => {
    const headings = DELETE_ACCOUNT_SECTIONS.map((s) => s.heading);
    expect(headings).toEqual(
      expect.arrayContaining([
        'How to delete your account in the app',
        'How to request deletion without the app',
        'Data that is deleted',
        'Data that may be retained (anonymized)',
      ])
    );

    const body = DELETE_ACCOUNT_SECTIONS.flatMap((s) => s.paragraphs).join('\n');
    expect(body).toMatch(/Settings/i);
    expect(body).toMatch(/Delete Account/i);
    expect(body).toMatch(/30 days/i);
    expect(body).toMatch(/tokens/i);
    expect(body).toMatch(/anonymized|pseudonymous/i);
  });
});
