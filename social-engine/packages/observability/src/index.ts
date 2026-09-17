import { pino, type Logger } from "pino";

/**
 * Strukturert JSON-logging. Alle agentbeslutninger lagres i databasen i
 * tillegg til her - loggen er for drift, databasen er for revisjon.
 *
 * Loggmeldinger er på norsk. Det er interne meldinger, og oppdragets regel er
 * at bare det publikum ser er på engelsk.
 */

const REDACTED = [
  "accessToken",
  "refreshToken",
  "apiKey",
  "*.accessToken",
  "*.refreshToken",
  "*.apiKey",
  "req.headers.authorization",
];

export function createLogger(name: string, level = process.env.LOG_LEVEL ?? "info"): Logger {
  return pino({
    name,
    level,
    // Hemmeligheter skal aldri havne i en loggfil, heller ikke ved et uhell
    // i et objekt noen dumpet i sin helhet under feilsøking.
    redact: { paths: REDACTED, censor: "[REDACTED]" },
    formatters: { level: (label) => ({ level: label }) },
  });
}

export type { Logger };

/** Én agentbeslutning, logget likt uansett hvilken agent som tok den. */
export interface DecisionLog {
  agent: string;
  contentItemId?: string;
  decision: string;
  reasoning: string;
  costNok?: string;
  durationMs?: number;
}

export function logDecision(logger: Logger, entry: DecisionLog): void {
  logger.info({ ...entry, kind: "agent_decision" }, `${entry.agent}: ${entry.decision}`);
}
