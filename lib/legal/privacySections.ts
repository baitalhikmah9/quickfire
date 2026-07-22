import type { LegalSection } from './documentTypes';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: 'Overview',
    paragraphs: [
      'This Privacy Policy describes how Backfire (“we,” “us,” or “our”) collects, uses, and shares information when you use our trivia application and related services (the “Service”). It reflects the data practices implemented in our product and backend as of the date shown at the top of this screen.',
    ],
  },
  {
    heading: 'Information we collect',
    paragraphs: [
      'Account and profile data: When you sign in with Clerk using a supported provider (such as Google or Apple), we receive and store identifiers and profile details needed to operate your account - for example your Clerk user id, and optional fields such as name and email when provided by the identity provider or your profile.',
      'Gameplay and product usage: We process information about how you use Backfire, including game configuration, match and session records, scores and events, category and language preferences, and related metadata needed to run matches and show history.',
      'Device and installation identifiers: We associate activity with a stable installation or device identifier so we can sync local progress, reduce duplicate questions where designed to do so, and tie optional purchases to the correct wallet before or after you sign in.',
      'Purchases and virtual currency: When you buy tokens or related products through mobile storefronts, Apple and/or Google process payment. We receive purchase-related records through our backend (including webhook payloads from RevenueCat) such as product identifiers, transaction references, timestamps, and pricing fields when supplied - so we can credit your wallet, prevent duplicate grants, and meet accounting and fraud-prevention needs.',
      'Support and safety: We may collect information you send us (for example crash details you choose to share) and technical logs needed to secure the Service.',
    ],
  },
  {
    heading: 'How we use information',
    paragraphs: [
      'We use the information above to provide, maintain, and improve the Service; authenticate users; operate gameplay, leaderboards, and stats as designed; manage tokens, wallets, and promo codes; detect abuse and fraud; comply with law; and communicate with you about the Service where appropriate.',
    ],
  },
  {
    heading: 'How we share information',
    paragraphs: [
      'Service providers: We use vendors that process data on our behalf, including Clerk (authentication), Convex (hosted backend and database), RevenueCat (in-app purchase events and subscriber identifiers as configured), and mobile platform providers (Apple, Google) for payments and platform services.',
      'Legal and safety: We may disclose information if we believe in good faith that disclosure is required by law, legal process, or governmental request, or to protect the rights, safety, or security of users, the public, or Backfire.',
      'Business transfers: If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction, subject to standard confidentiality arrangements.',
      'We do not sell your personal information for money as that term is commonly understood in U.S. state privacy laws.',
    ],
  },
  {
    heading: 'Retention',
    paragraphs: [
      'We retain information for as long as your account is active and as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce our agreements. Some records (for example purchase ledgers) may be retained longer where required for tax, accounting, or fraud prevention.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'We implement administrative, technical, and organizational measures appropriate to the nature of the data we process. No method of transmission or storage is completely secure; we cannot guarantee absolute security.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'The Service is not directed to children under 13 (or the minimum age required in your jurisdiction to consent to data processing). We do not knowingly collect personal information from children. If you believe we have collected information from a child, contact us through your app store listing and we will take appropriate steps.',
    ],
  },
  {
    heading: 'International users',
    paragraphs: [
      'We may process and store information in the United States and other countries where we or our service providers operate. Those countries may have data protection laws that differ from your own. Where required, we rely on appropriate safeguards for cross-border transfers.',
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      'Depending on where you live, you may have rights to access, correct, delete, or export personal information, or to object to or restrict certain processing. You can manage some profile details through your identity provider or Clerk where applicable. You may also contact us via the developer channels listed on the storefront where you obtained Backfire. We will respond consistent with applicable law.',
      'To delete your Backfire account: open Settings while signed in and use Delete Account, or follow the web instructions at /delete-account (also available if you no longer have the app).',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will post the updated version in the app and revise the “Last updated” date. If changes are material, we will provide additional notice where required by law.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'Questions about this Privacy Policy: use the support or developer contact options shown on the App Store or Google Play listing for Backfire.',
    ],
  },
];
