import {
  copyOutputSchema,
  type Brief,
  type CopyOutput,
  type ResearchOutput,
} from "@se/core";
import type { ClaudeClient } from "../claude.js";
import { loadSystemPrompt, loadVoice, type PromptPaths } from "../prompts.js";
import type { AgentResult } from "../types.js";

/**
 * Copywriter. Skriver innlegget.
 *
 * Eneste agent som blir på Opus 5 uansett hvor mye vi sparer andre steder.
 * Det er her morsmålskvaliteten avgjøres, og det er den ene tingen
 * Quality-agenten ikke kan redde i etterkant.
 */

export async function runCopywriter(
  claude: ClaudeClient,
  paths: PromptPaths,
  brief: Brief,
  research: ResearchOutput,
  /** Innsikt fra Analyst, inkludert eiers egne avvisninger. Kan være tom. */
  learnings: string[] = [],
): Promise<AgentResult<CopyOutput>> {
  const system = loadSystemPrompt(paths, "copywriter");
  const voice = loadVoice(paths, brief.language);

  const sources = research.sources
    .map((s) => `- "${s.claim}" — ${s.publisher}, ${s.url}`)
    .join("\n");

  const user = [
    `Target language: ${brief.language}. Write in it from the first word.`,
    `Channel: ${brief.channel}`,
    `Format: ${brief.format}`,
    `Theme: ${brief.theme}`,
    `Angle: ${brief.angle}`,
    "",
    "## Sourced claims you may use",
    sources || "(none — do not introduce factual claims of your own)",
    "",
    ...(learnings.length > 0
      ? ["## What this audience has responded to, and what the owner has rejected", ...learnings.map((l) => `- ${l}`), ""]
      : []),
    "Write two variants. Vary the hook and the angle, not the wording.",
  ].join("\n");

  const result = await claude.structured({
    model: "claude-opus-5",
    // Systemprompt og voice-fil er identiske for hvert innlegg på samme
    // språk. Begge caches; det er her prompt-cachen faktisk betaler seg.
    system: [
      { text: system },
      { text: `# Voice file (${brief.language})\n\n${voice}`, cache: true },
    ],
    user,
    schema: copyOutputSchema,
    effort: "high",
  });

  return { output: result.output, usages: [result.usage] };
}
