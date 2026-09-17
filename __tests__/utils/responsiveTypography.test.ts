import { expect, it } from '@jest/globals';
import { getResponsivePlayFontSizes } from '@/utils/responsiveTypography';

it('keeps TV < laptop < phone play text sizes', () => {
  const tv = getResponsivePlayFontSizes(844, 390, 0.8);
  const laptop = getResponsivePlayFontSizes(844, 390, 1);
  const phone = getResponsivePlayFontSizes(844, 390, 1.22);

  expect(tv.pageTitle).toBeLessThan(laptop.pageTitle);
  expect(laptop.pageTitle).toBeLessThan(phone.pageTitle);
  expect(tv.topicTitle).toBeLessThan(laptop.topicTitle);
  expect(laptop.topicTitle).toBeLessThan(phone.topicTitle);
  expect(tv.pointValue).toBeLessThan(laptop.pointValue);
  expect(laptop.pointValue).toBeLessThan(phone.pointValue);
});
