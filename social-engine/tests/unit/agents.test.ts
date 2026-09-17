import { beforeEach, describe, expect, it } from "vitest";
import { join } from "node:path";
import { loadConfig, type Brief, type CopyOutput, type ResearchOutput } from "@se/core";
import {
  clearPromptCache,
  CostCapExceeded,
  deterministicChecks,
  FakeClaudeClient,
  priceplan,
  runCopywriter,
  runQuality,
  runResearch,
  runStrategist,
  runVisual,
  type MediaProvider,
  type PromptPaths,
} from "@se/agents";

/**
 * Agenttester med faste testinput.
 *
 * Ingen av dem treffer API-et. FakeClaudeClient validerer testsvarene mot de
 * ekte Zod-skjemaene, så en test kan ikke lykkes med data den ekte agenten
 * ville avvist - men den koster ingenting å kjøre.
 */

const paths: PromptPaths = {
  promptsDir: join(process.cwd(), "prompts"),
  configDir: join(process.cwd(), "config"),
};
const config = loadConfig(paths.configDir);

beforeEach(() => clearPromptCache());

const shortBrief = (over: Partial<Brief> = {}): Brief => ({
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
});

const research: ResearchOutput = {
  sources: [
    {
      claim: "Habit formation depends more on context stability than on motivation",
      url: "https://example.org/study",
      publisher: "Example Journal",
      retrievedAt: new Date("2026-09-17T00:00:00Z"),
    },
  ],
  newsHooks: [],
  unsourcedClaims: [],
};

const englishCopy: CopyOutput = {
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
      hook: "How many sessions have you skipped because you waited to feel ready?",
      script: "Most people think they have a motivation problem.",
      caption: "Decide in advance, while you are rested.",
      hashtags: ["performance"],
    },
  ],
};

describe("Strategist", () => {
  it("gir modellen blokkerte temaer og kapasitetstaket som kontekst", async () => {
    const claude = new FakeClaudeClient({
      structured: [
        { briefs: [shortBrief()], allocationNotes: "Første uke, fordelt etter konfigvekter." },
      ],
    });

    const result = await runStrategist(claude, paths, {
      weekStart: new Date("2026-09-21T00:00:00Z"),
      config,
      priorPerformance: [],
      thresholds: [{ channel: "youtube", metric: "shorts_views_90d", required: 10_000_000, current: 2_000_000 }],
      introCallsUsed: 0,
      postsThisWeek: 20,
    });

    expect(result.output.briefs).toHaveLength(1);
    const prompt = claude.calls[0]!.user;
    // Blokkerte temaer må være synlige for modellen, ellers kan den ikke unngå dem.
    expect(prompt).toContain("recruitment_craft");
    expect(prompt).toContain("never allocate");
    expect(prompt).toContain("20.0%"); // terskelfremdrift
    expect(prompt).toContain("4 left"); // kapasitet
  });

  it("sier tydelig fra når kapasitetstaket er nådd", async () => {
    const claude = new FakeClaudeClient({
      structured: [{ briefs: [shortBrief()], allocationNotes: "Taket nådd, vrir mot rekkevidde." }],
    });

    await runStrategist(claude, paths, {
      weekStart: new Date("2026-09-21T00:00:00Z"),
      config,
      priorPerformance: [],
      thresholds: [],
      introCallsUsed: config.strategy.capacity.maxIntroCallsPerMonth,
      postsThisWeek: 20,
    });

    expect(claude.calls[0]!.user).toContain("CEILING REACHED");
  });

  it("kjører på Opus 5 — strategi er ikke stedet å spare", async () => {
    const claude = new FakeClaudeClient({
      structured: [{ briefs: [shortBrief()], allocationNotes: "x" }],
    });
    await runStrategist(claude, paths, {
      weekStart: new Date(), config, priorPerformance: [], thresholds: [],
      introCallsUsed: 0, postsThisWeek: 5,
    });
    expect(claude.calls[0]!.model).toBe("claude-opus-5");
  });
});

describe("Research", () => {
  it("rapporterer de to modellkallene hver for seg", async () => {
    const claude = new FakeClaudeClient({
      research: ["Findings with a source: https://example.org/study (Example Journal)"],
      structured: [
        {
          sources: [
            {
              claim: "Context beats motivation",
              url: "https://example.org/study",
              publisher: "Example Journal",
              retrievedAt: "2026-09-17T00:00:00Z",
            },
          ],
          newsHooks: [],
          unsourcedClaims: [],
        },
      ],
    });

    const result = await runResearch(claude, paths, shortBrief());

    // Websøk på Sonnet, strukturering på Haiku. Slås de sammen, prises
    // Haiku-tokens som Sonnet-tokens og kostnadstallet blir for høyt.
    expect(result.usages).toHaveLength(2);
    expect(result.usages.map((u) => u.model)).toEqual(["claude-sonnet-5", "claude-haiku-4-5"]);
    expect(result.output.sources).toHaveLength(1);
  });

  it("returnerer ukildede påstander i stedet for å skjule dem", async () => {
    const claude = new FakeClaudeClient({
      research: ["I believe X but found no source."],
      structured: [{ sources: [], newsHooks: [], unsourcedClaims: ["I believe X"] }],
    });

    const result = await runResearch(claude, paths, shortBrief());
    expect(result.output.unsourcedClaims).toEqual(["I believe X"]);
  });
});

describe("Copywriter", () => {
  it("laster riktig voice-fil for språket og cacher den", async () => {
    const claude = new FakeClaudeClient({ structured: [englishCopy] });
    await runCopywriter(claude, paths, shortBrief(), research);

    const system = claude.calls[0]!.system;
    expect(system).toContain("Voice file (en)");
    // Den engelske fila skal aldri lastes for et norsk innlegg og omvendt.
    expect(system).not.toContain("Stemme — LinkedIn");
    expect(claude.calls[0]!.model).toBe("claude-opus-5");
  });

  it("laster den norske stemmen for LinkedIn", async () => {
    const norwegianCopy: CopyOutput = {
      language: "no",
      variants: [
        { variant: 1, hook: "Tungt.", script: "Økten ble gjennomført.", caption: "Struktur er huset.", hashtags: [] },
        { variant: 2, hook: "Hvor mange økter har du avlyst?", script: "De fleste tror de mangler motivasjon.", caption: "Bestem på forhånd.", hashtags: [] },
      ],
    };
    const claude = new FakeClaudeClient({ structured: [norwegianCopy] });
    await runCopywriter(claude, paths, shortBrief({ channel: "linkedin", language: "no", format: "text_post" }), research);

    expect(claude.calls[0]!.system).toContain("Stemme — LinkedIn");
  });

  it("gir modellen kildene, og sier fra når det ikke finnes noen", async () => {
    const claude = new FakeClaudeClient({ structured: [englishCopy] });
    await runCopywriter(claude, paths, shortBrief(), { sources: [], newsHooks: [], unsourcedClaims: [] });

    expect(claude.calls[0]!.user).toContain("do not introduce factual claims of your own");
  });

  it("sender eiers avvisninger videre som læring", async () => {
    const claude = new FakeClaudeClient({ structured: [englishCopy] });
    await runCopywriter(claude, paths, shortBrief(), research, [
      "Eier avviste: kroken var for generisk, dette er sagt før.",
    ]);

    expect(claude.calls[0]!.user).toContain("for generisk");
  });
});

describe("Quality", () => {
  const input = (over: Partial<Parameters<typeof deterministicChecks>[0]> = {}) => ({
    brief: shortBrief(),
    copy: englishCopy,
    research,
    config,
    recentPosts: [],
    ...over,
  });

  it("blokkerer feil språk uten å bruke et modellkall", async () => {
    const claude = new FakeClaudeClient({});
    const result = await runQuality(
      claude,
      paths,
      input({ brief: shortBrief({ channel: "linkedin", language: "no" }), copy: englishCopy }),
    );

    expect(result.output.verdict).toBe("blocked");
    expect(result.usages).toHaveLength(0);
    // Ingen kall skal ha gått ut. Å betale for å få bekreftet en
    // strukturell feil er bortkastet.
    expect(claude.calls).toHaveLength(0);
  });

  it("blokkerer et tema som ikke er allowed, uten modellkall", async () => {
    const claude = new FakeClaudeClient({});
    const result = await runQuality(claude, paths, input({ brief: shortBrief({ theme: "recruitment_craft" }) }));

    expect(result.output.verdict).toBe("blocked");
    expect(claude.calls).toHaveLength(0);
    expect(result.output.reasoning).toContain("theme_allowed");
  });

  it("blokkerer en caption over kanalens tegngrense", () => {
    const tooLong: CopyOutput = {
      language: "no",
      variants: [
        { variant: 1, hook: "h", script: "s", caption: "x".repeat(3100), hashtags: [] },
        { variant: 2, hook: "h", script: "s", caption: "kort", hashtags: [] },
      ],
    };
    const checks = deterministicChecks(
      input({ brief: shortBrief({ channel: "linkedin", language: "no" }), copy: tooLong }),
    );
    const rule = checks.find((c) => c.check === "channel_rules");
    expect(rule?.passed).toBe(false);
    expect(rule?.reasoning).toContain("3100");
  });

  it("legger de deterministiske sjekkene ved modellens vurdering", async () => {
    const claude = new FakeClaudeClient({
      structured: [
        {
          verdict: "approved",
          checks: [{ check: "gdpr", passed: true, reasoning: "Ingen navngitte personer." }],
          reasoning: "Alle sjekker passert.",
        },
      ],
    });

    const result = await runQuality(claude, paths, input());

    expect(result.output.verdict).toBe("approved");
    // qa_reviews skal vise hele bildet, ikke bare halvparten modellen så på.
    const names = result.output.checks.map((c) => c.check);
    expect(names).toContain("language_native");
    expect(names).toContain("theme_allowed");
    expect(names).toContain("gdpr");
  });

  it("forteller modellen at språket alt er verifisert mekanisk", async () => {
    const claude = new FakeClaudeClient({
      structured: [{ verdict: "approved", checks: [{ check: "gdpr", passed: true, reasoning: "ok" }], reasoning: "ok" }],
    });
    await runQuality(claude, paths, input());

    // Ellers bruker modellen tokens på å gjenta en sjekk koden alt har gjort.
    expect(claude.calls[0]!.user).toContain("already been verified mechanically");
  });
});

describe("Visual", () => {
  const provider = (over: Partial<MediaProvider> = {}): MediaProvider => ({
    generateVideo: async (_p, i) => `mock://video-${i}.mp4`,
    generateImage: async () => "mock://image.png",
    searchLibrary: async () => [],
    ...over,
  });

  const plan = (over: Record<string, unknown> = {}) => ({
    reuseFromLibrary: false,
    reuseRationale: "Biblioteket er tomt.",
    clips: [
      { prompt: "A man walking at dawn. English on-screen text.", seconds: 8, onScreenText: "Heavy." },
      { prompt: "Empty gym. English on-screen text.", seconds: 8, onScreenText: "Sixth in seven days." },
    ],
    images: [],
    aspectRatio: "9:16",
    voiceoverSeconds: 30,
    ...over,
  });

  it("priser planen før noe genereres", () => {
    // 16 sek video a $0,03 = $0,48, pluss 30 sek TTS a $0,0033 = $0,099
    expect(priceplan(plan() as never).toFixed(4)).toBe("0.5790");
  });

  it("stopper på kostnadstaket i stedet for å generere og håpe", async () => {
    const claude = new FakeClaudeClient({
      structured: [plan({ clips: Array.from({ length: 8 }, () => ({ prompt: "p", seconds: 20, onScreenText: "t" })) })],
    });

    let generated = 0;
    const p = provider({
      generateVideo: async () => {
        generated++;
        return "mock://x.mp4";
      },
    });

    await expect(
      runVisual(claude, paths, p, shortBrief({ costCapNok: "1.0000" }), englishCopy, "9.30"),
    ).rejects.toThrow(CostCapExceeded);

    // Den dyreste operasjonen i systemet skal aldri ha startet.
    expect(generated).toBe(0);
  });

  it("gjenbruker fra biblioteket og fører da ingen mediekostnad", async () => {
    const claude = new FakeClaudeClient({ structured: [plan({ reuseFromLibrary: true })] });
    const p = provider({ searchLibrary: async () => ["assets://dawn.mp4", "assets://gym.mp4"] });

    const result = await runVisual(claude, paths, p, shortBrief(), englishCopy, "9.30");

    expect(result.output.reusedFromLibrary).toBe(true);
    expect(result.output.estimatedCostNok).toBe("0.0000");
    expect(result.extraCostsUsd ?? []).toHaveLength(0);
  });

  it("fører video og voiceover som separate kostnadstyper", async () => {
    const claude = new FakeClaudeClient({ structured: [plan()] });
    const result = await runVisual(claude, paths, provider(), shortBrief(), englishCopy, "9.30");

    const types = (result.extraCostsUsd ?? []).map((c) => c.type);
    expect(types).toContain("media_video");
    expect(types).toContain("tts");
    expect(result.output.mediaUrls).toHaveLength(2);
  });

  it("sier eksplisitt hvilket språk tekst i bildet skal ha", async () => {
    const claude = new FakeClaudeClient({ structured: [plan()] });
    await runVisual(claude, paths, provider(), shortBrief(), englishCopy, "9.30");

    // Den enkleste måten å få norsk tekst inn i en engelsk video på er å
    // la være å fortelle bildemodellen hvilket språk innlegget er på.
    expect(claude.calls[0]!.user).toContain("ALL on-screen text must be in this language");
  });
});
