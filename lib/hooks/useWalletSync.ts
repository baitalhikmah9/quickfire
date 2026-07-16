import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getOrCreateInstallationId } from '@/lib/deviceInstallation';
import { isAuthDisabled } from '@/lib/authMode';
import { usePlayStore } from '@/store/play';

/**
 * Syncs the Convex wallet balance to the local play store whenever the user
 * is signed in and the backend balance changes.
 *
 * Also ensures the device has a purchaser account and the starter grant has
 * been applied (both operations are idempotent).
 *
 * Wire this once in AppHydration (lib/providers.tsx) - it handles all the
 * subscription lifecycle internally.
 */
export function useWalletSync() {
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authDisabled = isAuthDisabled();
  const ensurePurchaserAccount = useMutation(api.payments.ensurePurchaserAccount);
  const grantStarterBalance = useMutation(api.wallet.grantStarterBalance);
  const [installationId, setInstallationId] = useState<string | null>(null);
  const setupCompletedForRef = useRef<string | null>(null);

  // Step 1: Obtain a stable installation identifier.
  useEffect(() => {
    if (authDisabled) return;

    let cancelled = false;
    getOrCreateInstallationId()
      .then((id) => {
        if (!cancelled) setInstallationId(id);
      })
      .catch(() => {
        // Non-fatal - the query subscription will be skipped and balance will
        // use the local fallback until the next mount.
      });

    return () => {
      cancelled = true;
    };
  }, [authDisabled]);

  // Step 2: Register the device as a purchaser account and grant the starter
  // balance.  Runs when the user becomes authenticated (including late sign-in).
  useEffect(() => {
    if (authDisabled || isLoading || !isClerkLoaded || !isSignedIn || !isAuthenticated || !installationId) {
      return;
    }
    const setupKey = installationId;
    if (setupCompletedForRef.current === setupKey) return;

    let cancelled = false;

    void (async () => {
      try {
        await ensurePurchaserAccount({
          installationId,
          platform: Platform.OS,
          appVersion: Constants.expoConfig?.version ?? 'unknown',
        });
      } catch {
        // Non-fatal - the webhook will still credit the user on first purchase.
      }

      try {
        await grantStarterBalance({ deviceId: installationId });
      } catch {
        // Idempotent - will succeed on next mount if it failed transiently.
      }

      if (!cancelled) {
        setupCompletedForRef.current = setupKey;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authDisabled,
    ensurePurchaserAccount,
    grantStarterBalance,
    installationId,
    isAuthenticated,
    isClerkLoaded,
    isLoading,
    isSignedIn,
  ]);

  // Signed-out users should not see a cached wallet balance (including after
  // play-store rehydrate, which can restore a previous session's tokens).
  useEffect(() => {
    if (authDisabled || !isClerkLoaded || isSignedIn) return;

    setupCompletedForRef.current = null;

    const clearLocalBalance = () => {
      if (usePlayStore.getState().tokens !== 0) {
        usePlayStore.getState().setTokenBalance(0);
      }
    };

    clearLocalBalance();
    if (usePlayStore.persist.hasHydrated()) {
      return;
    }

    return usePlayStore.persist.onFinishHydration(() => {
      clearLocalBalance();
    });
  }, [authDisabled, isClerkLoaded, isSignedIn]);

  // Step 3: Subscribe to the wallet balance and push it into the local store.
  const balanceData = useQuery(
    api.wallet.getBalance,
    installationId && !authDisabled && isClerkLoaded && isSignedIn && isAuthenticated
      ? { installationId }
      : 'skip'
  );

  useEffect(() => {
    if (authDisabled || !isSignedIn) return;
    if (balanceData && typeof balanceData.balance === 'number') {
      const current = usePlayStore.getState().tokens;
      if (current !== balanceData.balance) {
        usePlayStore.getState().setTokenBalance(balanceData.balance);
      }
    }
  }, [authDisabled, balanceData, isSignedIn]);
}
