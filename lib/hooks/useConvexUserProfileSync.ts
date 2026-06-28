import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-expo';
import type { UserResource } from '@clerk/types';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

function getUserEmail(user: UserResource) {
  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress
  );
}

function getUserName(user: UserResource) {
  return (
    user.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(' ') ??
    user.username ??
    undefined
  );
}

export function useConvexUserProfileSync() {
  const { isLoaded, user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const upsertOnFirstSignIn = useMutation(api.users.upsertOnFirstSignIn);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || isLoading || !isAuthenticated || !user || syncedUserIdRef.current === user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;
    void upsertOnFirstSignIn({
      email: getUserEmail(user),
      name: getUserName(user),
    }).catch((error) => {
      syncedUserIdRef.current = null;
      console.error('[Convex user sync]', error);
    });
  }, [isAuthenticated, isLoaded, isLoading, upsertOnFirstSignIn, user]);
}
