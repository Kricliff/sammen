import Decimal from "decimal.js";
import { MONEY_SCALE, quantize, sum, ZERO } from "./money.js";

/**
 * Marginberegningen. Ren funksjon, ingen I/O, egne enhetstester på kjente tall.
 *
 * Dette er den ene modulen i systemet som ikke får ha overraskelser i seg.
 * Alt annet kan bygges om; hvis denne lyver, lyver hele dashboardet.
 */

export interface EconomicsInput {
  /** Alle kostnadsbeløp i NOK, ett per cost_event. */
  costsNok: Decimal.Value[];
  /** Alle inntektsbeløp i NOK, ett per revenue_event. */
  revenuesNok: Decimal.Value[];
  /** Visninger, summert over kanalene innlegget ble publisert til. */
  views: number;
}

export interface Economics {
  totalCostNok: Decimal;
  totalRevenueNok: Decimal;
  views: number;
  marginNok: Decimal;
  /**
   * Inntekt per 1 000 visninger.
   *
   * `null` ved null visninger - ikke 0. Forskjellen er viktig: 0 betyr
   * «målt, og den tjente ingenting», null betyr «ikke målbart ennå».
   * Slår vi dem sammen, drar umålte innlegg snittet ned og Portfolio-agenten
   * kutter kanaler på grunnlag av data som ikke finnes.
   */
  rpmNok: Decimal | null;
  /** Margin i prosent av kostnad. `null` ved null kostnad. */
  marginPct: Decimal | null;
}

export function computeEconomics(input: EconomicsInput): Economics {
  if (!Number.isFinite(input.views) || input.views < 0) {
    throw new Error(`Ugyldig visningstall: ${input.views}`);
  }

  const totalCostNok = quantize(sum(input.costsNok));
  const totalRevenueNok = quantize(sum(input.revenuesNok));
  const marginNok = quantize(totalRevenueNok.minus(totalCostNok));

  const rpmNok =
    input.views > 0 ? quantize(totalRevenueNok.div(input.views).times(1000)) : null;

  const marginPct = totalCostNok.isZero()
    ? null
    : marginNok.div(totalCostNok).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);

  return { totalCostNok, totalRevenueNok, views: input.views, marginNok, rpmNok, marginPct };
}

// ---------------------------------------------------------------------------
// Pro rata-fordeling
// ---------------------------------------------------------------------------

export interface ProRataItem {
  contentItemId: string;
  views: number;
}

export interface ProRataResult {
  allocations: { contentItemId: string; amountNok: Decimal }[];
  /**
   * Beløp som ikke kunne attribueres til noe innlegg.
   *
   * Er alltid 0 når det finnes visninger å fordele på. Er lik hele beløpet
   * når ingen av innleggene har visninger - da finnes det ikke noe grunnlag
   * å fordele etter, og å dele likt ville vært å finne på data.
   */
  residualNok: Decimal;
}

/**
 * Fordeler en kanals periodeinntekt på innlegg etter visningsandel.
 *
 * Brukes når plattformen bare oppgir inntekt for kanalen som helhet, ikke per
 * video. Se ARCHITECTURE.md 3.4.
 *
 * Summen av `allocations` pluss `residualNok` er **nøyaktig** lik
 * `channelRevenueNok`. Avrundingsresten fordeles etter største brøkdel
 * (largest remainder), slik at det ikke oppstår eller forsvinner kroner i
 * fordelingen. Uten det ville regnskapet sprekke med noen øre per periode,
 * hver periode, for alltid.
 */
export function proRataAllocate(
  channelRevenueNok: Decimal.Value,
  items: ProRataItem[],
): ProRataResult {
  const total = quantize(channelRevenueNok);

  for (const item of items) {
    if (!Number.isFinite(item.views) || item.views < 0) {
      throw new Error(`Ugyldig visningstall for ${item.contentItemId}: ${item.views}`);
    }
  }

  const totalViews = items.reduce((acc, i) => acc + i.views, 0);

  if (items.length === 0 || totalViews === 0) {
    return { allocations: items.map((i) => ({ contentItemId: i.contentItemId, amountNok: ZERO })), residualNok: total };
  }

  // Eksakt andel, deretter avrunding ned, deretter fordeling av resten.
  const exact = items.map((item) => {
    const share = total.times(item.views).div(totalViews);
    const floored = share.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_DOWN);
    return { contentItemId: item.contentItemId, floored, remainder: share.minus(floored) };
  });

  const distributed = sum(exact.map((e) => e.floored));
  const smallestUnit = new Decimal(10).pow(-MONEY_SCALE);
  let unitsLeft = total.minus(distributed).div(smallestUnit).round().toNumber();

  // Størst brøkdel får den første ekstra enheten. Ved likhet vinner den med
  // flest visninger, så fordelingen er deterministisk og reproduserbar.
  const order = [...exact].sort((a, b) => {
    const byRemainder = b.remainder.comparedTo(a.remainder);
    if (byRemainder !== 0) return byRemainder;
    const av = items.find((i) => i.contentItemId === a.contentItemId)?.views ?? 0;
    const bv = items.find((i) => i.contentItemId === b.contentItemId)?.views ?? 0;
    if (bv !== av) return bv - av;
    return a.contentItemId.localeCompare(b.contentItemId);
  });

  const bonus = new Map<string, Decimal>();
  for (let idx = 0; unitsLeft > 0 && order.length > 0; idx++, unitsLeft--) {
    const target = order[idx % order.length]!;
    bonus.set(target.contentItemId, (bonus.get(target.contentItemId) ?? ZERO).plus(smallestUnit));
  }

  return {
    allocations: exact.map((e) => ({
      contentItemId: e.contentItemId,
      amountNok: quantize(e.floored.plus(bonus.get(e.contentItemId) ?? ZERO)),
    })),
    residualNok: ZERO,
  };
}

// ---------------------------------------------------------------------------
// Vei til monetiseringsterskel
// ---------------------------------------------------------------------------

export interface ThresholdProgress {
  required: number;
  current: number;
  remaining: number;
  pctComplete: number;
  /** Estimert dato for å nå terskelen, gitt målt fremdriftstakt. */
  projectedReachDate: Date | null;
}

/**
 * Fremdrift mot en monetiseringsterskel, slik dashboardet viser den.
 *
 * `projectedReachDate` er `null` når takten er null eller negativ. Det er
 * riktig svar, ikke en feil: en kanal som ikke vokser når aldri terskelen,
 * og et oppdiktet estimat ville skjult nettopp det.
 */
export function thresholdProgress(
  required: number,
  current: number,
  ratePerDay: number,
  now: Date = new Date(),
): ThresholdProgress {
  if (required <= 0) throw new Error(`Terskel må være positiv, fikk ${required}`);

  const remaining = Math.max(0, required - current);
  const pctComplete = Math.min(100, (current / required) * 100);

  let projectedReachDate: Date | null = null;
  if (remaining === 0) {
    projectedReachDate = now;
  } else if (ratePerDay > 0) {
    const days = Math.ceil(remaining / ratePerDay);
    projectedReachDate = new Date(now.getTime() + days * 86_400_000);
  }

  return { required, current, remaining, pctComplete, projectedReachDate };
}
