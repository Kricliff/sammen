import type Decimal from "decimal.js";
import type { AppConfig, Brief } from "@se/core";
import type { Database } from "@se/db";
import type { TokenUsage } from "@se/economics";
import type { Logger } from "@se/observability";

/**
 * Felles kjørekontekst for alle agenter.
 *
 * Agentene får databasen og konfigurasjonen inn, ikke som globaler. Det er
 * det som gjør dem testbare med faste testinput uten å starte hele systemet.
 */
export interface AgentContext {
  db: Database;
  logger: Logger;
  config: AppConfig;
  /** Kursen som skal brukes for kostnader i denne kjøringen. */
  fxRate: Decimal.Value;
  dryRun: boolean;
  /**
   * Pipelinens klokke. Styrer hvilken budsjettperiode en kostnad havner i,
   * og tidsstempelet på cost_events.
   *
   * Finnes som eksplisitt felt fordi budsjettvakten ellers er umulig å teste
   * og umulig å dry-run'e: en ukesplan kjørt på ett sekund ville lagt alle
   * kostnadene i samme dagsbøtte og blokkert seg selv på dag én.
   */
  now?: Date;
}

/**
 * Det en agent leverer tilbake.
 *
 * `usages` er en LISTE, ikke ett forbruk. En agent kan gjøre flere kall på
 * flere modeller - Research gjør websøk på Sonnet og strukturering på Haiku -
 * og de må prises hver for seg. Slår vi dem sammen under én modell, blir
 * kostnadstallet feil, og da tar Portfolio-agenten beslutninger på feil tall.
 *
 * Lista er aldri tom. Kostnadssporingen er koblet på fra første kall, ikke
 * ettermontert: en agent som ikke rapporterer forbruket sitt kan ikke
 * regnskapsføres, og da kan innlegget aldri nå `settled`.
 */
export interface AgentResult<T> {
  output: T;
  usages: TokenUsage[];
  /** Ikke-token-kostnader agenten påførte, i USD. */
  extraCostsUsd?: { type: "media_image" | "media_video" | "tts"; quantity: number; unitPriceUsd: string }[];
}

export interface AgentRunInput {
  contentItemId: string;
  brief: Brief;
}
