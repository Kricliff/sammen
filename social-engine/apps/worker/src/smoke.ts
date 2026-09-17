import { join } from "node:path";
import Decimal from "decimal.js";
import { loadConfig, type Brief } from "@se/core";
import { tokenCostUsd } from "@se/economics";
import {
  AnthropicClaudeClient,
  runCopywriter,
  runQuality,
  runResearch,
  runVisual,
  type MediaProvider,
  type PromptPaths,
} from "@se/agents";

/**
 * Røyktest mot ekte API.
 *
 * Kjører hvert av agentkallene én gang og skriver ut hva de faktisk
 * produserte og hva de kostet. Dette er den eneste kommandoen i prosjektet
 * som bruker penger - enhetstestene gjør det aldri.
 *
 * Forventet kostnad: under 2 NOK for hele kjøringen.
 *
 * Kjør:  ANTHROPIC_API_KEY=... npm run smoke
 */

const paths: PromptPaths = {
  promptsDir: join(process.cwd(), "prompts"),
  configDir: join(process.cwd(), "config"),
};
const FX = process.env.FX_USD_NOK ?? "9.30";

const brief: Brief = {
  theme: "mental_training",
  angle: "Why people who say they lack motivation usually lack structure",
  channel: "youtube",
  format: "short_video",
  language: "en",
  targetRpmNok: "0.4650",
  costCapNok: "25.0000",
  scheduledFor: new Date(Date.now() + 86_400_000),
  rationale: "Røyktest.",
};

/** Genererer ingenting. Røyktesten skal teste Claude-kallene, ikke mediekostnad. */
const provider: MediaProvider = {
  generateVideo: async (_p, s) => `smoke://clip-${s}s.mp4`,
  generateImage: async () => "smoke://image.png",
  searchLibrary: async () => [],
};

let totalUsd = new Decimal(0);

function report(label: string, usages: { model: string; inputTokens: number; outputTokens: number; cachedTokens?: number }[]) {
  for (const usage of usages) {
    const usd = tokenCostUsd(usage);
    totalUsd = totalUsd.plus(usd);
    const cached = usage.cachedTokens ? `, ${usage.cachedTokens} cachet` : "";
    console.log(
      `    ${usage.model.padEnd(20)} ${usage.inputTokens} inn / ${usage.outputTokens} ut${cached}` +
        `  =  ${usd.times(new Decimal(FX)).toFixed(4)} NOK`,
    );
  }
  console.log(`  ${label}: ok\n`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY mangler.\n" +
        "Dette skriptet gjør ekte modellkall og koster penger (under 2 NOK).\n" +
        "Enhetstestene (`npm test`) gjør det ikke og trenger ingen nøkkel.",
    );
    process.exit(1);
  }

  const claude = new AnthropicClaudeClient();
  const config = loadConfig(paths.configDir);

  console.log("\nRØYKTEST — ekte modellkall. Forventet kostnad under 2 NOK.\n");

  console.log("1/4  Research (websøk + strukturering)");
  const research = await runResearch(claude, paths, brief);
  console.log(`    ${research.output.sources.length} kilder, ${research.output.unsourcedClaims.length} ukildede påstander`);
  for (const source of research.output.sources) console.log(`      - ${source.publisher}: ${source.url}`);
  report("Research", research.usages);

  console.log("2/4  Copywriter");
  const copy = await runCopywriter(claude, paths, brief, research.output);
  for (const variant of copy.output.variants) {
    console.log(`    Variant ${variant.variant}: "${variant.hook}"`);
  }
  report("Copywriter", copy.usages);

  console.log("3/4  Visual (planlegging, ingenting genereres)");
  const visual = await runVisual(claude, paths, provider, brief, copy.output, FX);
  console.log(`    ${visual.output.mediaUrls.length} klipp, ${visual.output.aspectRatio}, ${visual.output.estimatedCostNok} NOK i mediekostnad`);
  report("Visual", visual.usages);

  console.log("4/4  Quality");
  const qa = await runQuality(claude, paths, {
    brief,
    copy: copy.output,
    visual: visual.output,
    research: research.output,
    config,
    recentPosts: [],
  });
  console.log(`    Dom: ${qa.output.verdict}`);
  for (const check of qa.output.checks) {
    console.log(`      ${check.passed ? "ok  " : "FEIL"} ${check.check}: ${check.reasoning.slice(0, 90)}`);
  }
  report("Quality", qa.usages);

  const totalNok = totalUsd.times(new Decimal(FX));
  console.log("---");
  console.log(`Total tokenkostnad: ${totalNok.toFixed(4)} NOK (${totalUsd.toFixed(4)} USD)`);
  console.log(`Mediekostnad hvis dette hadde blitt generert: ${visual.output.estimatedCostNok} NOK`);
  console.log(
    `Sum per innlegg: ${totalNok.plus(new Decimal(visual.output.estimatedCostNok)).toFixed(2)} NOK ` +
      `(estimat i UNIT_ECONOMICS.md: 12,04 NOK)\n`,
  );
}

await main();
