import { researchOutputSchema, type Brief, type ResearchOutput } from "@se/core";
import type { ClaudeClient } from "../claude.js";
import { loadSystemPrompt, type PromptPaths } from "../prompts.js";
import type { AgentResult } from "../types.js";

/**
 * Research. Henter faktagrunnlaget for ett innlegg.
 *
 * To kall, med vilje:
 *
 *  1. Websøk på Sonnet 5, som returnerer fritekst med kilder.
 *  2. Strukturering på Haiku 4.5, som presser resultatet inn i skjemaet.
 *
 * Alternativet - ett kall med både websøk og strukturert output - er
 * fristende, men skjørt: modellen må da både søke og treffe skjemaet i samme
 * sving, og feiler den, har vi brukt et dyrt kall på ingenting.
 * Struktureringskallet på Haiku koster under ett øre, og gjør steg 1 fritt
 * til å bare være god på research.
 */

export async function runResearch(
  claude: ClaudeClient,
  paths: PromptPaths,
  brief: Brief,
): Promise<AgentResult<ResearchOutput>> {
  const system = loadSystemPrompt(paths, "research");

  const searchResult = await claude.research({
    model: "claude-sonnet-5",
    system: [{ text: system, cache: true }],
    user: [
      `Theme: ${brief.theme}`,
      `Angle: ${brief.angle}`,
      `Channel: ${brief.channel} (${brief.format}, published in ${brief.language})`,
      "",
      "Find the factual basis for this post. Two to four solid claims, each with",
      "a source URL, the publisher's name, and today's date as the retrieval date.",
      "",
      "If you cannot source something you believe is true, say so explicitly and",
      "label it as unsourced. Do not soften it into a vague statement.",
    ].join("\n"),
    maxUses: 5,
  });

  const structured = await claude.structured({
    model: "claude-haiku-4-5",
    system: [
      {
        text:
          "Extract the research findings into the required structure. Copy claims, " +
          "URLs and publishers exactly as they appear. Do not invent a URL for a " +
          "claim that has none — put that claim in unsourcedClaims instead.",
        cache: true,
      },
    ],
    user: searchResult.output,
    schema: researchOutputSchema,
    effort: "low",
  });

  // Begge kallene rapporteres hver for seg, med sin egen modell. Å slå dem
  // sammen under ett modellnavn ville priset Haiku-tokens som Sonnet-tokens.
  return { output: structured.output, usages: [searchResult.usage, structured.usage] };
}
