import { join } from "node:path";
import Decimal from "decimal.js";
import { loadConfig, type AppConfig, type Brief } from "@se/core";
import { createDb, runMigrations, schema, type Database } from "@se/db";
import { createLogger } from "@se/observability";
import type { AgentContext } from "@se/agents";

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/social_engine";

export const FX_RATE = "9.30";

export async function setupDatabase() {
  await runMigrations(TEST_DATABASE_URL);
  return createDb(TEST_DATABASE_URL);
}

/** Tømmer alle tabeller mellom tester. Cascade tar avhengighetene. */
export async function truncateAll(db: Database) {
  await db.execute(
    `truncate table
       state_transitions, qa_reviews, research_sources, agent_runs,
       content_metrics, content_economics, cost_events, revenue_events,
       content_items, content_plan, budgets, portfolio_decisions,
       monetization_thresholds, system_flags, notifications, learnings
     restart identity cascade` as never,
  );
}

export function testContext(db: Database, over: Partial<AgentContext> = {}): AgentContext {
  return {
    db,
    logger: createLogger("test", "silent"),
    config: loadConfig(join(process.cwd(), "config")),
    fxRate: FX_RATE,
    dryRun: true,
    ...over,
  };
}

/** En brief som speiler en faktisk YouTube Short i scenario B. */
export function shortVideoBrief(over: Partial<Brief> = {}): Brief {
  return {
    theme: "mental_training",
    angle: "Why starting over is not the problem",
    channel: "youtube",
    format: "short_video",
    language: "en",
    targetRpmNok: "0.4650",
    costCapNok: "25.0000",
    scheduledFor: new Date("2026-09-20T17:00:00Z"),
    rationale: "Høyest vektet tema på kanalen med raskest vei til inntekt.",
    ...over,
  };
}

export function linkedinBrief(over: Partial<Brief> = {}): Brief {
  return {
    theme: "performance_psychology",
    angle: "Det ledere tar feil av når folk mister driv",
    channel: "linkedin",
    format: "text_post",
    language: "no",
    targetRpmNok: "0.0000",
    costCapNok: "10.0000",
    scheduledFor: new Date("2026-09-18T07:00:00Z"),
    rationale: "Nærmeste vei til coachinghenvendelser.",
    ...over,
  };
}

export const config: AppConfig = loadConfig(join(process.cwd(), "config"));
export { Decimal, schema };
