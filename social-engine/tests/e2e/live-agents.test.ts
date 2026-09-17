import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import {
  FakeClaudeClient,
  liveAgentSet,
  runPipeline,
  type MediaProvider,
  type PromptPaths,
} from "@se/agents";
import { schema, type Database } from "@se/db";
import { setupDatabase, shortVideoBrief, testContext, truncateAll } from "./helpers.js";

/**
 * Hele pipelinen med det EKTE agentsettet, men falsk Claude-klient.
 *
 * Dette er testen som beviser at Fase 2 faktisk er koblet på: promptene
 * lastes, skjemaene validerer, kostnaden føres per modellkall, og
 * tilstandsmaskinen kommer fram til godkjenningskøen. Ingen API-kall, null
 * kroner brukt.
 */

let db: Database;
let close: () => Promise<void>;

const paths: PromptPaths = {
  promptsDir: join(process.cwd(), "prompts"),
  configDir: join(process.cwd(), "config"),
};

const provider: MediaProvider = {
  generateVideo: async (_p, seconds) => `mock://clip-${seconds}s.mp4`,
  generateImage: async () => "mock://image.png",
  searchLibrary: async () => [],
};

const researchText = "Context stability beats motivation. Source: https://example.org/study (Example Journal)";

const responses = (): { research: string[]; structured: Record<string, unknown>[] } => ({
  research: [researchText],
  structured: [
    // 1. Research-strukturering (Haiku)
    {
      sources: [
        {
          claim: "Context stability beats motivation",
          url: "https://example.org/study",
          publisher: "Example Journal",
          retrievedAt: "2026-09-17T00:00:00Z",
        },
      ],
      newsHooks: [],
      unsourcedClaims: [],
    },
    // 2. Copywriter (Opus 5)
    {
      language: "en",
      variants: [
        {
          variant: 1,
          hook: 'My training note from yesterday was one word. "Heavy."',
          script: "I did the session anyway. Sixth in seven days.",
          caption: "Structure is the house. Motivation is a guest.",
          hashtags: ["mentaltraining"],
        },
        {
          variant: 2,
          hook: "How many sessions have you skipped waiting to feel ready?",
          script: "Most people think they have a motivation problem.",
          caption: "Decide in advance, while you are rested.",
          hashtags: ["performance"],
        },
      ],
    },
    // 3. Visual-plan (Sonnet 5)
    {
      reuseFromLibrary: false,
      reuseRationale: "Biblioteket er tomt.",
      clips: [
        { prompt: "A man walking at dawn. On-screen text in English.", seconds: 8, onScreenText: "Heavy." },
        { prompt: "An empty gym at night. On-screen text in English.", seconds: 8, onScreenText: "Sixth in seven days." },
      ],
      images: [],
      aspectRatio: "9:16",
      voiceoverSeconds: 30,
    },
    // 4. Quality (Sonnet 5)
    {
      verdict: "approved",
      checks: [
        { check: "facts_sourced", passed: true, reasoning: "Påstanden dekkes av kilden." },
        { check: "no_health_claims", passed: true, reasoning: "Holder seg på coaching-nivå." },
        { check: "gdpr", passed: true, reasoning: "Ingen navngitte personer." },
      ],
      reasoning: "Alle sjekker passert.",
    },
  ],
});

beforeAll(async () => {
  const conn = await setupDatabase();
  db = conn.db;
  close = conn.close;
});
afterAll(async () => close());
beforeEach(async () => truncateAll(db));

describe("pipelinen med ekte agenter", () => {
  it("går fra planned til awaiting_approval gjennom alle fire agentene", async () => {
    const claude = new FakeClaudeClient(responses());
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief(), liveAgentSet(claude, paths, provider));

    expect(result.finalState).toBe("awaiting_approval");

    // Fem modellkall: websøk, research-strukturering, copywriter, visual, quality.
    expect(claude.calls).toHaveLength(5);
    expect(claude.calls.map((c) => c.model)).toEqual([
      "claude-sonnet-5",  // websøk
      "claude-haiku-4-5", // strukturering
      "claude-opus-5",    // copywriter
      "claude-sonnet-5",  // visual-plan
      "claude-sonnet-5",  // quality
    ]);
  });

  it("fører én kostnadsrad per modellkall, med riktig modell på hver", async () => {
    const claude = new FakeClaudeClient(responses());
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief(), liveAgentSet(claude, paths, provider));

    const runs = await db
      .select()
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.contentItemId, result.contentItemId));

    // Research gjør to kall på to modeller. Slås de sammen, prises
    // Haiku-tokens som Sonnet-tokens.
    const researchRuns = runs.filter((r) => r.agent === "research");
    expect(researchRuns).toHaveLength(2);
    expect(researchRuns.map((r) => r.model).sort()).toEqual(["claude-haiku-4-5", "claude-sonnet-5"]);

    const copyRun = runs.find((r) => r.agent === "copywriter");
    expect(copyRun?.model).toBe("claude-opus-5");
    expect(copyRun?.cachedTokens).toBeGreaterThan(0);

    const costs = await db
      .select()
      .from(schema.costEvents)
      .where(eq(schema.costEvents.contentItemId, result.contentItemId));
    const types = costs.map((c) => c.type);
    expect(types.filter((t) => t === "tokens")).toHaveLength(5);
    expect(types).toContain("media_video");
    expect(types).toContain("tts");
  });

  it("lagrer kildene Research fant, med URL og utgiver", async () => {
    const claude = new FakeClaudeClient(responses());
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief(), liveAgentSet(claude, paths, provider));

    const sources = await db
      .select()
      .from(schema.researchSources)
      .where(eq(schema.researchSources.contentItemId, result.contentItemId));

    expect(sources).toHaveLength(1);
    expect(sources[0]!.url).toBe("https://example.org/study");
    expect(sources[0]!.publisher).toBe("Example Journal");
  });

  it("stopper på needs_review når Research mangler kilde", async () => {
    const withoutSource = responses();
    withoutSource.structured[0] = { sources: [], newsHooks: [], unsourcedClaims: ["Ubelagt påstand"] };

    const claude = new FakeClaudeClient(withoutSource);
    const ctx = testContext(db);
    const result = await runPipeline(ctx, shortVideoBrief(), liveAgentSet(claude, paths, provider));

    expect(result.finalState).toBe("needs_review");
    expect(result.stoppedReason).toMatch(/uten kilde/);
    // Copywriter skal ikke ha kjørt. Å skrive på et ubelagt grunnlag er å
    // betale for noe som uansett skal blokkeres.
    expect(claude.calls).toHaveLength(2);
  });

  it("blokkerer uten å bruke et modellkall når Quality feiler mekanisk", async () => {
    const claude = new FakeClaudeClient(responses());
    const ctx = testContext(db);
    // Engelsk brief mot LinkedIn: kanalen publiserer på norsk.
    const result = await runPipeline(
      ctx,
      shortVideoBrief({ channel: "linkedin", format: "text_post" }),
      liveAgentSet(claude, paths, provider),
    );

    expect(result.finalState).toBe("blocked");
    expect(result.stoppedReason).toMatch(/language_native/);
    // Fire kall, ikke fem: Quality brukte ingen tokens på å bekrefte en
    // strukturell feil koden allerede hadde slått fast.
    expect(claude.calls).toHaveLength(4);
  });

  it("stopper før generering når visual-planen sprenger kostnadstaket", async () => {
    const expensive = responses();
    expensive.structured[2] = {
      reuseFromLibrary: false,
      reuseRationale: "Trenger ny film.",
      clips: Array.from({ length: 8 }, (_, i) => ({
        prompt: `Scene ${i}. On-screen text in English.`,
        seconds: 20,
        onScreenText: "x",
      })),
      images: [],
      aspectRatio: "9:16",
      voiceoverSeconds: 120,
    };

    let generated = 0;
    const countingProvider: MediaProvider = {
      ...provider,
      generateVideo: async () => {
        generated++;
        return "mock://x.mp4";
      },
    };

    const claude = new FakeClaudeClient(expensive);
    const ctx = testContext(db);
    const result = await runPipeline(
      ctx,
      shortVideoBrief({ costCapNok: "5.0000" }),
      liveAgentSet(claude, paths, countingProvider),
    );

    expect(result.finalState).toBe("blocked");
    expect(result.stoppedReason).toMatch(/over taket/);
    expect(generated).toBe(0);
  });

  it("gir Copywriter eiers tidligere avvisninger som læring", async () => {
    await db.insert(schema.learnings).values({
      scope: "hook",
      insight: "Eier avviste: kroker som åpner med et spørsmål presterer dårligere enn en påstand.",
      evidence: { rejections: 4 },
      active: true,
    });

    const claude = new FakeClaudeClient(responses());
    const ctx = testContext(db);
    await runPipeline(ctx, shortVideoBrief(), liveAgentSet(claude, paths, provider));

    const copywriterCall = claude.calls[2]!;
    expect(copywriterCall.model).toBe("claude-opus-5");
    expect(copywriterCall.user).toContain("presterer dårligere enn en påstand");
  });
});
