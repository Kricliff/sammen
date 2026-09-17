import { join } from "node:path";
import Decimal from "decimal.js";
import { loadConfig, type Brief, type Channel, type Format } from "@se/core";
import { createDb, runMigrations, schema } from "@se/db";
import { currentBudgets, runPipeline, type AgentContext } from "@se/agents";
import { createLogger } from "@se/observability";
import { eq } from "drizzle-orm";

/**
 * Dry-run av en hel ukesplan.
 *
 * Kjører hele pipelinen med reelle kostnadstall og lagrer alt, men publiserer
 * ingenting. Poenget er å se hva en uke faktisk koster FØR noe går ut - ikke
 * å oppdage det på fakturaen.
 *
 * Kjør:  DATABASE_URL=... npm run dry-run
 */

const CONFIG_DIR = join(process.cwd(), "config");
const FX_RATE = process.env.FX_USD_NOK ?? "9.30";

/** Bygger en ukesplan av kanalvektene i strategy.yaml. */
function weeklyPlan(config: ReturnType<typeof loadConfig>, postsPerWeek: number): Brief[] {
  const briefs: Brief[] = [];
  const themes = config.strategy.themes.filter((t) => t.status === "allowed");
  const totalThemeWeight = themes.reduce((acc, t) => acc + t.weight, 0);

  const activeChannels = (Object.entries(config.channels.channels) as [Channel, (typeof config.channels.channels)[Channel]][])
    .filter(([name, channel]) => channel?.enabled && (config.strategy.channelWeights[name] ?? 0) > 0);

  const totalChannelWeight = activeChannels.reduce(
    (acc, [name]) => acc + (config.strategy.channelWeights[name] ?? 0),
    0,
  );

  for (const [channelName, channel] of activeChannels) {
    const share = (config.strategy.channelWeights[channelName] ?? 0) / totalChannelWeight;
    const count = Math.max(1, Math.round(postsPerWeek * share));

    for (let i = 0; i < count; i++) {
      // Roterer gjennom temaene etter vekt, så planen speiler strategien.
      const theme = themes[i % themes.length]!;
      const format: Format = channelName === "linkedin" ? "text_post" : "short_video";

      briefs.push({
        theme: theme.name,
        angle: `Dry-run vinkel ${i + 1} for ${theme.name}`,
        channel: channelName,
        format,
        language: channel!.language,
        targetRpmNok: channel!.sharesAdRevenue ? "0.4650" : "0.0000",
        costCapNok: format === "short_video" ? "25.0000" : "10.0000",
        // Spres over uka, ikke over timer. Budsjettvakten er periodebasert,
        // så en plan som ligger i én dag ville blokkert seg selv på dag én.
        scheduledFor: new Date(Date.now() + (briefs.length % 7) * 86_400_000 + 9 * 3_600_000),
        rationale:
          `Kanalvekt ${(share * 100).toFixed(0)} %, temavekt ` +
          `${((theme.weight / totalThemeWeight) * 100).toFixed(0)} %.`,
      });
    }
  }

  return briefs;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL mangler. Se .env.example.");
    process.exit(1);
  }

  const postsPerWeek = Number(process.argv[2] ?? 21);
  const config = loadConfig(CONFIG_DIR);
  const logger = createLogger("dry-run", process.env.LOG_LEVEL ?? "warn");

  await runMigrations(databaseUrl);
  const { db, close } = createDb(databaseUrl);

  const ctx: AgentContext = { db, logger, config, fxRate: FX_RATE, dryRun: true };
  const briefs = weeklyPlan(config, postsPerWeek);

  console.log(`\nDRY-RUN — ${briefs.length} innlegg, ingenting publiseres.`);
  console.log(`Valutakurs USD/NOK: ${FX_RATE}\n`);

  const byState = new Map<string, number>();
  const byChannel = new Map<string, Decimal>();
  let total = new Decimal(0);

  for (const brief of briefs) {
    // Klokka følger briefen: kostnaden føres på dagen innlegget produseres for,
    // slik at budsjettvakten vurderer riktig periode.
    const result = await runPipeline({ ...ctx, now: brief.scheduledFor }, brief);
    const cost = new Decimal(result.totalCostNok);

    total = total.plus(cost);
    byState.set(result.finalState, (byState.get(result.finalState) ?? 0) + 1);
    byChannel.set(brief.channel, (byChannel.get(brief.channel) ?? new Decimal(0)).plus(cost));

    const flag = result.stoppedReason ? `  <- ${result.stoppedReason}` : "";
    console.log(
      `  ${brief.channel.padEnd(10)} ${brief.format.padEnd(12)} ` +
        `${cost.toFixed(2).padStart(7)} NOK  ${result.finalState}${flag}`,
    );
  }

  console.log("\n--- Kostnad per kanal ---");
  for (const [channel, cost] of [...byChannel].sort((a, b) => b[1].comparedTo(a[1]))) {
    console.log(`  ${channel.padEnd(10)} ${cost.toFixed(2).padStart(8)} NOK`);
  }

  console.log("\n--- Tilstander ---");
  for (const [state, count] of byState) console.log(`  ${state.padEnd(20)} ${count}`);

  // Infrastruktur påløper uansett om det produseres eller ikke, og er ikke en
  // kostnad pipelinen fører. Uten den lyver totalen.
  const infraPerMonthNok = new Decimal(process.env.INFRA_NOK_PER_MONTH ?? "232");
  const variableMonth = total.times(4.33);
  const variableYear = total.times(52);
  const totalYear = variableYear.plus(infraPerMonthNok.times(12));

  console.log("\n--- Økonomi ---");
  console.log(`  Uke, variabel:        ${total.toFixed(2).padStart(9)} NOK`);
  console.log(`  Måned, variabel:      ${variableMonth.toFixed(2).padStart(9)} NOK`);
  console.log(`  Måned, infrastruktur: ${infraPerMonthNok.toFixed(2).padStart(9)} NOK`);
  console.log(
    `  Måned, totalt:        ${variableMonth.plus(infraPerMonthNok).toFixed(2).padStart(9)} NOK`,
  );
  console.log(`  År, totalt:           ${totalYear.toFixed(2).padStart(9)} NOK`);

  const budgets = await currentBudgets({ ...ctx, now: new Date() });
  console.log("\n--- Budsjett ---");
  for (const budget of budgets) {
    console.log(
      `  ${budget.period.padEnd(6)} ${budget.spentNok.toFixed(2).padStart(8)} av ` +
        `${budget.capNok.toFixed(2).padStart(8)} NOK  (${(budget.usedPct * 100).toFixed(0)} %) ${budget.status}`,
    );
  }

  // Break-even mot faktisk prisliste fra cliffordcoaching.no.
  const tenPack = new Decimal(12140);
  const fivePack = new Decimal(6399);
  console.log("\n--- Break-even ---");
  console.log(`  ${totalYear.div(tenPack).toFixed(1)} coaching-10-pakker i året (kr 12 140)`);
  console.log(`  ${totalYear.div(fivePack).toFixed(1)} coaching-5-pakker i året (kr 6 399)`);
  console.log(
    `  Til sammenlikning: 10 mill. YouTube Shorts-visninger ved RPM $0,05 ` +
      `= ca. 4 650 NOK.`,
  );

  const awaiting = await db
    .select({ id: schema.contentItems.id })
    .from(schema.contentItems)
    .where(eq(schema.contentItems.state, "awaiting_approval"));
  console.log(`  ${awaiting.length} innlegg venter på din godkjenning.\n`);

  await close();
}

await main();
