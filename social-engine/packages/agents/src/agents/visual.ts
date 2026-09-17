import Decimal from "decimal.js";
import { z } from "zod";
import { visualOutputSchema, type Brief, type CopyOutput, type VisualOutput } from "@se/core";
import { imageCostUsd, ttsCostUsd, videoCostUsd } from "@se/economics";
import type { ClaudeClient } from "../claude.js";
import { loadSystemPrompt, type PromptPaths } from "../prompts.js";
import type { AgentResult } from "../types.js";

/**
 * Visual. Bestemmer hvordan innlegget ser ut.
 *
 * Agenten planlegger, den genererer ikke. Claude skriver generereings-
 * promptene og velger modell; selve genereringen skjer gjennom en
 * leverandøradapter. Skillet gjør at kostnadstaket kan sjekkes FØR en eneste
 * krone brukes - den dyreste operasjonen i systemet skal aldri startes på håp.
 */

/** Hva agenten planlegger. Ikke det samme som hva den leverer. */
export const visualPlanSchema = z.object({
  reuseFromLibrary: z.boolean(),
  reuseRationale: z.string(),
  clips: z
    .array(
      z.object({
        prompt: z.string().min(1),
        seconds: z.number().int().min(2).max(20),
        /** Må navngi språket eksplisitt - se prompts/visual.md. */
        onScreenText: z.string(),
      }),
    )
    .max(8),
  images: z.array(z.object({ prompt: z.string().min(1), onScreenText: z.string() })).max(4),
  aspectRatio: z.enum(["9:16", "4:5", "1:1", "16:9"]),
  voiceoverSeconds: z.number().int().min(0).max(600),
});
export type VisualPlan = z.infer<typeof visualPlanSchema>;

export class CostCapExceeded extends Error {
  constructor(
    readonly plannedNok: Decimal,
    readonly capNok: Decimal,
  ) {
    super(
      `Mediegenerering ville kostet ${plannedNok.toFixed(2)} NOK, over taket på ` +
        `${capNok.toFixed(2)} NOK. Stoppet før generering.`,
    );
    this.name = "CostCapExceeded";
  }
}

/** Standardmodeller. Billigst som klarer kvalitetskravet, ikke best tilgjengelig. */
export const DEFAULT_VIDEO_MODEL = "veo-3.1-lite-720p";
export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

export function priceplan(plan: VisualPlan): Decimal {
  const videoSeconds = plan.clips.reduce((acc, c) => acc + c.seconds, 0);
  let usd = new Decimal(0);
  if (videoSeconds > 0) usd = usd.plus(videoCostUsd(DEFAULT_VIDEO_MODEL, videoSeconds));
  if (plan.images.length > 0) usd = usd.plus(imageCostUsd(DEFAULT_IMAGE_MODEL, plan.images.length));
  if (plan.voiceoverSeconds > 0) usd = usd.plus(ttsCostUsd(plan.voiceoverSeconds));
  return usd;
}

/** Leverandøren som faktisk genererer. Byttes ut i Fase 3 uten å røre agenten. */
export interface MediaProvider {
  generateVideo(prompt: string, seconds: number, aspectRatio: string): Promise<string>;
  generateImage(prompt: string, aspectRatio: string): Promise<string>;
  searchLibrary(query: string): Promise<string[]>;
}

export async function runVisual(
  claude: ClaudeClient,
  paths: PromptPaths,
  provider: MediaProvider,
  brief: Brief,
  copy: CopyOutput,
  fxRate: Decimal.Value,
): Promise<AgentResult<VisualOutput>> {
  const system = loadSystemPrompt(paths, "visual");
  const variant = copy.variants[0];
  const library = await provider.searchLibrary(`${brief.theme} ${brief.angle}`);

  const plan = await claude.structured({
    model: "claude-sonnet-5",
    system: [{ text: system, cache: true }],
    user: [
      `Channel: ${brief.channel}`,
      `Format: ${brief.format}`,
      `Published language: ${brief.language}. ALL on-screen text must be in this language.`,
      `Cost cap for this post: ${new Decimal(brief.costCapNok).toFixed(2)} NOK.`,
      "",
      "## The script this must illustrate",
      variant.script,
      "",
      "## Asset library — reuse from here if it is as good as new generation",
      ...(library.length > 0 ? library.map((a) => `- ${a}`) : ["(library is empty)"]),
    ].join("\n"),
    schema: visualPlanSchema,
    effort: "medium",
  });

  const plannedUsd = priceplan(plan.output);
  const plannedNok = plannedUsd.times(new Decimal(fxRate));
  const capNok = new Decimal(brief.costCapNok);

  // Taket sjekkes her, mellom planlegging og generering. Det er hele grunnen
  // til at de to er skilt fra hverandre.
  if (plannedNok.gt(capNok)) throw new CostCapExceeded(plannedNok, capNok);

  const mediaUrls: string[] = [];
  if (plan.output.reuseFromLibrary && library.length > 0) {
    mediaUrls.push(...library.slice(0, Math.max(1, plan.output.clips.length)));
  } else {
    for (const clip of plan.output.clips) {
      mediaUrls.push(await provider.generateVideo(clip.prompt, clip.seconds, plan.output.aspectRatio));
    }
    for (const image of plan.output.images) {
      mediaUrls.push(await provider.generateImage(image.prompt, plan.output.aspectRatio));
    }
  }

  if (mediaUrls.length === 0) {
    throw new Error("Visual-agenten produserte ingen media. Planen var tom.");
  }

  const output: VisualOutput = visualOutputSchema.parse({
    mediaUrls,
    reusedFromLibrary: plan.output.reuseFromLibrary && library.length > 0,
    aspectRatio: plan.output.aspectRatio,
    estimatedCostNok: plan.output.reuseFromLibrary ? "0.0000" : plannedNok.toFixed(4),
  });

  const extraCostsUsd: NonNullable<AgentResult<VisualOutput>["extraCostsUsd"]> = [];
  if (!output.reusedFromLibrary) {
    const videoSeconds = plan.output.clips.reduce((acc, c) => acc + c.seconds, 0);
    if (videoSeconds > 0) {
      const usd = videoCostUsd(DEFAULT_VIDEO_MODEL, videoSeconds);
      extraCostsUsd.push({
        type: "media_video",
        quantity: videoSeconds,
        unitPriceUsd: usd.div(videoSeconds).toFixed(8),
      });
    }
    if (plan.output.images.length > 0) {
      const usd = imageCostUsd(DEFAULT_IMAGE_MODEL, plan.output.images.length);
      extraCostsUsd.push({
        type: "media_image",
        quantity: plan.output.images.length,
        unitPriceUsd: usd.div(plan.output.images.length).toFixed(8),
      });
    }
    if (plan.output.voiceoverSeconds > 0) {
      const usd = ttsCostUsd(plan.output.voiceoverSeconds);
      extraCostsUsd.push({
        type: "tts",
        quantity: plan.output.voiceoverSeconds,
        unitPriceUsd: usd.div(plan.output.voiceoverSeconds).toFixed(8),
      });
    }
  }

  return { output, usages: [plan.usage], extraCostsUsd };
}
