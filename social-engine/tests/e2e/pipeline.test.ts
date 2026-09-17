import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  measure,
  mockMetrics,
  publish,
  reject,
  runPipeline,
  settle,
  approve,
} from "@se/agents";
import {
  distributeChannelRevenue,
  recordRevenue,
  schema,
  transitionState,
  type Database,
} from "@se/db";
import {
  FX_RATE,
  linkedinBrief,
  setupDatabase,
  shortVideoBrief,
  testContext,
  truncateAll,
} from "./helpers.js";

/**
 * Ende-til-ende mot ekte Postgres.
 *
 * Målet er ikke å teste agentene (de er mocks i Fase 1), men å bevise at
 * tilstandsflyten, kostnadsføringen og marginberegningen henger sammen fra
 * `planned` til `settled`.
 */

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  const conn = await setupDatabase();
  db = conn.db;
  close = conn.close;
});

afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await truncateAll(db);
});

describe("dry-run-pipelinen", () => {
  it("kjører en YouTube Short fram til godkjenning og fører kostnad underveis", async () => {
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief());

    // YouTube står på manuell publisering, så innlegget skal vente på eier.
    expect(result.finalState).toBe("awaiting_approval");
    expect(Number(result.totalCostNok)).toBeGreaterThan(0);

    const costs = await db
      .select()
      .from(schema.costEvents)
      .where(eq(schema.costEvents.contentItemId, result.contentItemId));

    // Fire agenter fører tokens; Visual fører i tillegg video og voiceover.
    const byType = new Set(costs.map((c) => c.type));
    expect(byType.has("tokens")).toBe(true);
    expect(byType.has("media_video")).toBe(true);
    expect(byType.has("tts")).toBe(true);

    // Kostnaden skal ligge i nærheten av scenario B i UNIT_ECONOMICS.md:
    // ~15,60 NOK for en kortvideo. Vid margin, for prisene endrer seg.
    expect(Number(result.totalCostNok)).toBeGreaterThan(8);
    expect(Number(result.totalCostNok)).toBeLessThan(30);
  });

  it("logger hver eneste tilstandsovergang med agent og begrunnelse", async () => {
    const ctx = testContext(db);
    const { contentItemId } = await runPipeline(ctx, shortVideoBrief());

    const transitions = await db
      .select()
      .from(schema.stateTransitions)
      .where(eq(schema.stateTransitions.contentItemId, contentItemId))
      .orderBy(schema.stateTransitions.createdAt);

    expect(transitions.map((t) => t.toState)).toEqual([
      "researched",
      "drafted",
      "visual_ready",
      "qa_passed",
      "awaiting_approval",
    ]);
    // Ingen overgang uten begrunnelse. Revisjonsloggen skal kunne leses.
    expect(transitions.every((t) => t.reasoning.length > 0)).toBe(true);
  });

  it("skriver innlegget på norsk til LinkedIn og engelsk til YouTube", async () => {
    const ctx = testContext(db);

    const no = await runPipeline(ctx, linkedinBrief());
    const en = await runPipeline(ctx, shortVideoBrief());

    const [noItem] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, no.contentItemId));
    const [enItem] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, en.contentItemId));

    expect(noItem!.language).toBe("no");
    expect(enItem!.language).toBe("en");
    expect(no.finalState).toBe("awaiting_approval");
  });

  it("blokkerer et innlegg der språket ikke matcher kanalen", async () => {
    const ctx = testContext(db);
    // Engelsk brief mot LinkedIn: Quality skal fange det.
    const result = await runPipeline(ctx, linkedinBrief({ language: "en" }));

    expect(result.finalState).toBe("blocked");
    expect(result.stoppedReason).toMatch(/language_native/);
  });

  it("blokkerer et tema som ikke står som allowed", async () => {
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief({ theme: "recruitment_craft" }));

    expect(result.finalState).toBe("blocked");
    expect(result.stoppedReason).toMatch(/theme_allowed/);
  });

  it("stopper før første krone når budsjettet er sprengt", async () => {
    const ctx = testContext(db);

    // Fyll opp dagsbudsjettet (70 NOK) med en felleskostnad.
    await db.insert(schema.costEvents).values({
      contentItemId: null,
      agent: "cost_controller",
      type: "infra",
      quantity: "1",
      unitPriceUsd: "8.00000000",
      amountUsd: "8.0000",
      fxRate: FX_RATE,
      amountNok: "74.4000",
    });

    const result = await runPipeline(ctx, shortVideoBrief());
    expect(result.finalState).toBe("blocked");
    expect(result.stoppedReason).toMatch(/Budsjettstopp/);

    // Ingen agentkostnad skal ha påløpt etter stoppen.
    const costs = await db
      .select()
      .from(schema.costEvents)
      .where(eq(schema.costEvents.contentItemId, result.contentItemId));
    expect(costs).toHaveLength(0);
  });

  it("blokkerer når mediegenerering ville sprengt kostnadstaket i briefen", async () => {
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief({ costCapNok: "1.0000" }));

    expect(result.finalState).toBe("blocked");
    expect(result.stoppedReason).toMatch(/kostnadstaket/);
  });
});

describe("godkjenningsgaten", () => {
  it("lar eier godkjenne og publisere", async () => {
    const ctx = testContext(db);
    const { contentItemId } = await runPipeline(ctx, shortVideoBrief());

    await approve(ctx, contentItemId, "Ser bra ut.");
    const published = await publish(ctx, contentItemId, shortVideoBrief());

    expect(published.alreadyPublished).toBe(false);
    expect(published.externalPostId).toMatch(/^dryrun:/);

    const [item] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, contentItemId));
    expect(item!.state).toBe("published");
    expect(item!.dryRun).toBe(true);
  });

  it("publiserer aldri to ganger på samme innlegg", async () => {
    const ctx = testContext(db);
    const { contentItemId } = await runPipeline(ctx, shortVideoBrief());
    await approve(ctx, contentItemId, "ok");

    const first = await publish(ctx, contentItemId, shortVideoBrief());
    const second = await publish(ctx, contentItemId, shortVideoBrief());

    expect(second.alreadyPublished).toBe(true);
    expect(second.externalPostId).toBe(first.externalPostId);
  });

  it("lagrer eiers avvisning som treningsdata", async () => {
    const ctx = testContext(db);
    const { contentItemId } = await runPipeline(ctx, shortVideoBrief());

    await reject(ctx, contentItemId, "Kroken er for generisk, dette har vi sagt før.");

    const reviews = await db
      .select()
      .from(schema.qaReviews)
      .where(eq(schema.qaReviews.contentItemId, contentItemId));

    const ownerReview = reviews.find((r) => r.verdict === "owner_rejected");
    expect(ownerReview?.reasoning).toMatch(/generisk/);

    const [item] = await db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, contentItemId));
    expect(item!.state).toBe("cancelled");
  });
});

describe("økonomiflyten til settled", () => {
  async function publishedItem() {
    const ctx = testContext(db);
    const { contentItemId, totalCostNok } = await runPipeline(ctx, shortVideoBrief());
    await approve(ctx, contentItemId, "ok");
    await publish(ctx, contentItemId, shortVideoBrief());
    return { ctx, contentItemId, totalCostNok };
  }

  it("nekter settled uten registrert inntekt", async () => {
    const { ctx, contentItemId } = await publishedItem();
    await measure(ctx, contentItemId, "youtube", mockMetrics(40_000));

    // Kostnad finnes, inntekt gjør ikke. `settled` betyr ferdig
    // regnskapsført, ikke ferdig publisert.
    await expect(settle(ctx, contentItemId)).rejects.toThrow(/uten registrert inntekt/);
  });

  it("går til settled når både kostnad og inntekt er ført", async () => {
    const { ctx, contentItemId, totalCostNok } = await publishedItem();
    await measure(ctx, contentItemId, "youtube", mockMetrics(40_000));

    await recordRevenue(db, {
      contentItemId,
      channel: "youtube",
      type: "ad",
      amount: "2.15",
      currency: "USD",
      fxRate: FX_RATE,
      source: "youtube_analytics_api",
      attribution: "direct",
    });

    const economics = await settle(ctx, contentItemId);

    // 2,15 USD x 9,30 = 19,995 NOK
    expect(economics.totalRevenueNok.toFixed(4)).toBe("19.9950");
    expect(economics.views).toBe(40_000);
    expect(economics.rpmNok).not.toBeNull();
    expect(economics.marginNok.toFixed(4)).toBe(
      economics.totalRevenueNok.minus(economics.totalCostNok).toFixed(4),
    );
    // Innlegget gikk i pluss: inntekten overstiger scenario B-kostnaden.
    expect(Number(totalCostNok)).toBeLessThan(Number(economics.totalRevenueNok.toFixed(4)));

    const [row] = await db
      .select()
      .from(schema.contentEconomics)
      .where(eq(schema.contentEconomics.contentItemId, contentItemId));
    expect(row!.settledAt).not.toBeNull();
  });

  it("lar sen inntekt åpne et oppgjort innlegg på nytt", async () => {
    const { ctx, contentItemId } = await publishedItem();
    await measure(ctx, contentItemId, "youtube", mockMetrics(10_000));
    await recordRevenue(db, {
      contentItemId,
      channel: "youtube",
      type: "ad",
      amount: "1.00",
      currency: "USD",
      fxRate: FX_RATE,
      source: "youtube_analytics_api",
      attribution: "direct",
    });
    const first = await settle(ctx, contentItemId);

    // Plattformen rapporterer etterslep: mer inntekt og flere visninger.
    await transitionState(db, contentItemId, "measured", "revenue", "Sen inntektsrapport mottatt.");
    await db.insert(schema.contentMetrics).values({
      contentItemId,
      channel: "youtube",
      ...mockMetrics(25_000),
    });
    await recordRevenue(db, {
      contentItemId,
      channel: "youtube",
      type: "ad",
      amount: "0.80",
      currency: "USD",
      fxRate: FX_RATE,
      source: "youtube_analytics_api",
      attribution: "direct",
    });

    const second = await settle(ctx, contentItemId);
    expect(second.totalRevenueNok.gt(first.totalRevenueNok)).toBe(true);
    // Visninger telles fra siste måling per kanal, ikke summen av serien.
    expect(second.views).toBe(25_000);
  });

  it("måler coachinghenvendelser fra LinkedIn som inntekt", async () => {
    const ctx = testContext(db);
    const { contentItemId } = await runPipeline(ctx, linkedinBrief());
    await approve(ctx, contentItemId, "ok");
    await publish(ctx, contentItemId, linkedinBrief());
    await measure(ctx, contentItemId, "linkedin", mockMetrics(2_400));

    // En solgt 10-pakke, attribuert til innlegget som utløste henvendelsen.
    await recordRevenue(db, {
      contentItemId,
      channel: "linkedin",
      type: "lead",
      amount: "12140",
      currency: "NOK",
      fxRate: "1.0000",
      source: "manual",
      attribution: "direct",
    });

    const economics = await settle(ctx, contentItemId);

    // Uten `lead`-typen ville Portfolio-agenten sett LinkedIn som en
    // nullinntektskanal og kuttet den. Dette er testen som hindrer det.
    expect(economics.totalRevenueNok.toFixed(2)).toBe("12140.00");
    expect(economics.marginNok.gt(0)).toBe(true);
    // Én 10-pakke dekker hele årsbudsjettet på 2 000 NOK/mnd med god margin.
    expect(economics.marginNok.gt(12_000)).toBe(true);
  });
});

describe("pro rata-fordeling av kanalinntekt", () => {
  it("fordeler etter visninger og mister ikke kroner", async () => {
    const ctx = testContext(db);
    const ids: string[] = [];

    for (const views of [6_000, 3_000, 1_000]) {
      const { contentItemId } = await runPipeline(ctx, shortVideoBrief());
      await approve(ctx, contentItemId, "ok");
      await publish(ctx, contentItemId, shortVideoBrief());
      await measure(ctx, contentItemId, "youtube", mockMetrics(views));
      ids.push(contentItemId);
    }

    const { allocated, residualNok } = await distributeChannelRevenue(db, {
      channel: "youtube",
      amountNok: "100.0000",
      currency: "NOK",
      fxRate: "1.0000",
      source: "youtube_analytics_api (periode)",
      contentItemIds: ids,
    });

    expect(allocated).toBe(3);
    expect(residualNok).toBe("0.0000");

    const rows = await db
      .select()
      .from(schema.revenueEvents)
      .where(eq(schema.revenueEvents.attribution, "pro_rata"));

    const total = rows.reduce((acc, r) => acc + Number(r.amountNok), 0);
    expect(total).toBeCloseTo(100, 4);
  });

  it("fører uattribuerbar inntekt som kanalinntekt i stedet for å dele likt", async () => {
    const ctx = testContext(db);
    const { contentItemId } = await runPipeline(ctx, shortVideoBrief());
    await approve(ctx, contentItemId, "ok");
    await publish(ctx, contentItemId, shortVideoBrief());
    await measure(ctx, contentItemId, "youtube", mockMetrics(0));

    const { allocated, residualNok } = await distributeChannelRevenue(db, {
      channel: "youtube",
      amountNok: "42.0000",
      currency: "NOK",
      fxRate: "1.0000",
      source: "youtube_analytics_api (periode)",
      contentItemIds: [contentItemId],
    });

    expect(allocated).toBe(0);
    expect(residualNok).toBe("42.0000");

    // Kronene skal finnes i regnskapet, bare uten kobling til et innlegg.
    const [orphan] = await db
      .select()
      .from(schema.revenueEvents)
      .where(eq(schema.revenueEvents.channel, "youtube"));
    expect(orphan!.contentItemId).toBeNull();
    expect(orphan!.amountNok).toBe("42.0000");
  });
});
