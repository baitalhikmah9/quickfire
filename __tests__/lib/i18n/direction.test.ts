import { getContentWritingDirection } from '@/lib/i18n/direction';

describe('lib/i18n/direction', () => {
  it('keeps an English answer LTR when it contains an Arabic phrase', () => {
    expect(
      getContentWritingDirection(
        'en',
        'Who was called Al-Namus (الناموس), the bearer of revelation?'
      )
    ).toBe('ltr');
  });

  it('uses RTL for Arabic copy even when its locale is mislabeled as English', () => {
    expect(getContentWritingDirection('en', 'ما هو عاصمة فرنسا؟')).toBe('rtl');
  });
});
