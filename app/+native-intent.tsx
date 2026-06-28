import { rewriteNativeOAuthCallbackPath } from '@/lib/auth/clerkOAuthRedirect';

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  return rewriteNativeOAuthCallbackPath(path, initial);
}
