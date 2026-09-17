import Decimal from "decimal.js";

/**
 * Penger håndteres aldri som float. Alt regnes i Decimal og lagres som
 * numeric(14,4) i databasen, altså fire desimaler (1/10 000 NOK).
 *
 * Grunnen til at dette er en egen modul: marginberegningen er systemets
 * hele eksistensberettigelse. Går den i float, akkumulerer den feil over
 * tusenvis av kostnadshendelser og vi oppdager det aldri.
 */

/** Antall desimaler vi lagrer penger med. Speiler numeric(14,4) i DB. */
export const MONEY_SCALE = 4;

/** Et pengebeløp slik det krysser modul- og databasegrenser. */
export type MoneyString = string;

export function money(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export const ZERO = new Decimal(0);

/** Rund av til lagringspresisjon. Halv-opp, som i regnskap. */
export function quantize(value: Decimal.Value): Decimal {
  return new Decimal(value).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

/** Serialiser til den formen databasen og API-et ser. */
export function toMoneyString(value: Decimal.Value): MoneyString {
  return quantize(value).toFixed(MONEY_SCALE);
}

export function sum(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), ZERO);
}

/**
 * Konverter til NOK med en eksplisitt kurs.
 *
 * Kursen er alltid et argument, aldri en global. En kostnad ført i mars og
 * en inntekt ført i september skal bruke hver sin kurs, og den kursen skal
 * lagres på hendelsen slik at regnskapet kan reproduseres.
 */
export function toNok(amount: Decimal.Value, fxRate: Decimal.Value): Decimal {
  const rate = new Decimal(fxRate);
  if (rate.lte(0)) throw new Error(`Ugyldig valutakurs: ${rate.toString()}`);
  return quantize(new Decimal(amount).times(rate));
}
