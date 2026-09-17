import { z } from "zod";
import { briefSchema, type AppConfig, type Brief } from "@se/core";
import type { ClaudeClient } from "../claude.js";
import { loadSystemPrompt, type PromptPaths } from "../prompts.js";
import type { AgentResult } from "../types.js";

/**
 * Strategist. Kjører ukentlig og fordeler produksjonsbudsjettet.
 *
 * Får konfigurasjonen og forrige periodes tall inn som kontekst, og
 * returnerer en liste briefer. Den skriver ikke innhold.
 */

export const planSchema = z.object({
  briefs: z.array(briefSchema).min(1).max(60),
  allocationNotes: z.string().min(1),
});

export interface StrategistInput {
  weekStart: Date;
  config: AppConfig;
  /** Forrige periodes margin per tema og kanal. Tom liste første uke. */
  priorPerformance: {
    theme: string;
    channel: string;
    posts: number;
    marginNok: string;
    rpmNok: string | null;
  }[];
  thresholds: { channel: string; metric: string; required: number; current: number }[];
  /** Introsamtaler brukt denne måneden, mot taket i strategy.yaml. */
  introCallsUsed: number;
  postsThisWeek: number;
}

export async function runStrategist(
  claude: ClaudeClient,
  paths: PromptPaths,
  input: StrategistInput,
): Promise<AgentResult<{ briefs: Brief[]; allocationNotes: string }>> {
  const system = loadSystemPrompt(paths, "strategist");
  const { strategy, channels } = input.config;

  const allowed = strategy.themes.filter((t) => t.status === "allowed");
  const blocked = strategy.themes.filter((t) => t.status === "blocked");
  const active = Object.entries(channels.channels).filter(([, c]) => c?.enabled);
  const capacityLeft = strategy.capacity.maxIntroCallsPerMonth - input.introCallsUsed;

  const user = [
    `Week starting: ${input.weekStart.toISOString().slice(0, 10)}`,
    `Posts to plan this week: ${input.postsThisWeek}`,
    "",
    "## Allowed themes",
    ...allowed.map((t) => `- ${t.name} (config weight ${t.weight})`),
    "",
    "## Blocked themes — never allocate to these",
    ...(blocked.length > 0
      ? blocked.map((t) => `- ${t.name}: ${t.reason ?? "no reason recorded"}`)
      : ["(none)"]),
    "",
    "## Active channels",
    ...active.map(
      ([name, c]) =>
        `- ${name}: language=${c!.language}, weight=${strategy.channelWeights[name as keyof typeof strategy.channelWeights] ?? 0}, ` +
        `shares_ad_revenue=${c!.sharesAdRevenue}, max_per_day=${c!.maxPostsPerDay}`,
    ),
    "",
    "## Format mix (target shares)",
    ...Object.entries(strategy.formatMix).map(([f, share]) => `- ${f}: ${share}`),
    `Exploration share reserved for untested themes: ${strategy.explorationShare}`,
    "",
    "## Capacity",
    `Intro calls this month: ${input.introCallsUsed} of ${strategy.capacity.maxIntroCallsPerMonth}, ${capacityLeft} left.`,
    capacityLeft <= 0
      ? "CEILING REACHED. Shift budget away from lead-generating themes toward pure reach."
      : `Each intro call costs the owner ${strategy.capacity.introCallMinutes} unpaid minutes, converted or not.`,
    "",
    "## Progress toward monetization thresholds",
    ...(input.thresholds.length > 0
      ? input.thresholds.map(
          (t) =>
            `- ${t.channel}/${t.metric}: ${t.current} of ${t.required} (${((t.current / t.required) * 100).toFixed(1)}%)`,
        )
      : ["(no threshold data yet)"]),
    "",
    "## Prior period performance",
    ...(input.priorPerformance.length > 0
      ? input.priorPerformance.map(
          (p) =>
            `- ${p.theme} on ${p.channel}: ${p.posts} posts, margin ${p.marginNok} NOK, RPM ${p.rpmNok ?? "not measurable"}`,
        )
      : ["(no prior data — first week. Allocate by config weights and say so in allocationNotes.)"]),
  ].join("\n");

  const result = await claude.structured({
    model: "claude-opus-5",
    system: [{ text: system, cache: true }],
    user,
    schema: planSchema,
    effort: "high",
  });

  return { output: result.output, usages: [result.usage] };
}
