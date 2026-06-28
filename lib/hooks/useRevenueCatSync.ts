import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getOrCreateInstallationId } from '@/lib/deviceInstallation';
import { isAuthDisabled } from '@/lib/authMode';
import {
  clearRevenueCatSessionState,
  establishRevenueCatSession,
  getRevenueCatApiKey,
  getRevenueCatSession,
  isRevenueCatSupported,
  subscribeRevenueCatSession,
  type RevenueCatSessionState,
} from '@/lib/payments/revenueCat';

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

/**
 * Configures RevenueCat at app startup and keeps the SDK identity aligned with
 * the Convex purchaser account (including auth changes and guest merges).
 */
export function useRevenueCatSync(): RevenueCatSessionState {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authDisabled = isAuthDisabled();
  const ensurePurchaserAccount = useMutation(api.payments.ensurePurchaserAccount);
  const linkGuestToCurrentUser = useMutation(api.payments.linkGuestToCurrentUser);
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [session, setSession] = useState<RevenueCatSessionState>(() => getRevenueCatSession());
  const syncKeyRef = useRef<string | null>(null);

  useEffect(() => subscribeRevenueCatSession(setSession), []);

  useEffect(() => {
    if (authDisabled || !isRevenueCatSupported()) return;

    if (!getRevenueCatApiKey()) {
      setSession({
        appUserId: null,
        ready: false,
        error:
          'RevenueCat is not configured for this build. Add EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY and rebuild the app.',
      });
      return;
    }

    let cancelled = false;
    void getOrCreateInstallationId()
      .then((id) => {
        if (!cancelled) setInstallationId(id);
      })
      .catch(() => {
        if (!cancelled) {
          setSession({
            appUserId: null,
            ready: false,
            error: 'Unable to prepare purchases.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authDisabled]);

  useEffect(() => {
    if (authDisabled || !isRevenueCatSupported() || !isLoaded || !isSignedIn || isLoading || !isAuthenticated || !installationId) {
      return;
    }

    const syncKey = `${installationId}:${userId ?? 'unknown'}`;
    if (syncKeyRef.current === syncKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const account = await ensurePurchaserAccount({
          installationId,
          platform: Platform.OS,
          appVersion: getAppVersion(),
        });

        if (
          account.canonicalPurchaserAccountId &&
          account.canonicalPurchaserAccountId !== account.purchaserAccountId
        ) {
          try {
            await linkGuestToCurrentUser({
              purchaserAccountId: account.purchaserAccountId,
              installationId,
            });
          } catch (mergeError) {
            console.warn('Failed to link guest purchaser account', mergeError);
          }
        }

        const appUserId =
          account.canonicalPurchaserAccountId ?? account.purchaserAccountId;

        await establishRevenueCatSession(appUserId);
        if (!cancelled) {
          syncKeyRef.current = syncKey;
        }
      } catch (cause) {
        if (!cancelled) {
          syncKeyRef.current = null;
          setSession({
            appUserId: null,
            ready: false,
            error: cause instanceof Error ? cause.message : 'Unable to prepare purchases.',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authDisabled,
    ensurePurchaserAccount,
    installationId,
    isAuthenticated,
    isLoaded,
    isLoading,
    isSignedIn,
    linkGuestToCurrentUser,
    userId,
  ]);

  useEffect(() => {
    if (!isSignedIn) {
      syncKeyRef.current = null;
      clearRevenueCatSessionState();
    }
  }, [isSignedIn]);

  return session;
}
