import {
  qaVerdictSchema,
  type AppConfig,
  type Brief,
  type CopyOutput,
  type QaCheck,
  type QaVerdict,
  type ResearchOutput,
  type VisualOutput,
} from "@se/core";
import type { ClaudeClient } from "../claude.js";
import { loadSystemPrompt, loadVoice, type PromptPaths } from "../prompts.js";
import type { AgentResult } from "../types.js";

/**
 * Quality & Compliance. Vetorett.
 *
 * To lag, med vilje:
 *
 *  1. Deterministiske sjekker i kode - språk mot kanal, tema mot allowed-lista,
 *     tegngrenser. Disse trenger ingen modell, kan ikke feiltolkes, og koster
 *     ingenting. En modell som «vurderer» om språket er riktig, kan ta feil.
 *     `channels.yaml` kan ikke det.
 *  2. Skjønnsmessige sjekker på modell - fakta mot kilder, tone, GDPR,
 *     helsepåstander, monetiseringsrisiko, plagiat.
 *
 * Faller lag 1, blokkeres innlegget uten å bruke et modellkall i det hele tatt.
 */

export interface QualityInput {
  brief: Brief;
  copy: CopyOutput;
  visual?: VisualOutput;
  research: ResearchOutput;
  config: AppConfig;
  /** Egne innlegg siste 90 dager, for plagiatsjekken. */
  recentPosts: string[];
}

/**
 * `check` er bundet til QA_CHECKS-unionen, ikke string. En skrivefeil i et
 * sjekknavn blir da en kompileringsfeil i stedet for en sjekk som stille
 * forsvinner ut av qa_reviews.
 */
interface DeterministicCheck {
  check: QaCheck;
  passed: boolean;
  reasoning: string;
}

/** Sjekker som ikke trenger skjønn. Kjøres alltid, før noe koster penger. */
export function deterministicChecks(input: QualityInput): DeterministicCheck[] {
  const checks: DeterministicCheck[] = [];
  const channel = input.config.channels.channels[input.brief.channel];

  const expected = channel?.language;
  checks.push({
    check: "language_native",
    passed: input.copy.language === expected,
    reasoning:
      input.copy.language === expected
        ? `Teksten er på ${input.copy.language}, som er kanalens språk. Morsmålsnivå vurderes av modellen.`
        : `Teksten er på ${input.copy.language}, men ${input.brief.channel} publiserer på ${expected}.`,
  });

  const theme = input.config.strategy.themes.find((t) => t.name === input.brief.theme);
  checks.push({
    check: "theme_allowed",
    passed: theme?.status === "allowed",
    reasoning:
      theme?.status === "allowed"
        ? `Temaet «${input.brief.theme}» står som allowed.`
        : `Temaet «${input.brief.theme}» er ikke tillatt: ${theme?.reason ?? "finnes ikke i strategy.yaml"}`,
  });

  // Tegngrenser per kanal. LinkedIn kutter ved 3000; kortvideo-caption er
  // kortere i praksis fordi den kollapser i feeden.
  const limits: Record<string, number> = {
    linkedin: 3000,
    instagram: 2200,
    facebook: 5000,
    tiktok: 2200,
    youtube: 5000,
  };
  const limit = limits[input.brief.channel] ?? 2200;
  const longest = Math.max(...input.copy.variants.map((v) => v.caption.length));
  checks.push({
    check: "channel_rules",
    passed: longest <= limit,
    reasoning:
      longest <= limit
        ? `Lengste caption er ${longest} tegn, innenfor ${limit}.`
        : `Lengste caption er ${longest} tegn, over grensen på ${limit} for ${input.brief.channel}.`,
  });

  return checks;
}

export async function runQuality(
  claude: ClaudeClient,
  paths: PromptPaths,
  input: QualityInput,
): Promise<AgentResult<QaVerdict>> {
  const hard = deterministicChecks(input);
  const hardFailures = hard.filter((c) => !c.passed);

  // Strukturell feil: briefen var gal. Ingen revisjonsrunde retter det, og
  // det er ingen grunn til å betale for et modellkall for å bekrefte det.
  if (hardFailures.length > 0) {
    return {
      output: qaVerdictSchema.parse({
        verdict: "blocked",
        checks: hard,
        reasoning:
          `Blokkert av deterministisk sjekk: ${hardFailures.map((f) => f.check).join(", ")}. ` +
          "Dette er en feil i briefen, ikke i teksten, og rettes ikke ved omskriving.",
      }),
      usages: [],
    };
  }

  const system = loadSystemPrompt(paths, "quality");
  const voice = loadVoice(paths, input.brief.language);
  const variant = input.copy.variants[0];

  const user = [
    `Channel: ${input.brief.channel} (publishes in ${input.brief.language})`,
    `Format: ${input.brief.format}`,
    `Theme: ${input.brief.theme}`,
    "",
    "## The post",
    `Hook: ${variant.hook}`,
    `Script: ${variant.script}`,
    `Caption: ${variant.caption}`,
    `Hashtags: ${variant.hashtags.join(" ") || "(none)"}`,
    "",
    "## Sources the Research agent supplied",
    ...(input.research.sources.length > 0
      ? input.research.sources.map((s) => `- "${s.claim}" — ${s.publisher}, ${s.url}`)
      : ["(none — any factual claim in the post is therefore unsourced)"]),
    "",
    ...(input.visual
      ? [
          "## Media",
          `Aspect ratio: ${input.visual.aspectRatio}`,
          `Reused from library: ${input.visual.reusedFromLibrary}`,
          `Files: ${input.visual.mediaUrls.join(", ")}`,
          "",
        ]
      : []),
    "## The owner's own posts from the last 90 days (for the plagiarism check)",
    ...(input.recentPosts.length > 0 ? input.recentPosts.map((p) => `- ${p}`) : ["(none)"]),
    "",
    "Language and theme have already been verified mechanically and passed.",
    "Judge native-level quality, not which language it is in.",
  ].join("\n");

  const result = await claude.structured({
    model: "claude-sonnet-5",
    system: [
      { text: system },
      { text: `# Voice file (${input.brief.language})\n\n${voice}`, cache: true },
    ],
    user,
    schema: qaVerdictSchema,
    effort: "high",
  });

  // De deterministiske sjekkene legges ved modellens, så qa_reviews viser
  // hele bildet og ikke bare den halvparten modellen vurderte.
  return {
    output: { ...result.output, checks: [...hard, ...result.output.checks] },
    usages: [result.usage],
  };
}
