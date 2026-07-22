import type { LegalSection } from './documentTypes';

/**
 * Public account-deletion instructions for Play Console / web.
 * Must remain usable without installing the app (Google Play requirement).
 */
export const DELETE_ACCOUNT_SECTIONS: LegalSection[] = [
  {
    heading: 'How to delete your account in the app',
    paragraphs: [
      'If you still have access to Backfire:',
      '1. Open Backfire and sign in with the account you want to delete.',
      '2. Go to Settings (gear icon from the home screen).',
      '3. Scroll to the account section at the bottom.',
      '4. Tap Delete Account (below Sign Out).',
      '5. Read the warning, then tap Delete permanently to confirm.',
      'Deletion starts immediately. Unused tokens are forfeited. Store purchases are not refunded through this process.',
    ],
  },
  {
    heading: 'How to request deletion without the app',
    paragraphs: [
      'If you uninstalled Backfire or cannot sign in, request deletion through the developer contact options on the Google Play or App Store listing for Backfire. Include the email address or sign-in method (for example Google or Apple) tied to your account so we can locate it.',
      'We process valid requests within 30 days, or sooner where required by law.',
    ],
  },
  {
    heading: 'Data that is deleted',
    paragraphs: [
      'Your authentication account (Clerk) is removed so you cannot sign back into the same account.',
      'Profile details such as name and email associated with your Backfire user record are erased.',
      'App preferences stored on your user profile are erased.',
      'Your token balance is forfeited and the purchase identity used for that wallet is unlinked so tokens cannot be restored by signing in again.',
    ],
  },
  {
    heading: 'Data that may be retained (anonymized)',
    paragraphs: [
      'Gameplay history (for example match sessions and scores) may be retained in anonymized or pseudonymous form for product analytics and integrity.',
      'Purchase and wallet ledger records may be retained for accounting, tax, fraud prevention, and store compliance. These records are not used to restore a deleted personal profile.',
      'We may keep limited records of the deletion request itself as needed to demonstrate compliance.',
    ],
  },
  {
    heading: 'Important notes',
    paragraphs: [
      'Account deletion is permanent. Creating a new account later starts a new profile; previous personal data and forfeited tokens are not restored.',
      'Deleting your Backfire account does not automatically delete your Google or Apple account, and does not reverse store purchases handled by Google Play or the App Store.',
      'For general privacy questions, see our Privacy Policy at /privacy.',
    ],
  },
];
