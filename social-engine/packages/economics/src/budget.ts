import Decimal from "decimal.js";
import type { BudgetsConfig } from "@se/core";

/**
 * Budsjettvakt.
 *
 * Ved 80 % av taket varsles eier. Ved 100 % stopper systemet all ny
 * produksjon og fullfører kun det som allerede står i kø. Det er en hard
 * stopp, ikke en advarsel - oppdraget sier «uten unntak».
 */

export type BudgetStatus = "ok" | "warning" | "exceeded";
export type BudgetPeriod = "day" | "week" | "month";

export interface BudgetState {
  period: BudgetPeriod;
  capNok: Decimal;
  spentNok: Decimal;
  remainingNok: Decimal;
  usedPct: number;
  status: BudgetStatus;
}

export function evaluateBudget(
  period: BudgetPeriod,
  capNok: Decimal.Value,
  spentNok: Decimal.Value,
  warnAtPct: number,
): BudgetState {
  const cap = new Decimal(capNok);
  const spent = new Decimal(spentNok);
  if (cap.lte(0)) throw new Error(`Budsjettak må være positivt, fikk ${cap.toString()}`);

  const usedPct = spent.div(cap).toNumber();
  const status: BudgetStatus = usedPct >= 1 ? "exceeded" : usedPct >= warnAtPct ? "warning" : "ok";

  return {
    period,
    capNok: cap,
    spentNok: spent,
    remainingNok: Decimal.max(0, cap.minus(spent)),
    usedPct,
    status,
  };
}

export interface BudgetDecision {
  allowed: boolean;
  reason: string;
  blockingPeriod?: BudgetPeriod;
}

/**
 * Avgjør om en ny, kjent kostnad får påføres.
 *
 * Alle tre periodene sjekkes. Den strengeste vinner: et innlegg som ville
 * sprengt dagstaket stoppes selv om måneden har god plass.
 */
export function canSpend(states: BudgetState[], amountNok: Decimal.Value): BudgetDecision {
  const amount = new Decimal(amountNok);

  for (const state of states) {
    if (state.status === "exceeded") {
      return {
        allowed: false,
        reason: `${state.period}-budsjettet er allerede overskredet (${state.spentNok.toFixed(2)} av ${state.capNok.toFixed(2)} NOK).`,
        blockingPeriod: state.period,
      };
    }
    if (state.spentNok.plus(amount).gt(state.capNok)) {
      return {
        allowed: false,
        reason:
          `Kostnaden på ${amount.toFixed(2)} NOK ville sprengt ${state.period}-taket ` +
          `(${state.spentNok.toFixed(2)} + ${amount.toFixed(2)} > ${state.capNok.toFixed(2)} NOK).`,
        blockingPeriod: state.period,
      };
    }
  }

  return { allowed: true, reason: "Innenfor alle budsjettak." };
}

/** Periodegrenser i Europe/Oslo, returnert som UTC-instanser. */
export function periodBounds(period: BudgetPeriod, now: Date): { from: Date; to: Date } {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);

  if (period === "day") {
    return { from: d, to: new Date(d.getTime() + 86_400_000) };
  }
  if (period === "week") {
    // ISO-uke: mandag er første dag.
    const dayOfWeek = (d.getUTCDay() + 6) % 7;
    const from = new Date(d.getTime() - dayOfWeek * 86_400_000);
    return { from, to: new Date(from.getTime() + 7 * 86_400_000) };
  }
  const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { from, to };
}

export function budgetCap(config: BudgetsConfig, period: BudgetPeriod): number {
  return period === "day"
    ? config.dailyCapNok
    : period === "week"
      ? config.weeklyCapNok
      : config.monthlyCapNok;
}
