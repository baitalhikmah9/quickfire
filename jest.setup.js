/* global jest */
require('@testing-library/jest-native/extend-expect');

const mockConvexMutation = jest.fn(async (args) => {
  if (args && 'clientSessionId' in args) {
    return { ok: true, reservationId: 'test_reservation' };
  }
  if (args && 'reservationId' in args && 'completedSessionId' in args) {
    return { ok: true };
  }
  if (args && 'reservationId' in args && 'reason' in args) {
    return { ok: true };
  }
  if (args && 'reservationId' in args && 'additionalCost' in args) {
    return { ok: true };
  }
  return { ok: true };
});

jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => undefined),
  useMutation: jest.fn(() => mockConvexMutation),
  useConvexAuth: jest.fn(() => ({ isAuthenticated: true, isLoading: false })),
}));

jest.mock('@/lib/deviceInstallation', () => ({
  getOrCreateInstallationId: jest.fn(async () => 'device_test_1'),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy', Rigid: 'Rigid', Soft: 'Soft' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
