import { join } from "node:path";
import Fastify from "fastify";
import { loadConfig } from "@se/core";
import {
  createDb,
  isSystemEnabled,
  itemsAwaitingApproval,
  setFlag,
  stuckItems,
  type Database,
} from "@se/db";
import { currentBudgets, type AgentContext } from "@se/agents";
import { createLogger } from "@se/observability";

/**
 * REST-API for dashboardet.
 *
 * Fase 1 dekker det dashboardet trenger for å være ærlig om tilstanden:
 * helsesjekk, kill switch, budsjett og køen som venter på eier. Resten
 * kommer i Fase 4 sammen med økonomivisningen.
 */

const config = loadConfig(join(process.cwd(), "config"));
const logger = createLogger("api");

async function build(db: Database) {
  const app = Fastify({ loggerInstance: logger });
  const ctx: AgentContext = {
    db,
    logger,
    config,
    fxRate: process.env.FX_USD_NOK ?? "9.30",
    dryRun: process.env.DRY_RUN !== "false",
  };

  app.get("/health", async () => ({ status: "ok", dryRun: ctx.dryRun }));

  app.get("/status", async () => {
    const budgets = await currentBudgets(ctx);
    return {
      systemEnabled: await isSystemEnabled(db),
      dryRun: ctx.dryRun,
      budgets: budgets.map((b) => ({
        period: b.period,
        spentNok: b.spentNok.toFixed(2),
        capNok: b.capNok.toFixed(2),
        usedPct: Math.round(b.usedPct * 100),
        status: b.status,
      })),
      awaitingApproval: (await itemsAwaitingApproval(db)).length,
      stuck: (await stuckItems(db)).length,
    };
  });

  app.get("/queue/approval", async () => itemsAwaitingApproval(db));
  app.get("/queue/stuck", async () => stuckItems(db));

  // Kill switch. Sjekkes også i publiseringsjobben, ikke bare her -
  // en bryter som bare finnes i dashboardet er ingen bryter.
  app.post<{ Body: { key: string; value: boolean; changedBy: string } }>(
    "/flags",
    async (request) => {
      const { key, value, changedBy } = request.body;
      await setFlag(db, key, value, changedBy);
      return { key, value };
    },
  );

  return app;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  logger.error("DATABASE_URL mangler. Se .env.example.");
  process.exit(1);
}

const { db } = createDb(databaseUrl);
const app = await build(db);
await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
