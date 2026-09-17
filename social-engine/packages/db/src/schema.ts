import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  AGENTS,
  ATTRIBUTIONS,
  CHANNELS,
  COST_TYPES,
  FORMATS,
  LANGUAGES,
  REVENUE_TYPES,
  STATES,
} from "@se/core/domain";

/**
 * Databaseskjema.
 *
 * To gjennomgående regler:
 *  - Penger er alltid numeric(14,4). Aldri float, aldri double precision.
 *  - Tidsstempler er alltid timestamptz i UTC. Visning i Europe/Oslo skjer
 *    i dashboardet, ikke i databasen.
 */

export const channelEnum = pgEnum("channel", CHANNELS);
export const formatEnum = pgEnum("format", FORMATS);
export const languageEnum = pgEnum("language", LANGUAGES);
export const stateEnum = pgEnum("content_state", STATES);
export const costTypeEnum = pgEnum("cost_type", COST_TYPES);
export const revenueTypeEnum = pgEnum("revenue_type", REVENUE_TYPES);
export const attributionEnum = pgEnum("attribution", ATTRIBUTIONS);
export const agentEnum = pgEnum("agent", AGENTS);

const money = (name: string) => numeric(name, { precision: 14, scale: 4 });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ---------------------------------------------------------------------------
// Innholdsmodellen
// ---------------------------------------------------------------------------

export const contentPlan = pgTable("content_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekStart: date("week_start").notNull(),
  theme: text("theme").notNull(),
  channel: channelEnum("channel").notNull(),
  format: formatEnum("format").notNull(),
  language: languageEnum("language").notNull(),
  angle: text("angle").notNull(),
  targetRpmNok: money("target_rpm_nok").notNull(),
  /** Hard grense. Visual-agenten stopper og flagger ved overskridelse. */
  costCapNok: money("cost_cap_nok").notNull(),
  scheduledFor: ts("scheduled_for").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").references(() => contentPlan.id),
    state: stateEnum("state").notNull().default("planned"),
    channel: channelEnum("channel").notNull(),
    format: formatEnum("format").notNull(),
    /** Må matche kanalens språk i channels.yaml. Validert ved `drafted`. */
    language: languageEnum("language").notNull(),
    script: text("script"),
    caption: text("caption"),
    hashtags: text("hashtags").array(),
    variant: smallint("variant"),
    abGroupId: uuid("ab_group_id"),
    mediaUrls: text("media_urls").array(),
    /** Hindrer dobbeltposting. Andre publiseringsforsøk er en no-op. */
    idempotencyKey: text("idempotency_key").notNull(),
    externalPostId: text("external_post_id"),
    publishedAt: ts("published_at"),
    /** true = hele pipelinen kjørte med reelle kostnader, ingenting gikk ut. */
    dryRun: boolean("dry_run").notNull().default(true),
    revisionRounds: smallint("revision_rounds").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("content_items_idempotency_key_idx").on(t.idempotencyKey),
    index("content_items_state_idx").on(t.state),
    index("content_items_channel_idx").on(t.channel),
  ],
);

export const researchSources = pgTable(
  "research_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    claim: text("claim").notNull(),
    url: text("url").notNull(),
    publisher: text("publisher").notNull(),
    retrievedAt: ts("retrieved_at").notNull(),
    verified: boolean("verified").notNull().default(false),
  },
  (t) => [index("research_sources_item_idx").on(t.contentItemId)],
);

export const qaReviews = pgTable(
  "qa_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    round: smallint("round").notNull(),
    /** approved | revise | blocked | owner_rejected */
    verdict: text("verdict").notNull(),
    /** Én rad per sjekk, med begrunnelse. Se contracts.ts QA_CHECKS. */
    checks: jsonb("checks").notNull(),
    reasoning: text("reasoning").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("qa_reviews_item_idx").on(t.contentItemId)],
);

export const stateTransitions = pgTable(
  "state_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    fromState: stateEnum("from_state").notNull(),
    toState: stateEnum("to_state").notNull(),
    agent: agentEnum("agent").notNull(),
    reasoning: text("reasoning").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("state_transitions_item_idx").on(t.contentItemId, t.createdAt)],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "cascade",
    }),
    agent: agentEnum("agent").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedTokens: integer("cached_tokens").notNull().default(0),
    durationMs: integer("duration_ms"),
    status: text("status").notNull(),
    error: text("error"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("agent_runs_item_idx").on(t.contentItemId)],
);

// ---------------------------------------------------------------------------
// Økonomimodellen
// ---------------------------------------------------------------------------

export const costEvents = pgTable(
  "cost_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    /** null = felleskostnad (infrastruktur), ikke knyttet til ett innlegg. */
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "cascade",
    }),
    agent: agentEnum("agent").notNull(),
    type: costTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unitPriceUsd: numeric("unit_price_usd", { precision: 14, scale: 8 }).notNull(),
    amountUsd: money("amount_usd").notNull(),
    /** Kursen som gjaldt da kostnaden ble ført. Lagres for reproduserbarhet. */
    fxRate: numeric("fx_rate", { precision: 10, scale: 4 }).notNull(),
    amountNok: money("amount_nok").notNull(),
  },
  (t) => [
    index("cost_events_item_idx").on(t.contentItemId),
    index("cost_events_occurred_idx").on(t.occurredAt),
  ],
);

export const revenueEvents = pgTable(
  "revenue_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: ts("occurred_at").notNull().defaultNow(),
    channel: channelEnum("channel").notNull(),
    /** null = kanalinntekt for en periode, fordeles pro rata på visninger. */
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "cascade",
    }),
    type: revenueTypeEnum("type").notNull(),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    fxRate: numeric("fx_rate", { precision: 10, scale: 4 }).notNull(),
    amountNok: money("amount_nok").notNull(),
    source: text("source").notNull(),
    attribution: attributionEnum("attribution").notNull(),
  },
  (t) => [
    index("revenue_events_item_idx").on(t.contentItemId),
    index("revenue_events_channel_idx").on(t.channel, t.occurredAt),
  ],
);

export const contentMetrics = pgTable(
  "content_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    measuredAt: ts("measured_at").notNull().defaultNow(),
    views: bigint("views", { mode: "number" }).notNull().default(0),
    /** YouTubes strengere telling. Denne, ikke `views`, teller mot YPP. */
    engagedViews: bigint("engaged_views", { mode: "number" }).notNull().default(0),
    watchTimeSeconds: bigint("watch_time_seconds", { mode: "number" }).notNull().default(0),
    retentionPct: numeric("retention_pct", { precision: 5, scale: 2 }),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    follows: integer("follows").notNull().default(0),
  },
  (t) => [index("content_metrics_item_idx").on(t.contentItemId, t.measuredAt)],
);

/** Materialisert visning. Skrives ved `measured` og `settled`. */
export const contentEconomics = pgTable("content_economics", {
  contentItemId: uuid("content_item_id")
    .primaryKey()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  totalCostNok: money("total_cost_nok").notNull(),
  totalRevenueNok: money("total_revenue_nok").notNull(),
  views: bigint("views", { mode: "number" }).notNull(),
  /** null ved null visninger - «ikke målbart», ikke «tjente ingenting». */
  rpmNok: money("rpm_nok"),
  marginNok: money("margin_nok").notNull(),
  marginPct: numeric("margin_pct", { precision: 10, scale: 6 }),
  settledAt: ts("settled_at"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    period: text("period").notNull(), // day | week | month
    periodStart: date("period_start").notNull(),
    capNok: money("cap_nok").notNull(),
    spentNok: money("spent_nok").notNull().default("0"),
    status: text("status").notNull().default("ok"), // ok | warning | exceeded
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("budgets_period_idx").on(t.period, t.periodStart)],
);

export const portfolioDecisions = pgTable("portfolio_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  decidedAt: ts("decided_at").notNull().defaultNow(),
  decision: text("decision").notNull(),
  subjectType: text("subject_type").notNull(),
  subject: text("subject").notNull(),
  /** Tallgrunnlaget beslutningen hviler på. Vises i dashboardet. */
  evidence: jsonb("evidence").notNull(),
  reasoning: text("reasoning").notNull(),
  enactedBy: text("enacted_by").notNull(),
  overriddenByOwner: boolean("overridden_by_owner").notNull().default(false),
});

/** Vei til terskel som eksplisitt delmål, ikke en utledet visning. */
export const monetizationThresholds = pgTable(
  "monetization_thresholds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: channelEnum("channel").notNull(),
    metric: text("metric").notNull(),
    required: bigint("required", { mode: "number" }).notNull(),
    current: bigint("current", { mode: "number" }).notNull().default(0),
    measuredAt: ts("measured_at").notNull().defaultNow(),
    projectedReachDate: date("projected_reach_date"),
  },
  (t) => [uniqueIndex("monetization_thresholds_idx").on(t.channel, t.metric)],
);

// ---------------------------------------------------------------------------
// Drift og sikkerhet
// ---------------------------------------------------------------------------

export const oauthTokens = pgTable("oauth_tokens", {
  channel: channelEnum("channel").primaryKey(),
  /** Kryptert at rest. Aldri logget, aldri returnert via API-et. */
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  scopes: text("scopes").array().notNull(),
  expiresAt: ts("expires_at"),
  lastRefreshedAt: ts("last_refreshed_at"),
});

export const systemFlags = pgTable("system_flags", {
  key: text("key").primaryKey(),
  value: boolean("value").notNull(),
  changedBy: text("changed_by").notNull(),
  changedAt: ts("changed_at").notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    payload: jsonb("payload").notNull(),
    sentAt: ts("sent_at"),
    acknowledgedAt: ts("acknowledged_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_created_idx").on(t.createdAt)],
);

export const learnings = pgTable("learnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: ts("created_at").notNull().defaultNow(),
  scope: text("scope").notNull(), // hook | theme | length | timing | channel
  insight: text("insight").notNull(),
  evidence: jsonb("evidence").notNull(),
  /** Leses av Strategist og Copywriter neste uke. Dette er læringsløkka. */
  active: boolean("active").notNull().default(true),
});
