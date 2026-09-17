import Decimal from "decimal.js";

/**
 * Prisene systemet regner kostnad ut fra.
 *
 * Alt er USD per enhet. Omregning til NOK skjer med kursen som gjaldt da
 * kostnaden ble ført, og kursen lagres på hendelsen - se recordCost.
 *
 * TODO(kristian): disse må sjekkes mot leverandørenes prissider med jevne
 * mellomrom. En prisendring hos en leverandør endrer hele enhetsøkonomien,
 * og systemet merker det ellers først som en uforklarlig kostnadsdrift.
 */

export interface ModelPrice {
  /** USD per million input-tokens. */
  inputPerMTok: number;
  /** USD per million output-tokens. */
  outputPerMTok: number;
  /** Cachede input-tokens leses til ca. 0,1x. */
  cacheReadMultiplier: number;
}

/** Claude-priser, hentet 2026-09-17. */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25, cacheReadMultiplier: 0.1 },
  "claude-sonnet-5": { inputPerMTok: 2, outputPerMTok: 10, cacheReadMultiplier: 0.1 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5, cacheReadMultiplier: 0.1 },
};

export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
}

/**
 * Kostnad for én modellkjøring, i USD.
 *
 * Cachede tokens trekkes fra de fulle input-tokens og prises separat. Gjør vi
 * ikke det, overrapporterer systemet kostnaden sin - og da tar
 * Portfolio-agenten beslutninger på for høye tall.
 */
export function tokenCostUsd(usage: TokenUsage): Decimal {
  const price = MODEL_PRICES[usage.model];
  if (!price) throw new Error(`Ukjent modell i prislista: ${usage.model}`);

  const cached = usage.cachedTokens ?? 0;
  if (cached > usage.inputTokens) {
    throw new Error(
      `Flere cachede tokens (${cached}) enn input-tokens (${usage.inputTokens}) for ${usage.model}`,
    );
  }

  const uncached = usage.inputTokens - cached;
  const perToken = (perMTok: number) => new Decimal(perMTok).div(1_000_000);

  return perToken(price.inputPerMTok)
    .times(uncached)
    .plus(perToken(price.inputPerMTok).times(price.cacheReadMultiplier).times(cached))
    .plus(perToken(price.outputPerMTok).times(usage.outputTokens));
}

/** Videogenerering, USD per sekund. Hentet 2026-09-17. */
export const VIDEO_PRICES_PER_SECOND: Record<string, number> = {
  "veo-3.1-lite-720p": 0.03,
  "veo-3.1-lite-1080p": 0.05,
  "kling-3.0": 0.112,
};

export function videoCostUsd(model: string, seconds: number): Decimal {
  const price = VIDEO_PRICES_PER_SECOND[model];
  if (price === undefined) throw new Error(`Ukjent videomodell i prislista: ${model}`);
  if (seconds <= 0) throw new Error(`Videolengde må være positiv, fikk ${seconds}`);
  return new Decimal(price).times(seconds);
}

/** Bildegenerering, USD per bilde. */
export const IMAGE_PRICES: Record<string, number> = {
  "gemini-3.1-flash-image": 0.035,
  "nano-banana-2": 0.035,
};

export function imageCostUsd(model: string, count = 1): Decimal {
  const price = IMAGE_PRICES[model];
  if (price === undefined) throw new Error(`Ukjent bildemodell i prislista: ${model}`);
  return new Decimal(price).times(count);
}

/** Voiceover, USD per sekund. */
export const TTS_PRICE_PER_SECOND = 0.0033;

export function ttsCostUsd(seconds: number): Decimal {
  return new Decimal(TTS_PRICE_PER_SECOND).times(seconds);
}
