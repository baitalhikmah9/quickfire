/** Best-effort Clerk API error string for Expo / shared Clerk clients. */
export function clerkErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const errors = (error as { errors?: Array<{ message?: string; longMessage?: string }> }).errors;
    const first = errors?.[0];
    const msg = first?.longMessage ?? first?.message;
    if (msg) return msg;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
