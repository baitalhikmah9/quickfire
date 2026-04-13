import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    preferences: v.optional(v.any()),
    lastActiveAt: v.number(),
    role: v.optional(v.string()),
  }).index('by_clerk_id', ['clerkId']),

  categories: defineTable({
    slug: v.string(),
    title: v.string(),
    themeGroup: v.optional(v.string()),
    artwork: v.optional(v.string()),
    enabled: v.boolean(),
  })
    .index('by_slug', ['slug'])
    .index('by_enabled', ['enabled']),

  category_translations: defineTable({
    categoryId: v.id('categories'),
    locale: v.string(),
    title: v.string(),
  })
    .index('by_category_locale', ['categoryId', 'locale'])
    .index('by_locale', ['locale']),

  questions: defineTable({
    categoryId: v.id('categories'),
    canonicalKey: v.string(),
    prompt: v.string(),
    answer: v.string(),
    pointValue: v.number(),
    difficultyTier: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    locale: v.string(),
    status: v.string(),
    hiddenMultiplier: v.optional(v.number()),
    isOvertimeSurge: v.optional(v.boolean()),
  })
    .index('by_category', ['categoryId'])
    .index('by_category_status', ['categoryId', 'status'])
    .index('by_category_locale_status', ['categoryId', 'locale', 'status'])
    .index('by_canonical_locale', ['canonicalKey', 'locale']),

  device_installations: defineTable({
    deviceId: v.string(),
    userId: v.id('users'),
    platform: v.string(),
    appVersion: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index('by_device', ['deviceId'])
    .index('by_user_device', ['userId', 'deviceId']),

  device_question_history: defineTable({
    deviceId: v.string(),
    canonicalKey: v.string(),
    questionId: v.optional(v.id('questions')),
    categoryId: v.id('categories'),
    sessionId: v.optional(v.string()),
    askedAt: v.number(),
  })
    .index('by_device', ['deviceId'])
    .index('by_device_canonical', ['deviceId', 'canonicalKey']),

  score_events: defineTable({
    sessionId: v.string(),
    teamId: v.string(),
    points: v.number(),
    reason: v.string(),
    questionId: v.optional(v.string()),
    turnIndex: v.number(),
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  }).index('by_session', ['sessionId']),

  game_sessions: defineTable({
    mode: v.string(),
    configSnapshot: v.any(),
    seed: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    winningTeamId: v.optional(v.string()),
    userId: v.optional(v.id('users')),
    clientSessionId: v.optional(v.string()),
    deviceId: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_started', ['startedAt'])
    .index('by_client_session', ['clientSessionId']),

  game_participants: defineTable({
    sessionId: v.id('game_sessions'),
    teamId: v.string(),
    playerName: v.optional(v.string()),
    hotSeatEligible: v.boolean(),
    finalScore: v.number(),
  }).index('by_session', ['sessionId']),

  rapid_fire_runs: defineTable({
    userId: v.id('users'),
    deviceId: v.optional(v.string()),
    runId: v.optional(v.string()),
    selectedCategories: v.array(v.string()),
    score: v.number(),
    answerAccuracy: v.number(),
    durationMs: v.number(),
    idempotencyKey: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_run_id', ['runId'])
    .index('by_idempotency', ['idempotencyKey']),

  wallets: defineTable({
    userId: v.id('users'),
    balance: v.number(),
    tokenCap: v.optional(v.number()),
  }).index('by_user', ['userId']),

  wallet_transactions: defineTable({
    walletId: v.id('wallets'),
    type: v.string(),
    amount: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    status: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    reservationId: v.optional(v.string()),
  })
    .index('by_wallet', ['walletId'])
    .index('by_wallet_created', ['walletId', 'createdAt'])
    .index('by_wallet_idempotency', ['walletId', 'idempotencyKey'])
    .index('by_reservation', ['reservationId']),

  promo_codes: defineTable({
    code: v.string(),
    rewardType: v.string(),
    rewardAmount: v.number(),
    usageCap: v.number(),
    activeFrom: v.optional(v.number()),
    activeTo: v.optional(v.number()),
    usedCount: v.optional(v.number()),
    perUserLimit: v.optional(v.number()),
    active: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  }).index('by_code', ['code']),

  promo_redemptions: defineTable({
    promoCodeId: v.id('promo_codes'),
    userId: v.id('users'),
    redeemedAt: v.number(),
    transactionId: v.id('wallet_transactions'),
  })
    .index('by_user', ['userId'])
    .index('by_promo_code', ['promoCodeId'])
    .index('by_user_promo', ['userId', 'promoCodeId']),

  feature_flags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    value: v.optional(v.any()),
  }).index('by_key', ['key']),
});
