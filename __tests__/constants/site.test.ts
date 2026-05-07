import {
  canonicalUrlForPath,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  getPublicSiteOrigin,
} from '@/constants/site';

describe('site SEO helpers', () => {
  const prev = process.env.EXPO_PUBLIC_SITE_ORIGIN;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.EXPO_PUBLIC_SITE_ORIGIN;
    } else {
      process.env.EXPO_PUBLIC_SITE_ORIGIN = prev;
    }
  });

  it('defaults origin to playquickfire.com', () => {
    delete process.env.EXPO_PUBLIC_SITE_ORIGIN;
    expect(getPublicSiteOrigin()).toBe(DEFAULT_PUBLIC_SITE_ORIGIN);
    expect(DEFAULT_PUBLIC_SITE_ORIGIN).toBe('https://playquickfire.com');
  });

  it('trims EXPO_PUBLIC_SITE_ORIGIN and strips trailing slash', () => {
    process.env.EXPO_PUBLIC_SITE_ORIGIN = ' https://preview.example.com/ ';
    expect(getPublicSiteOrigin()).toBe('https://preview.example.com');
  });

  it('builds canonical URLs for paths', () => {
    delete process.env.EXPO_PUBLIC_SITE_ORIGIN;
    expect(canonicalUrlForPath('/')).toBe('https://playquickfire.com/');
    expect(canonicalUrlForPath('/play/mode')).toBe('https://playquickfire.com/play/mode');
  });
});
