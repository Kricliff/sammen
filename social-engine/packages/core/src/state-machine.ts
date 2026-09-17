import type { AgentName, ContentState } from "./domain.js";

/**
 * Tilstandsmaskinen for ett content_item.
 *
 * Denne modulen er ren: den validerer om en overgang er lovlig, og ingenting
 * annet. Selve skrivingen til `content_items` og `state_transitions` skjer i
 * orchestrator-laget, i samme transaksjon. Grunnen til å skille dem er at da
 * kan hele overgangstabellen testes uten database.
 */

/** Lovlige overganger. Alt som ikke står her, er ulovlig. */
const TRANSITIONS: Record<ContentState, readonly ContentState[]> = {
  planned: ["researched", "needs_review", "blocked", "cancelled", "failed"],
  researched: ["drafted", "blocked", "cancelled", "failed"],
  drafted: ["visual_ready", "blocked", "cancelled", "failed"],
  visual_ready: ["qa_passed", "revising", "blocked", "cancelled", "failed"],

  // Quality sa `revise`. Tilbake til Copywriter. Maks 2 runder - se MAX_REVISION_ROUNDS.
  revising: ["drafted", "blocked", "cancelled"],

  // Gaten fra ARCHITECTURE.md 9.1. Kanaler med AUTOPUBLISH_MODE=auto
  // hopper rett til `scheduled` uten opphold.
  qa_passed: ["awaiting_approval", "scheduled", "blocked", "cancelled"],
  awaiting_approval: ["scheduled", "cancelled", "blocked"],

  scheduled: ["published", "cancelled", "failed"],
  published: ["measured", "failed"],

  // Ny måling av et allerede målt innlegg er lovlig - metrics er en tidsserie.
  measured: ["measured", "settled"],

  // Inntekt som ankommer etter oppgjør åpner raden på nytt. Plattformene
  // rapporterer med etterslep, så dette er normaldrift, ikke et unntak.
  settled: ["measured"],

  needs_review: ["researched", "cancelled", "blocked"],

  // Eier kan overstyre en blokkering og sende innlegget tilbake til skriving.
  blocked: ["drafted", "cancelled"],

  // Feilet publisering kan prøves igjen etter at årsaken er rettet.
  failed: ["scheduled", "cancelled"],

  cancelled: [],
};

/** Tilstander der innlegget er ferdig behandlet og ingen jobb skal plukke det opp. */
export const TERMINAL_STATES: readonly ContentState[] = ["cancelled"];

/** Quality-agentens grense fra oppdraget: maks 2 revisjonsrunder, så blokkeres det. */
export const MAX_REVISION_ROUNDS = 2;

export function canTransition(from: ContentState, to: ContentState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: ContentState): readonly ContentState[] {
  return TRANSITIONS[from];
}

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: ContentState,
    readonly to: ContentState,
  ) {
    super(
      `Ulovlig tilstandsovergang: ${from} -> ${to}. ` +
        `Lovlige fra ${from}: ${TRANSITIONS[from].join(", ") || "(ingen, terminal)"}`,
    );
    this.name = "IllegalTransitionError";
  }
}

/**
 * Forutsetninger som må være oppfylt for at en overgang skal være lov,
 * utover selve overgangstabellen.
 */
export interface TransitionContext {
  /** Antall revisjonsrunder Quality allerede har brukt. */
  revisionRounds?: number;
  /** Er det ført minst én kostnadshendelse på innlegget? */
  hasCost?: boolean;
  /** Er det ført minst én inntektshendelse på innlegget? */
  hasRevenue?: boolean;
}

export class TransitionGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionGuardError";
  }
}

/**
 * Kaster hvis overgangen er ulovlig eller en forutsetning ikke er oppfylt.
 *
 * Den viktigste regelen her er `settled`: oppdraget sier «ingen innlegg uten
 * kostnadstall». Det håndheves ikke av konvensjon, men av at et innlegg uten
 * ført kostnad rett og slett ikke kan nå oppgjort tilstand.
 */
export function assertTransition(
  from: ContentState,
  to: ContentState,
  ctx: TransitionContext = {},
): void {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);

  if (to === "settled") {
    if (!ctx.hasCost) {
      throw new TransitionGuardError(
        "Kan ikke sette innlegget til `settled` uten registrert kostnad. " +
          "Ingen innlegg uten kostnadstall.",
      );
    }
    if (!ctx.hasRevenue) {
      throw new TransitionGuardError(
        "Kan ikke sette innlegget til `settled` uten registrert inntekt. " +
          "`settled` betyr ferdig regnskapsført, ikke ferdig publisert.",
      );
    }
  }

  if (to === "revising" && (ctx.revisionRounds ?? 0) >= MAX_REVISION_ROUNDS) {
    throw new TransitionGuardError(
      `Quality har allerede brukt ${ctx.revisionRounds} av ${MAX_REVISION_ROUNDS} ` +
        "revisjonsrunder. Neste steg er `blocked`, ikke en ny runde.",
    );
  }
}

export interface TransitionRecord {
  from: ContentState;
  to: ContentState;
  agent: AgentName;
  reasoning: string;
}
