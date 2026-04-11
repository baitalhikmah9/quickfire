import en, { type Messages } from './en';

export function withEnglishFallback(overrides: Partial<Messages>): Messages {
  return {
    ...en,
    ...overrides,
  };
}

