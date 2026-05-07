import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useConvexUserProfileSync } from '@/lib/hooks/useConvexUserProfileSync';

const mockUseUser = jest.fn();
const mockUpsertOnFirstSignIn = jest.fn(() => Promise.resolve('user_123'));

jest.mock('@clerk/clerk-expo', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('convex/react', () => ({
  useMutation: () => mockUpsertOnFirstSignIn,
}));

function ProfileSyncHarness() {
  useConvexUserProfileSync();
  return <Text>ready</Text>;
}

describe('useConvexUserProfileSync', () => {
  beforeEach(() => {
    mockUseUser.mockReset();
    mockUpsertOnFirstSignIn.mockClear();
  });

  it('upserts the Convex user from the loaded Clerk user', async () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: 'clerk_user_123',
        primaryEmailAddress: { emailAddress: 'admin@example.com' },
        emailAddresses: [],
        fullName: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
      },
    });

    render(<ProfileSyncHarness />);

    await waitFor(() => {
      expect(mockUpsertOnFirstSignIn).toHaveBeenCalledWith({
        clerkId: 'clerk_user_123',
        email: 'admin@example.com',
        name: 'Admin User',
      });
    });
  });

  it('does not upsert before Clerk user state loads', () => {
    mockUseUser.mockReturnValue({ isLoaded: false, user: null });

    render(<ProfileSyncHarness />);

    expect(mockUpsertOnFirstSignIn).not.toHaveBeenCalled();
  });
});
