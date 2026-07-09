import type { PlayRouteStep } from '@/features/shared';

/** Match screens where leaving should confirm and discard the active session. */
export function isActiveMatchStep(step: PlayRouteStep | undefined | null): boolean {
  return step === 'board' || step === 'question' || step === 'answer';
}

/** Session steps that mean "game in progress" for the home resume prompt. */
export function isResumableSessionStep(step: PlayRouteStep | undefined | null): boolean {
  return !!step && step !== 'hub' && step !== 'mode' && step !== 'end';
}

/** Expo Router path for a play session step, or null when there is no play route. */
export function routeForPlayStep(step: PlayRouteStep): string | null {
  switch (step) {
    case 'quick-play-length':
      return '/play/quick-length';
    case 'team-setup':
      return '/play/team-setup';
    case 'categories':
      return '/play/categories';
    case 'board':
      return '/play/board';
    case 'question':
    case 'answer':
      return '/play/question';
    case 'end':
      return '/play/end';
    default:
      return null;
  }
}
