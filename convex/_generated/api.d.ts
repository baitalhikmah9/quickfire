/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminSignIn from "../adminSignIn.js";
import type * as content from "../content.js";
import type * as devices from "../devices.js";
import type * as http from "../http.js";
import type * as lib_accountDeletion from "../lib/accountDeletion.js";
import type * as lib_adminSignInRateLimit from "../lib/adminSignInRateLimit.js";
import type * as lib_adminValidation from "../lib/adminValidation.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_clientPurchaseSync from "../lib/clientPurchaseSync.js";
import type * as lib_contentRules from "../lib/contentRules.js";
import type * as lib_ensureWallet from "../lib/ensureWallet.js";
import type * as lib_grantConsumablePurchase from "../lib/grantConsumablePurchase.js";
import type * as lib_paymentCatalog from "../lib/paymentCatalog.js";
import type * as lib_paymentWebhook from "../lib/paymentWebhook.js";
import type * as lib_promoRedeemRateLimit from "../lib/promoRedeemRateLimit.js";
import type * as lib_promoRules from "../lib/promoRules.js";
import type * as lib_purchaserAccountMerge from "../lib/purchaserAccountMerge.js";
import type * as lib_purchaserAccounts from "../lib/purchaserAccounts.js";
import type * as lib_walletLedger from "../lib/walletLedger.js";
import type * as payments from "../payments.js";
import type * as promo from "../promo.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminSignIn: typeof adminSignIn;
  content: typeof content;
  devices: typeof devices;
  http: typeof http;
  "lib/accountDeletion": typeof lib_accountDeletion;
  "lib/adminSignInRateLimit": typeof lib_adminSignInRateLimit;
  "lib/adminValidation": typeof lib_adminValidation;
  "lib/auth": typeof lib_auth;
  "lib/clientPurchaseSync": typeof lib_clientPurchaseSync;
  "lib/contentRules": typeof lib_contentRules;
  "lib/ensureWallet": typeof lib_ensureWallet;
  "lib/grantConsumablePurchase": typeof lib_grantConsumablePurchase;
  "lib/paymentCatalog": typeof lib_paymentCatalog;
  "lib/paymentWebhook": typeof lib_paymentWebhook;
  "lib/promoRedeemRateLimit": typeof lib_promoRedeemRateLimit;
  "lib/promoRules": typeof lib_promoRules;
  "lib/purchaserAccountMerge": typeof lib_purchaserAccountMerge;
  "lib/purchaserAccounts": typeof lib_purchaserAccounts;
  "lib/walletLedger": typeof lib_walletLedger;
  payments: typeof payments;
  promo: typeof promo;
  seed: typeof seed;
  sessions: typeof sessions;
  users: typeof users;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
