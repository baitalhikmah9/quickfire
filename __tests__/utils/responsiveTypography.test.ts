import { expect, it } from '@jest/globals';
import { getResponsivePlayFontSizes } from '@/utils/responsiveTypography';

it('keeps TV-mode play text smaller than mobile-mode text', () => {
  const mobile = getResponsivePlayFontSizes(844, 390, 1);
  const tv = getResponsivePlayFontSizes(844, 390, 0.75);

  expect(tv.pageTitle).toBeLessThan(mobile.pageTitle);
  expect(tv.topicTitle).toBeLessThan(mobile.topicTitle);
  expect(tv.pointValue).toBeLessThan(mobile.pointValue);
});
