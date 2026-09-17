import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import type { Brief, ContentState } from "@se/core";
import { eq } from "drizzle-orm";
import {
  recordCost,
  recomputeContentEconomics,
  schema,
  spentInPeriod,
  transitionState,
} from "@se/db";
import {
  budgetCap,
  canSpend,
  evaluateBudget,
  periodBounds,
  tokenCostUsd,
  type BudgetPeriod,
  type BudgetState,
} from "@se/economics";
import { logDecision } from "@se/observability";
import { mockCopywriter, mockQuality, mockResearch, mockVisual, mockPublish } from "./mocks.js";
import type { AgentContext, AgentResult } from "./types.js";

/**
 * Orchestratoren eier tilstandsmaskinen for ett content_item.
 *
 * Den gjør tre ting og ikke mer: kaller agentene i riktig rekkefølge, fører
 * kostnad for hver kjøring, og flytter tilstand. All domenelogikk ligger i
 * agentene; all validering av overganger ligger i @se/core.
 */

export class PipelineStopped extends Error {
  constructor(
    readonly state: ContentState,
    readonly reason: string,
  ) {
    super(`Pipelinen stoppet i ${state}: ${reason}`);
    this.name = "PipelineStopped";
  }
}

/** Fører kostnaden for én agentkjøring: tokens pluss eventuelle mediekostnader. */
async function chargeForRun<T>(
  ctx: AgentContext,
  contentItemId: string,
  agent: Parameters<typeof recordCost>[1]["agent"],
  result: AgentResult<T>,
): Promise<Decimal> {
  const tokensUsd = tokenCostUsd(result.usage);
  const totalTokens =
    result.usage.inputTokens + result.usage.outputTokens;

  const occurredAt = ctx.now ?? new Date();

  await recordCost(ctx.db, {
    contentItemId,
    agent,
    type: "tokens",
    quantity: totalTokens,
    occurredAt,
    // Enhetsprisen lagres som effektiv pris per token for denne kjøringen,
    // slik at mengde x enhetspris alltid gir tilbake beløpet som ble ført.
    unitPriceUsd: totalTokens > 0 ? tokensUsd.div(totalTokens) : 0,
    fxRate: ctx.fxRate,
  });

  let extraUsd = new Decimal(0);
  for (const extra of result.extraCostsUsd ?? []) {
    const amount = new Decimal(extra.unitPriceUsd).times(extra.quantity);
    extraUsd = extraUsd.plus(amount);
    await recordCost(ctx.db, {
      contentItemId,
      agent,
      type: extra.type,
      quantity: extra.quantity,
      unitPriceUsd: extra.unitPriceUsd,
      fxRate: ctx.fxRate,
      occurredAt,
    });
  }

  await ctx.db.insert(schema.agentRuns).values({
    contentItemId,
    agent,
    model: result.usage.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cachedTokens: result.usage.cachedTokens ?? 0,
    status: "ok",
  });

  return tokensUsd.plus(extraUsd).times(new Decimal(ctx.fxRate));
}

/** Leser budsjettstatus for alle tre periodene. */
export async function currentBudgets(
  ctx: AgentContext,
  now: Date = ctx.now ?? new Date(),
): Promise<BudgetState[]> {
  const periods: BudgetPeriod[] = ["day", "week", "month"];
  const states: BudgetState[] = [];
  for (const period of periods) {
    const { from, to } = periodBounds(period, now);
    const spent = await spentInPeriod(ctx.db, from, to);
    states.push(
      evaluateBudget(period, budgetCap(ctx.config.budgets, period), spent, ctx.config.budgets.warnAtPct),
    );
  }
  return states;
}

export interface PipelineResult {
  contentItemId: string;
  finalState: ContentState;
  totalCostNok: string;
  stoppedReason?: string;
}

/**
 * Kjører ett innlegg fra `planned` til `awaiting_approval` (eller `scheduled`
 * for kanaler satt til auto).
 *
 * Måling, inntektsføring og oppgjør skjer senere, av egne jobber - et innlegg
 * kan ikke måles i samme kjøring som det ble laget.
 */
export async function runPipeline(ctx: AgentContext, brief: Brief): Promise<PipelineResult> {
  const idempotencyKey = `${brief.channel}:${brief.scheduledFor.toISOString()}:${randomUUID()}`;

  const [item] = await ctx.db
    .insert(schema.contentItems)
    .values({
      state: "planned",
      channel: brief.channel,
      format: brief.format,
      language: brief.language,
      idempotencyKey,
      dryRun: ctx.dryRun,
      abGroupId: randomUUID(),
    })
    .returning({ id: schema.contentItems.id });

  const contentItemId = item!.id;
  let spentNok = new Decimal(0);

  const stop = async (to: ContentState, reason: string): Promise<PipelineResult> => {
    await transitionState(ctx.db, contentItemId, to, "orchestrator", reason);
    logDecision(ctx.logger, {
      agent: "orchestrator",
      contentItemId,
      decision: `stopp i ${to}`,
      reasoning: reason,
      costNok: spentNok.toFixed(4),
    });
    return { contentItemId, finalState: to, totalCostNok: spentNok.toFixed(4), stoppedReason: reason };
  };

  // --- Budsjettvakt før første krone brukes -------------------------------
  const budgets = await currentBudgets(ctx);
  const decision = canSpend(budgets, new Decimal(brief.costCapNok));
  if (!decision.allowed) {
    return stop("blocked", `Budsjettstopp: ${decision.reason}`);
  }

  // --- Research -----------------------------------------------------------
  const research = await mockResearch(ctx, { contentItemId, brief });
  spentNok = spentNok.plus(await chargeForRun(ctx, contentItemId, "research", research));

  if (research.output.unsourcedClaims.length > 0) {
    return stop(
      "needs_review",
      `Research fant ${research.output.unsourcedClaims.length} påstand(er) uten kilde. ` +
        "Ingen påstander uten kilde.",
    );
  }

  for (const source of research.output.sources) {
    await ctx.db.insert(schema.researchSources).values({ contentItemId, ...source, verified: true });
  }
  await transitionState(ctx.db, contentItemId, "researched", "research", "Faktagrunnlag med kilder hentet.");

  // --- Copywriter ---------------------------------------------------------
  const copy = await mockCopywriter(ctx, { contentItemId, brief });
  spentNok = spentNok.plus(await chargeForRun(ctx, contentItemId, "copywriter", copy));

  const chosen = copy.output.variants[0];
  await ctx.db
    .update(schema.contentItems)
    .set({
      script: chosen.script,
      caption: chosen.caption,
      hashtags: chosen.hashtags,
      variant: chosen.variant,
      language: copy.output.language,
      updatedAt: new Date(),
    })
    .where(eqId(contentItemId));

  await transitionState(ctx.db, contentItemId, "drafted", "copywriter", "To varianter skrevet for A/B-test.");

  // --- Visual -------------------------------------------------------------
  const visual = await mockVisual(ctx, { contentItemId, brief });
  const visualCostNok = new Decimal(visual.output.estimatedCostNok).times(new Decimal(ctx.fxRate));

  // Kostnadstaket i briefen er en hard grense. Overskrides det, stopper vi og
  // flagger - vi fortsetter ikke og håper på at det går bra.
  if (visualCostNok.gt(new Decimal(brief.costCapNok))) {
    return stop(
      "blocked",
      `Mediegenerering ville kostet ${visualCostNok.toFixed(2)} NOK, over kostnadstaket ` +
        `på ${new Decimal(brief.costCapNok).toFixed(2)} NOK.`,
    );
  }

  spentNok = spentNok.plus(await chargeForRun(ctx, contentItemId, "visual", visual));
  await ctx.db
    .update(schema.contentItems)
    .set({ mediaUrls: visual.output.mediaUrls, updatedAt: new Date() })
    .where(eqId(contentItemId));

  await transitionState(
    ctx.db,
    contentItemId,
    "visual_ready",
    "visual",
    visual.output.reusedFromLibrary ? "Gjenbrukt fra mediebiblioteket." : "Media generert.",
  );

  // --- Quality: vetorett --------------------------------------------------
  const qa = await mockQuality(ctx, { contentItemId, brief }, copy.output);
  spentNok = spentNok.plus(await chargeForRun(ctx, contentItemId, "quality", qa));

  await ctx.db.insert(schema.qaReviews).values({
    contentItemId,
    round: 1,
    verdict: qa.output.verdict,
    checks: qa.output.checks,
    reasoning: qa.output.reasoning,
  });

  if (qa.output.verdict === "blocked") {
    return stop("blocked", `Quality blokkerte: ${qa.output.reasoning}`);
  }
  if (qa.output.verdict === "revise") {
    return stop("revising", `Quality ba om revisjon: ${qa.output.reasoning}`);
  }

  await transitionState(ctx.db, contentItemId, "qa_passed", "quality", qa.output.reasoning);

  // --- Godkjenningsgaten --------------------------------------------------
  const channelConfig = ctx.config.channels.channels[brief.channel];
  if (channelConfig?.autopublishMode === "manual") {
    await transitionState(
      ctx.db,
      contentItemId,
      "awaiting_approval",
      "orchestrator",
      "Kanalen krever eiers godkjenning før publisering (AUTOPUBLISH_MODE=manual).",
    );
    logDecision(ctx.logger, {
      agent: "orchestrator",
      contentItemId,
      decision: "venter på godkjenning",
      reasoning: `${brief.channel} er satt til manuell publisering.`,
      costNok: spentNok.toFixed(4),
    });
    return { contentItemId, finalState: "awaiting_approval", totalCostNok: spentNok.toFixed(4) };
  }

  await transitionState(
    ctx.db,
    contentItemId,
    "scheduled",
    "orchestrator",
    `Klar for publisering ${brief.scheduledFor.toISOString()}.`,
  );

  return { contentItemId, finalState: "scheduled", totalCostNok: spentNok.toFixed(4) };
}

/** Godkjenner et innlegg som venter, og setter det i publiseringskø. */
export async function approve(ctx: AgentContext, contentItemId: string, note: string): Promise<void> {
  await transitionState(ctx.db, contentItemId, "scheduled", "owner", `Godkjent av eier: ${note}`);
}

/**
 * Avviser et innlegg som venter.
 *
 * Avvisningen lagres som en qa_review med verdict `owner_rejected`. Det er
 * ikke bokføring for bokføringens skyld: Analyst-agenten leser disse inn i
 * `learnings`, og det er den raskeste veien til at Copywriter treffer
 * eierens stemme. Se ARCHITECTURE.md 9.1.
 */
export async function reject(ctx: AgentContext, contentItemId: string, reason: string): Promise<void> {
  await ctx.db.insert(schema.qaReviews).values({
    contentItemId,
    round: 99,
    verdict: "owner_rejected",
    checks: [],
    reasoning: reason,
  });
  await transitionState(ctx.db, contentItemId, "cancelled", "owner", `Avvist av eier: ${reason}`);
}

/** Publiserer et planlagt innlegg. Idempotent på idempotency_key. */
export async function publish(ctx: AgentContext, contentItemId: string, brief: Brief) {
  const [item] = await ctx.db
    .select({
      idempotencyKey: schema.contentItems.idempotencyKey,
      externalPostId: schema.contentItems.externalPostId,
    })
    .from(schema.contentItems)
    .where(eqId(contentItemId));

  if (!item) throw new Error(`Fant ikke content_item ${contentItemId}`);

  // Allerede publisert: returner eksisterende ID i stedet for å poste på nytt.
  if (item.externalPostId) return { externalPostId: item.externalPostId, alreadyPublished: true };

  const result = await mockPublish(ctx, {
    contentItemId,
    brief,
    idempotencyKey: item.idempotencyKey,
  });

  await ctx.db
    .update(schema.contentItems)
    .set({
      externalPostId: result.externalPostId,
      publishedAt: result.publishedAt,
      dryRun: result.dryRun,
      updatedAt: new Date(),
    })
    .where(eqId(contentItemId));

  await transitionState(
    ctx.db,
    contentItemId,
    "published",
    "publisher",
    result.dryRun ? "Dry-run: ingenting ble sendt til plattformen." : "Publisert.",
  );

  return { externalPostId: result.externalPostId, alreadyPublished: false };
}

/** Skriver en måling og oppdaterer økonomien. */
export async function measure(
  ctx: AgentContext,
  contentItemId: string,
  channel: Brief["channel"],
  metrics: ReturnType<typeof import("./mocks.js").mockMetrics>,
) {
  await ctx.db.insert(schema.contentMetrics).values({ contentItemId, channel, ...metrics });
  await transitionState(ctx.db, contentItemId, "measured", "analyst", `Målt: ${metrics.views} visninger.`);
  return recomputeContentEconomics(ctx.db, contentItemId);
}

/** Ferdig regnskapsført. Krever at både kostnad og inntekt er ført. */
export async function settle(ctx: AgentContext, contentItemId: string) {
  const economics = await recomputeContentEconomics(ctx.db, contentItemId);
  await transitionState(
    ctx.db,
    contentItemId,
    "settled",
    "orchestrator",
    `Oppgjort. Margin ${economics.marginNok.toFixed(2)} NOK, RPM ${economics.rpmNok?.toFixed(4) ?? "ikke målbar"}.`,
  );
  await ctx.db
    .update(schema.contentEconomics)
    .set({ settledAt: new Date() })
    .where(eqEconomicsId(contentItemId));
  return economics;
}

// Små hjelpere så Drizzle-importene ikke sprer seg utover fila.
function eqId(id: string) {
  return eq(schema.contentItems.id, id);
}
function eqEconomicsId(id: string) {
  return eq(schema.contentEconomics.contentItemId, id);
}
