import { createLogger } from "@se/observability";

/**
 * Worker-prosessen.
 *
 * Fase 1 setter opp køinfrastrukturen, men agentene er fortsatt mocks. Den
 * kjørbare demonstrasjonen er `npm run dry-run`, som kjører hele pipelinen
 * synkront og skriver ut hva en uke koster.
 *
 * TODO(kristian): Fase 2 kobler BullMQ-workerne fra @se/queue på de ekte
 * agentene og starter de repeterende jobbene (REPEATABLE_JOBS).
 */

const logger = createLogger("worker");

logger.info(
  "Worker startet. Agentene er mocks i Fase 1 - kjør `npm run dry-run` for å se pipelinen.",
);

process.on("SIGTERM", () => {
  logger.info("SIGTERM mottatt, avslutter.");
  process.exit(0);
});
