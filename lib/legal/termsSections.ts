import type { LegalSection } from './documentTypes';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      'These Terms of Service (“Terms”) govern your access to and use of Backfire, including our mobile and web clients, gameplay features, virtual token balances, and related services (collectively, the “Service”). By creating an account, signing in, or otherwise using the Service, you agree to these Terms.',
      'If you do not agree, do not use the Service. We may update these Terms from time to time; continued use after changes become effective constitutes acceptance of the revised Terms.',
    ],
  },
  {
    heading: 'Eligibility and accounts',
    paragraphs: [
      'You must be able to form a binding contract in your jurisdiction to use the Service. Authentication is provided through Clerk; you may sign in with supported identity providers (for example Google or Apple). You are responsible for safeguarding your account credentials and for activity that occurs under your account.',
    ],
  },
  {
    heading: 'Gameplay and acceptable use',
    paragraphs: [
      'Backfire is a competitive trivia experience. You agree not to interfere with the Service, other players, or our systems - including by cheating, exploiting bugs for unfair advantage, harassing others, scraping or reverse engineering the Service except as permitted by law, or attempting to access data or areas you are not authorized to use.',
      'We may suspend or terminate access if we reasonably believe you have violated these Terms or pose risk to the Service or other users.',
    ],
  },
  {
    heading: 'Virtual items and purchases',
    paragraphs: [
      'The Service may offer virtual tokens or similar digital balances for use within Backfire. Unless required by applicable law, purchases are final; virtual balances have no cash value, are non-transferable outside the Service as we allow, and may be modified or discontinued as part of product changes.',
      'In-app purchases are processed by Apple and/or Google through their respective storefronts and are also subject to their terms. Subscription or purchase fulfillment may be coordinated using RevenueCat; see our Privacy Policy for how related data is handled.',
    ],
  },
  {
    heading: 'Promotions',
    paragraphs: [
      'Promotional codes or campaigns may have eligibility rules, caps, or expiration. We may refuse or reverse redemptions that appear fraudulent, abusive, or inconsistent with stated rules.',
    ],
  },
  {
    heading: 'Intellectual property',
    paragraphs: [
      'The Service, including software, branding, trivia content, and documentation, is owned by us or our licensors and is protected by intellectual property laws. We grant you a limited, personal, non-exclusive, non-transferable license to use the Service for its intended purpose. You may not copy, modify, distribute, or create derivative works from our materials except as allowed by law or with our prior written consent.',
    ],
  },
  {
    heading: 'Third-party services',
    paragraphs: [
      'The Service relies on third parties (including authentication, hosting, and payment infrastructure). Their services are subject to their own terms and policies.',
    ],
  },
  {
    heading: 'Disclaimers and limitation of liability',
    paragraphs: [
      'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, TO THE MAXIMUM EXTENT PERMITTED BY LAW, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES, SUPPLIERS, AND LICENSORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY U.S. DOLLARS (US$50), EXCEPT WHERE PROHIBITED BY LAW.',
    ],
  },
  {
    heading: 'Indemnity',
    paragraphs: [
      'You will defend, indemnify, and hold harmless us and our affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable attorneys’ fees) arising out of or related to your use of the Service or violation of these Terms, except to the extent caused by our willful misconduct.',
    ],
  },
  {
    heading: 'Governing law and disputes',
    paragraphs: [
      'These Terms are governed by the laws applicable in the United States, without regard to conflict-of-law rules. Courts in the United States have exclusive jurisdiction over disputes arising from these Terms or the Service, except where prohibited by the consumer protection laws of your country of residence.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      'For questions about these Terms, contact us using the developer support channels listed on the storefront where you downloaded Backfire (for example the App Store or Google Play listing).',
    ],
  },
];
