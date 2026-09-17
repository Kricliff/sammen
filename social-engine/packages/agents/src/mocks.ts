import Decimal from "decimal.js";
import {
  copyOutputSchema,
  qaVerdictSchema,
  researchOutputSchema,
  visualOutputSchema,
  type CopyOutput,
  type PublishResult,
  type QaVerdict,
  type ResearchOutput,
  type VisualOutput,
} from "@se/core";
import { imageCostUsd, ttsCostUsd, videoCostUsd } from "@se/economics";
import type { AgentContext, AgentResult, AgentRunInput } from "./types.js";

/**
 * Mock-agenter for Fase 1.
 *
 * De gjør ingen modellkall, men rapporterer **realistisk** tokenforbruk hentet
 * fra scenario B i UNIT_ECONOMICS.md 2.2. Grunnen er at dry-run skal vise hva
 * en kjøring faktisk ville kostet, ikke null. Et dry-run som rapporterer null
 * kostnad ville vært verdiløst som beslutningsgrunnlag.
 *
 * I Fase 2 byttes disse ut med ekte Claude-kall bak samme grensesnitt.
 */

export async function mockResearch(
  _ctx: AgentContext,
  input: AgentRunInput,
): Promise<AgentResult<ResearchOutput>> {
  const output = researchOutputSchema.parse({
    sources: [
      {
        claim: `Underlag for temaet «${input.brief.theme}»`,
        url: "https://example.org/mock-source",
        publisher: "Mock Publisher",
        retrievedAt: new Date(),
      },
    ],
    newsHooks: ["mock news hook"],
    unsourcedClaims: [],
  });

  return {
    output,
    usages: [{ model: "claude-sonnet-5", inputTokens: 25_000, outputTokens: 2_000 }],
  };
}

export async function mockCopywriter(
  _ctx: AgentContext,
  input: AgentRunInput,
): Promise<AgentResult<CopyOutput>> {
  const isEnglish = input.brief.language === "en";

  // Teksten skrives på kanalens språk fra start. Aldri skrevet på ett språk
  // og oversatt - se ARCHITECTURE.md 9.4.
  const variant = (n: 1 | 2) =>
    isEnglish
      ? {
          variant: n,
          hook: `You keep starting over. Variant ${n}.`,
          script: `Mock English script for ${input.brief.theme}, variant ${n}.`,
          caption: `Mock English caption, variant ${n}.`,
          hashtags: ["mentaltraining", "performance"],
        }
      : {
          variant: n,
          hook: `Du begynner på nytt igjen. Variant ${n}.`,
          script: `Mock norsk manus for ${input.brief.theme}, variant ${n}.`,
          caption: `Mock norsk brødtekst, variant ${n}.`,
          hashtags: ["mentaltrening", "ledelse"],
        };

  const output = copyOutputSchema.parse({
    language: input.brief.language,
    variants: [variant(1), variant(2)],
  });

  // Copywriter blir på Opus 5 selv i det billige scenarioet. Det er der
  // morsmålskvaliteten avgjøres, og det er ikke stedet å spare.
  return {
    output,
    usages: [{
      model: "claude-opus-5",
      inputTokens: 12_000,
      outputTokens: 3_000,
      cachedTokens: 8_000, // voice-fila er identisk for hvert innlegg
    }],
  };
}

export async function mockVisual(
  ctx: AgentContext,
  input: AgentRunInput,
): Promise<AgentResult<VisualOutput>> {
  const isVideo = input.brief.format === "short_video" || input.brief.format === "long_video";

  if (isVideo) {
    const clips = 4;
    const secondsPerClip = 8;
    const model = "veo-3.1-lite-720p";
    const videoUsd = videoCostUsd(model, clips * secondsPerClip);
    const ttsUsd = ttsCostUsd(30);

    const output = visualOutputSchema.parse({
      mediaUrls: Array.from({ length: clips }, (_, i) => `mock://clip-${i + 1}.mp4`),
      reusedFromLibrary: false,
      aspectRatio: "9:16",
      estimatedCostNok: videoUsd.plus(ttsUsd).times(new Decimal(ctx.fxRate)).toFixed(4),
    });

    return {
      output,
      usages: [{ model: "claude-sonnet-5", inputTokens: 6_000, outputTokens: 1_000 }],
      extraCostsUsd: [
        {
          type: "media_video",
          quantity: clips * secondsPerClip,
          unitPriceUsd: videoUsd.div(clips * secondsPerClip).toFixed(8),
        },
        { type: "tts", quantity: 30, unitPriceUsd: ttsUsd.div(30).toFixed(8) },
      ],
    };
  }

  const imageUsd = imageCostUsd("gemini-3.1-flash-image", 1);
  const output = visualOutputSchema.parse({
    mediaUrls: ["mock://image-1.png"],
    reusedFromLibrary: false,
    aspectRatio: "4:5",
    estimatedCostNok: imageUsd.times(new Decimal(ctx.fxRate)).toFixed(4),
  });

  return {
    output,
    usages: [{ model: "claude-sonnet-5", inputTokens: 3_000, outputTokens: 500 }],
    extraCostsUsd: [{ type: "media_image", quantity: 1, unitPriceUsd: imageUsd.toFixed(8) }],
  };
}

/**
 * Quality-agenten. Vetorett.
 *
 * Mock-versjonen kjører de sjekkene som faktisk kan avgjøres uten et
 * modellkall - språk mot kanalens innstilling, og tema mot allowed-lista.
 * De to er ikke pynt: de fanger de to feilene som er lettest å gjøre og
 * dyrest å oppdage etter publisering.
 */
export async function mockQuality(
  ctx: AgentContext,
  input: AgentRunInput,
  copy: CopyOutput,
): Promise<AgentResult<QaVerdict>> {
  const checks: { check: string; passed: boolean; reasoning: string }[] = [];

  const channelConfig = ctx.config.channels.channels[input.brief.channel];
  const expectedLanguage = channelConfig?.language;
  const languageOk = copy.language === expectedLanguage;
  checks.push({
    check: "language_native",
    passed: languageOk,
    reasoning: languageOk
      ? `Teksten er på ${copy.language}, som er kanalens språk.`
      : `Teksten er på ${copy.language}, men ${input.brief.channel} publiserer på ${expectedLanguage}.`,
  });

  const theme = ctx.config.strategy.themes.find((t) => t.name === input.brief.theme);
  const themeOk = theme?.status === "allowed";
  checks.push({
    check: "theme_allowed",
    passed: themeOk,
    reasoning: themeOk
      ? `Temaet «${input.brief.theme}» står som allowed i strategy.yaml.`
      : `Temaet «${input.brief.theme}» er ikke tillatt: ${theme?.reason ?? "finnes ikke i strategy.yaml"}`,
  });

  for (const check of [
    "facts_sourced",
    "brand_tone",
    "gdpr",
    "no_health_claims",
    "monetization_safe",
    "ad_disclosure",
    "plagiarism",
    "channel_rules",
  ] as const) {
    checks.push({ check, passed: true, reasoning: "Mock: ikke vurdert i Fase 1." });
  }

  const failed = checks.filter((c) => !c.passed);
  const verdict = qaVerdictSchema.parse({
    // Feil språk eller blokkert tema er ikke noe som rettes i en revisjonsrunde.
    // Det er en feil i briefen, og den skal stoppe innlegget.
    verdict: failed.length === 0 ? "approved" : "blocked",
    checks,
    reasoning:
      failed.length === 0
        ? "Alle sjekker passert."
        : `Blokkert av ${failed.length} sjekk(er): ${failed.map((f) => f.check).join(", ")}`,
  });

  return {
    output: verdict,
    usages: [{ model: "claude-sonnet-5", inputTokens: 15_000, outputTokens: 1_500 }],
  };
}

/**
 * Publisher. I dry-run rører den aldri et plattform-API.
 *
 * `idempotencyKey` er nøkkelen som hindrer dobbeltposting: andre forsøk med
 * samme nøkkel skal returnere eksisterende post-ID, ikke publisere på nytt.
 */
export async function mockPublish(
  ctx: AgentContext,
  input: AgentRunInput & { idempotencyKey: string },
): Promise<PublishResult> {
  if (ctx.dryRun) {
    return {
      externalPostId: `dryrun:${input.idempotencyKey}`,
      publishedAt: new Date(),
      dryRun: true,
    };
  }
  throw new Error(
    "Ekte publisering er ikke implementert i Fase 1. " +
      "Publisher-adapterne kommer i Fase 3, én kanal om gangen.",
  );
}

/** Måling. Mock-tall så økonomiflyten kan testes ende til ende. */
export function mockMetrics(views: number) {
  return {
    views,
    engagedViews: Math.floor(views * 0.72),
    watchTimeSeconds: Math.floor(views * 11),
    retentionPct: new Decimal(38.5).toFixed(2),
    likes: Math.floor(views * 0.02),
    comments: Math.floor(views * 0.003),
    shares: Math.floor(views * 0.001),
    follows: Math.floor(views * 0.0008),
  };
}
