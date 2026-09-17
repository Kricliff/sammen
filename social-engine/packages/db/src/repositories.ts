import { and, desc, eq, gte, inArray, isNull, lt, or, sql as raw } from "drizzle-orm";
import {
  assertTransition,
  computeEconomics,
  proRataAllocate,
  toMoneyString,
  type AgentName,
  type Channel,
  type ContentState,
  type Economics,
} from "@se/core";
import Decimal from "decimal.js";
import type { Database } from "./client.js";
import * as schema from "./schema.js";

/**
 * Repositories: det tynne laget mellom domenelogikken og Drizzle.
 *
 * Alt som må skje atomisk ligger her, ikke i agentene. Særlig
 * `transitionState`, som er den eneste lovlige måten å endre tilstand på.
 */

// ---------------------------------------------------------------------------
// Tilstandsoverganger
// ---------------------------------------------------------------------------

export class ContentItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Fant ikke content_item ${id}`);
    this.name = "ContentItemNotFoundError";
  }
}

/**
 * Endrer tilstand på et innlegg og skriver revisjonsloggen i samme transaksjon.
 *
 * Ingen agent får sette `state` direkte. Går loggingen og tilstandsendringen
 * fra hverandre, mister vi sporbarheten nøyaktig når vi trenger den mest -
 * etter en feil.
 *
 * Forutsetningene for `settled` (kostnad og inntekt må være ført) leses fra
 * databasen her, ikke fra kallerens antakelse om hva som er ført.
 */
export async function transitionState(
  db: Database,
  contentItemId: string,
  to: ContentState,
  agent: AgentName,
  reasoning: string,
): Promise<{ from: ContentState; to: ContentState }> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select({ state: schema.contentItems.state, revisionRounds: schema.contentItems.revisionRounds })
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, contentItemId))
      .for("update");

    if (!item) throw new ContentItemNotFoundError(contentItemId);

    const [costRow] = await tx
      .select({ n: raw<number>`count(*)::int` })
      .from(schema.costEvents)
      .where(eq(schema.costEvents.contentItemId, contentItemId));

    const [revenueRow] = await tx
      .select({ n: raw<number>`count(*)::int` })
      .from(schema.revenueEvents)
      .where(eq(schema.revenueEvents.contentItemId, contentItemId));

    assertTransition(item.state, to, {
      revisionRounds: item.revisionRounds,
      hasCost: (costRow?.n ?? 0) > 0,
      hasRevenue: (revenueRow?.n ?? 0) > 0,
    });

    await tx
      .update(schema.contentItems)
      .set({
        state: to,
        updatedAt: new Date(),
        ...(to === "revising" ? { revisionRounds: item.revisionRounds + 1 } : {}),
      })
      .where(eq(schema.contentItems.id, contentItemId));

    await tx.insert(schema.stateTransitions).values({
      contentItemId,
      fromState: item.state,
      toState: to,
      agent,
      reasoning,
    });

    return { from: item.state, to };
  });
}

// ---------------------------------------------------------------------------
// Kostnadsføring
// ---------------------------------------------------------------------------

export interface RecordCostInput {
  contentItemId?: string | null;
  agent: AgentName;
  type: (typeof schema.costTypeEnum.enumValues)[number];
  quantity: Decimal.Value;
  unitPriceUsd: Decimal.Value;
  fxRate: Decimal.Value;
  occurredAt?: Date;
}

/**
 * Fører én kostnadshendelse.
 *
 * Beløpet regnes her, ikke av kalleren, slik at det er nøyaktig ett sted i
 * kodebasen der mengde x enhetspris x kurs blir til kroner.
 */
export async function recordCost(db: Database, input: RecordCostInput): Promise<void> {
  const quantity = new Decimal(input.quantity);
  const unitPriceUsd = new Decimal(input.unitPriceUsd);
  const amountUsd = quantity.times(unitPriceUsd);
  const amountNok = amountUsd.times(new Decimal(input.fxRate));

  await db.insert(schema.costEvents).values({
    contentItemId: input.contentItemId ?? null,
    agent: input.agent,
    type: input.type,
    quantity: quantity.toFixed(4),
    unitPriceUsd: unitPriceUsd.toFixed(8),
    amountUsd: toMoneyString(amountUsd),
    fxRate: new Decimal(input.fxRate).toFixed(4),
    amountNok: toMoneyString(amountNok),
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
  });
}

export interface RecordRevenueInput {
  contentItemId?: string | null;
  channel: Channel;
  type: (typeof schema.revenueTypeEnum.enumValues)[number];
  amount: Decimal.Value;
  currency: string;
  fxRate: Decimal.Value;
  source: string;
  attribution: (typeof schema.attributionEnum.enumValues)[number];
  occurredAt?: Date;
}

export async function recordRevenue(db: Database, input: RecordRevenueInput): Promise<void> {
  const amount = new Decimal(input.amount);
  const amountNok = amount.times(new Decimal(input.fxRate));

  await db.insert(schema.revenueEvents).values({
    contentItemId: input.contentItemId ?? null,
    channel: input.channel,
    type: input.type,
    amount: toMoneyString(amount),
    currency: input.currency,
    fxRate: new Decimal(input.fxRate).toFixed(4),
    amountNok: toMoneyString(amountNok),
    source: input.source,
    attribution: input.attribution,
    ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
  });
}

// ---------------------------------------------------------------------------
// Økonomi per innlegg
// ---------------------------------------------------------------------------

/**
 * Regner ut og lagrer `content_economics` for ett innlegg.
 *
 * Visninger summeres fra siste måling per kanal, ikke fra alle målinger -
 * `content_metrics` er en tidsserie, og å summere hele serien ville telle
 * de samme visningene på nytt for hver måling.
 */
export async function recomputeContentEconomics(
  db: Database,
  contentItemId: string,
): Promise<Economics> {
  const costs = await db
    .select({ amountNok: schema.costEvents.amountNok })
    .from(schema.costEvents)
    .where(eq(schema.costEvents.contentItemId, contentItemId));

  const revenues = await db
    .select({ amountNok: schema.revenueEvents.amountNok })
    .from(schema.revenueEvents)
    .where(eq(schema.revenueEvents.contentItemId, contentItemId));

  // Visninger telles fra SISTE måling per kanal, ikke summen av tidsserien.
  // Summerer vi serien, telles de samme visningene på nytt for hver måling,
  // og RPM kollapser mot null etter noen dager med målinger.
  const metrics = await db
    .select({
      channel: schema.contentMetrics.channel,
      views: schema.contentMetrics.views,
      measuredAt: schema.contentMetrics.measuredAt,
    })
    .from(schema.contentMetrics)
    .where(eq(schema.contentMetrics.contentItemId, contentItemId))
    .orderBy(desc(schema.contentMetrics.measuredAt));

  const views = latestViewsPerChannel(metrics);

  const economics = computeEconomics({
    costsNok: costs.map((c) => c.amountNok),
    revenuesNok: revenues.map((r) => r.amountNok),
    views,
  });

  await db
    .insert(schema.contentEconomics)
    .values({
      contentItemId,
      totalCostNok: toMoneyString(economics.totalCostNok),
      totalRevenueNok: toMoneyString(economics.totalRevenueNok),
      views: economics.views,
      rpmNok: economics.rpmNok ? toMoneyString(economics.rpmNok) : null,
      marginNok: toMoneyString(economics.marginNok),
      marginPct: economics.marginPct ? economics.marginPct.toFixed(6) : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.contentEconomics.contentItemId,
      set: {
        totalCostNok: toMoneyString(economics.totalCostNok),
        totalRevenueNok: toMoneyString(economics.totalRevenueNok),
        views: economics.views,
        rpmNok: economics.rpmNok ? toMoneyString(economics.rpmNok) : null,
        marginNok: toMoneyString(economics.marginNok),
        marginPct: economics.marginPct ? economics.marginPct.toFixed(6) : null,
        updatedAt: new Date(),
      },
    });

  return economics;
}

/**
 * Fordeler en kanals periodeinntekt på innleggene i perioden, etter visninger.
 *
 * Brukes når plattformen ikke oppgir inntekt per video. Resten som ikke lar
 * seg attribuere (fordi ingen innlegg har visninger) føres som én
 * kanalhendelse uten `content_item_id`, slik at kronene ikke forsvinner ut
 * av regnskapet.
 */
export async function distributeChannelRevenue(
  db: Database,
  params: {
    channel: Channel;
    amountNok: Decimal.Value;
    currency: string;
    fxRate: Decimal.Value;
    source: string;
    contentItemIds: string[];
    occurredAt?: Date;
  },
): Promise<{ allocated: number; residualNok: string }> {
  const metrics =
    params.contentItemIds.length === 0
      ? []
      : await db
          .select({
            contentItemId: schema.contentMetrics.contentItemId,
            views: schema.contentMetrics.views,
            measuredAt: schema.contentMetrics.measuredAt,
          })
          .from(schema.contentMetrics)
          .where(
            and(
              eq(schema.contentMetrics.channel, params.channel),
              inArray(schema.contentMetrics.contentItemId, params.contentItemIds),
            ),
          )
          .orderBy(desc(schema.contentMetrics.measuredAt));

  // Siste måling per innlegg vinner, av samme grunn som over.
  const viewsById = new Map<string, number>();
  for (const row of metrics) {
    if (!viewsById.has(row.contentItemId)) viewsById.set(row.contentItemId, Number(row.views ?? 0));
  }

  const items = params.contentItemIds.map((id) => ({
    contentItemId: id,
    views: viewsById.get(id) ?? 0,
  }));

  const { allocations, residualNok } = proRataAllocate(params.amountNok, items);
  const inverseFx = new Decimal(1).div(new Decimal(params.fxRate));

  for (const allocation of allocations) {
    if (allocation.amountNok.isZero()) continue;
    await recordRevenue(db, {
      contentItemId: allocation.contentItemId,
      channel: params.channel,
      type: "ad",
      amount: allocation.amountNok.times(inverseFx),
      currency: params.currency,
      fxRate: params.fxRate,
      source: params.source,
      attribution: "pro_rata",
      ...(params.occurredAt ? { occurredAt: params.occurredAt } : {}),
    });
  }

  if (!residualNok.isZero()) {
    await recordRevenue(db, {
      contentItemId: null,
      channel: params.channel,
      type: "ad",
      amount: residualNok.times(inverseFx),
      currency: params.currency,
      fxRate: params.fxRate,
      source: `${params.source} (uattribuert rest)`,
      attribution: "pro_rata",
      ...(params.occurredAt ? { occurredAt: params.occurredAt } : {}),
    });
  }

  return {
    allocated: allocations.filter((a) => !a.amountNok.isZero()).length,
    residualNok: toMoneyString(residualNok),
  };
}

// ---------------------------------------------------------------------------
// Kill switch og budsjett
// ---------------------------------------------------------------------------

export async function isSystemEnabled(db: Database): Promise<boolean> {
  const [flag] = await db
    .select({ value: schema.systemFlags.value })
    .from(schema.systemFlags)
    .where(eq(schema.systemFlags.key, "SYSTEM_ENABLED"));
  // Mangler flagget, er systemet av. Et system som publiserer autonomt skal
  // ikke tolke fravær av konfigurasjon som samtykke.
  return flag?.value ?? false;
}

export async function isChannelEnabled(db: Database, channel: Channel): Promise<boolean> {
  const [flag] = await db
    .select({ value: schema.systemFlags.value })
    .from(schema.systemFlags)
    .where(eq(schema.systemFlags.key, `CHANNEL_ENABLED:${channel}`));
  return flag?.value ?? false;
}

export async function setFlag(
  db: Database,
  key: string,
  value: boolean,
  changedBy: string,
): Promise<void> {
  await db
    .insert(schema.systemFlags)
    .values({ key, value, changedBy })
    .onConflictDoUpdate({
      target: schema.systemFlags.key,
      set: { value, changedBy, changedAt: new Date() },
    });
}

/** Forbruk i en periode. Felleskostnader (uten content_item_id) telles med. */
export async function spentInPeriod(db: Database, from: Date, to: Date): Promise<Decimal> {
  const [row] = await db
    .select({ total: raw<string>`coalesce(sum(${schema.costEvents.amountNok}), 0)::text` })
    .from(schema.costEvents)
    .where(and(gte(schema.costEvents.occurredAt, from), lt(schema.costEvents.occurredAt, to)));
  return new Decimal(row?.total ?? "0");
}

/**
 * Siste måling per kanal, summert.
 *
 * Forventer rader sortert med nyeste først. Skilt ut som egen funksjon fordi
 * regelen (siste måling vinner, ikke summen) er lett å bryte ved et uhell og
 * feilen er stille - RPM blir bare gradvis feil.
 */
function latestViewsPerChannel(
  rows: { channel: string; views: number | null }[],
): number {
  const seen = new Set<string>();
  let total = 0;
  for (const row of rows) {
    if (seen.has(row.channel)) continue;
    seen.add(row.channel);
    total += Number(row.views ?? 0);
  }
  return total;
}

/** Innlegg som venter på eiers godkjenning. Dashboardets køvisning. */
export async function itemsAwaitingApproval(db: Database) {
  return db
    .select()
    .from(schema.contentItems)
    .where(eq(schema.contentItems.state, "awaiting_approval"))
    .orderBy(schema.contentItems.createdAt);
}

/** Innlegg som har stoppet opp: blokkert, feilet eller venter på gjennomgang. */
export async function stuckItems(db: Database) {
  return db
    .select()
    .from(schema.contentItems)
    .where(
      or(
        eq(schema.contentItems.state, "blocked"),
        eq(schema.contentItems.state, "failed"),
        eq(schema.contentItems.state, "needs_review"),
      ),
    );
}

/** Kanalinntekt som ikke er attribuert til et innlegg. */
export async function unattributedRevenue(db: Database, channel: Channel) {
  return db
    .select()
    .from(schema.revenueEvents)
    .where(and(eq(schema.revenueEvents.channel, channel), isNull(schema.revenueEvents.contentItemId)));
}
