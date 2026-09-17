import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { channelSchema, formatSchema, languageSchema } from "./domain.js";

/**
 * Konfigurasjon lastes fra /config og valideres mot Zod ved oppstart.
 *
 * Feil i en konfigfil skal stoppe systemet der og da, med en lesbar melding.
 * Et system som publiserer autonomt kan ikke oppdage en skrivefeil i
 * kanalvektingen tre uker senere, i form av en regning.
 */

/** Hvordan en kanal publiserer. `manual` er default - se ARCHITECTURE.md 9.1. */
export const autopublishModeSchema = z.enum(["manual", "auto", "off"]);

export const channelConfigSchema = z.object({
  enabled: z.boolean(),
  language: languageSchema,
  autopublishMode: autopublishModeSchema.default("manual"),
  maxPostsPerDay: z.number().int().positive(),
  /** Kanaler som ikke deler annonseinntekt med skaper. Se MONETIZATION.md. */
  sharesAdRevenue: z.boolean(),
  notes: z.string().optional(),
});
export type ChannelConfig = z.infer<typeof channelConfigSchema>;

export const channelsConfigSchema = z.object({
  channels: z.record(channelSchema, channelConfigSchema),
});
export type ChannelsConfig = z.infer<typeof channelsConfigSchema>;

export const themeSchema = z.object({
  name: z.string().min(1),
  /**
   * `blocked` markerer temaer som ligger for tett på arbeidsgivers virksomhet.
   * Se UNIT_ECONOMICS.md 6.2 - eier er fast ansatt i et rekrutteringsselskap.
   */
  status: z.enum(["allowed", "blocked"]),
  weight: z.number().min(0).max(1),
  reason: z.string().optional(),
});

export const strategyConfigSchema = z.object({
  themes: z.array(themeSchema).min(1),
  channelWeights: z.record(channelSchema, z.number().min(0).max(1)),
  formatMix: z.record(formatSchema, z.number().min(0).max(1)),
  /**
   * Andel av budsjettet som alltid holdes av til utforskning av nye temaer,
   * så systemet ikke låser seg fast i én vinnerformel som slutter å virke.
   */
  explorationShare: z.number().min(0).max(1),
  capacity: z.object({
    /**
     * Den bindende ressursen. Introsamtalen er gratis i kroner, men koster
     * 45 minutter av eierens tid per henvendelse. Se UNIT_ECONOMICS.md 6.1.2.
     */
    maxIntroCallsPerMonth: z.number().int().positive(),
    introCallMinutes: z.number().int().positive().default(45),
  }),
});
export type StrategyConfig = z.infer<typeof strategyConfigSchema>;

export const budgetsConfigSchema = z.object({
  dailyCapNok: z.number().positive(),
  weeklyCapNok: z.number().positive(),
  monthlyCapNok: z.number().positive(),
  /** Andel av taket der systemet varsler. Ved 100 % stopper det. */
  warnAtPct: z.number().min(0).max(1).default(0.8),
});
export type BudgetsConfig = z.infer<typeof budgetsConfigSchema>;

export const brandConfigSchema = z.object({
  colors: z.record(z.string(), z.string()),
  fonts: z.object({ heading: z.string(), body: z.string() }),
  safeMargins: z.record(z.string(), z.number()),
});
export type BrandConfig = z.infer<typeof brandConfigSchema>;

export interface AppConfig {
  channels: ChannelsConfig;
  strategy: StrategyConfig;
  budgets: BudgetsConfig;
  brand: BrandConfig;
}

function loadYaml<T>(dir: string, file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const path = join(dir, file);
  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(`Kunne ikke lese ${path}: ${(cause as Error).message}`, { cause });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Ugyldig konfigurasjon i ${path}:\n${formatZodError(parsed.error)}`);
  }
  return parsed.data;
}

function loadJson<T>(dir: string, file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
  const path = join(dir, file);
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    throw new Error(`Ugyldig konfigurasjon i ${path}:\n${formatZodError(parsed.error)}`);
  }
  return parsed.data;
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(rot)"}: ${i.message}`).join("\n");
}

export function loadConfig(configDir: string): AppConfig {
  const config: AppConfig = {
    channels: loadYaml(configDir, "channels.yaml", channelsConfigSchema),
    strategy: loadYaml(configDir, "strategy.yaml", strategyConfigSchema),
    budgets: loadYaml(configDir, "budgets.yaml", budgetsConfigSchema),
    brand: loadJson(configDir, "brand.json", brandConfigSchema),
  };
  assertConsistent(config);
  return config;
}

/**
 * Kryssvalidering mellom filene. Zod ser hver fil for seg; disse feilene
 * oppstår først når filene leses sammen.
 */
export function assertConsistent(config: AppConfig): void {
  const problems: string[] = [];

  const activeThemes = config.strategy.themes.filter((t) => t.status === "allowed");
  if (activeThemes.length === 0) {
    problems.push("Ingen temaer har status `allowed`. Systemet ville ikke hatt noe å produsere.");
  }

  for (const [channel, weight] of Object.entries(config.strategy.channelWeights)) {
    const channelConfig = config.channels.channels[channel as keyof typeof config.channels.channels];
    if (!channelConfig) {
      problems.push(`strategy.yaml vekter \`${channel}\`, men kanalen finnes ikke i channels.yaml.`);
    } else if (!channelConfig.enabled && weight > 0) {
      problems.push(
        `\`${channel}\` er deaktivert i channels.yaml, men har vekt ${weight} i strategy.yaml. ` +
          "Sett vekten til 0 eller aktiver kanalen.",
      );
    }
  }

  if (config.budgets.dailyCapNok * 7 > config.budgets.weeklyCapNok) {
    problems.push(
      `Dagstaket (${config.budgets.dailyCapNok} x 7) overstiger ukestaket ` +
        `(${config.budgets.weeklyCapNok}). Ukestaket ville aldri blitt bindende.`,
    );
  }
  if (config.budgets.weeklyCapNok * 4 > config.budgets.monthlyCapNok) {
    problems.push(
      `Ukestaket (${config.budgets.weeklyCapNok} x 4) overstiger månedstaket ` +
        `(${config.budgets.monthlyCapNok}). Månedstaket ville aldri blitt bindende.`,
    );
  }

  if (problems.length > 0) {
    throw new Error(`Konfigurasjonen henger ikke sammen:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
}
