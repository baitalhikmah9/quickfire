import { useAuth } from '@clerk/clerk-expo';
import { isAuthDisabled } from '@/lib/authMode';
import { resolveDisplayTokenBalance } from '@/lib/wallet/displayTokenBalance';
import { usePlayStore } from '@/store/play';

/** Token balance for headers/chips: 0 when signed out. */
export function useDisplayTokenBalance(): number {
  const { isSignedIn } = useAuth();
  const storedTokens = usePlayStore((state) => state.tokens);
  return resolveDisplayTokenBalance({
    authDisabled: isAuthDisabled(),
    isSignedIn,
    storedTokens,
  });
}
