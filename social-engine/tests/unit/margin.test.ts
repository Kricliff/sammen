import { describe, expect, it } from "vitest";
import { computeEconomics, proRataAllocate, thresholdProgress, toMoneyString } from "@se/core";

/**
 * Marginberegningen er den ene modulen som ikke får ha overraskelser.
 * Tallene under er regnet for hånd, ikke hentet fra en kjøring.
 */
describe("computeEconomics", () => {
  it("regner margin, RPM og marginprosent på kjente tall", () => {
    // Scenario B fra UNIT_ECONOMICS.md 2.3: 3,16 + 8,93 + 0,93 + 2,58 = 15,60 NOK
    const result = computeEconomics({
      costsNok: ["3.16", "8.93", "0.93", "2.58"],
      revenuesNok: ["20.00"],
      views: 40_000,
    });

    expect(toMoneyString(result.totalCostNok)).toBe("15.6000");
    expect(toMoneyString(result.totalRevenueNok)).toBe("20.0000");
    expect(toMoneyString(result.marginNok)).toBe("4.4000");
    // 20 / 40 000 * 1000 = 0,50 NOK per 1 000 visninger
    expect(toMoneyString(result.rpmNok!)).toBe("0.5000");
    // 4,40 / 15,60 = 0,282051...
    expect(result.marginPct!.toFixed(6)).toBe("0.282051");
  });

  it("gir negativ margin når inntekten ikke dekker kostnaden", () => {
    const result = computeEconomics({ costsNok: ["15.60"], revenuesNok: ["2.00"], views: 4_000 });
    expect(toMoneyString(result.marginNok)).toBe("-13.6000");
    expect(result.marginPct!.toFixed(6)).toBe("-0.871795");
  });

  it("returnerer null RPM ved null visninger, ikke 0", () => {
    // Forskjellen er ikke kosmetisk: 0 betyr «målt, tjente ingenting»,
    // null betyr «ikke målbart ennå». Slår vi dem sammen, drar umålte
    // innlegg snittet ned og Portfolio-agenten kutter på data som ikke finnes.
    const result = computeEconomics({ costsNok: ["15.60"], revenuesNok: [], views: 0 });
    expect(result.rpmNok).toBeNull();
    expect(toMoneyString(result.marginNok)).toBe("-15.6000");
  });

  it("returnerer null marginprosent ved null kostnad", () => {
    const result = computeEconomics({ costsNok: [], revenuesNok: ["5.00"], views: 1_000 });
    expect(result.marginPct).toBeNull();
    expect(toMoneyString(result.marginNok)).toBe("5.0000");
  });

  it("akkumulerer mange små kostnader uten flyt-drift", () => {
    // 10 000 tokenkostnader à 0,0001 NOK. I float ville dette driftet.
    const costs = Array.from({ length: 10_000 }, () => "0.0001");
    const result = computeEconomics({ costsNok: costs, revenuesNok: [], views: 1 });
    expect(toMoneyString(result.totalCostNok)).toBe("1.0000");
  });

  it("avviser negative visningstall", () => {
    expect(() => computeEconomics({ costsNok: [], revenuesNok: [], views: -1 })).toThrow(
      /Ugyldig visningstall/,
    );
  });
});

describe("proRataAllocate", () => {
  it("fordeler etter visningsandel", () => {
    const { allocations, residualNok } = proRataAllocate("100.0000", [
      { contentItemId: "a", views: 6_000 },
      { contentItemId: "b", views: 3_000 },
      { contentItemId: "c", views: 1_000 },
    ]);

    expect(toMoneyString(allocations[0]!.amountNok)).toBe("60.0000");
    expect(toMoneyString(allocations[1]!.amountNok)).toBe("30.0000");
    expect(toMoneyString(allocations[2]!.amountNok)).toBe("10.0000");
    expect(residualNok.isZero()).toBe(true);
  });

  it("mister ikke kroner i avrunding", () => {
    // 100 delt på tre like store gir 33,3333 x 3 = 99,9999. Den siste
    // tiendedels øren må havne et sted, ellers sprekker regnskapet hver periode.
    const { allocations, residualNok } = proRataAllocate("100.0000", [
      { contentItemId: "a", views: 1 },
      { contentItemId: "b", views: 1 },
      { contentItemId: "c", views: 1 },
    ]);

    const sum = allocations.reduce((acc, a) => acc.plus(a.amountNok), allocations[0]!.amountNok.minus(allocations[0]!.amountNok));
    expect(toMoneyString(sum)).toBe("100.0000");
    expect(residualNok.isZero()).toBe(true);
  });

  it("fordeler ingenting når ingen innlegg har visninger, og melder fra om resten", () => {
    // Å dele likt her ville vært å finne på data. Beløpet føres i stedet som
    // uattribuert kanalinntekt, så kronene ikke forsvinner.
    const { allocations, residualNok } = proRataAllocate("50.0000", [
      { contentItemId: "a", views: 0 },
      { contentItemId: "b", views: 0 },
    ]);

    expect(allocations.every((a) => a.amountNok.isZero())).toBe(true);
    expect(toMoneyString(residualNok)).toBe("50.0000");
  });

  it("er deterministisk: samme input gir samme fordeling", () => {
    const items = [
      { contentItemId: "a", views: 7 },
      { contentItemId: "b", views: 7 },
      { contentItemId: "c", views: 7 },
    ];
    const first = proRataAllocate("10.0001", items).allocations.map((a) => toMoneyString(a.amountNok));
    const second = proRataAllocate("10.0001", items).allocations.map((a) => toMoneyString(a.amountNok));
    expect(first).toEqual(second);
  });
});

describe("thresholdProgress", () => {
  it("estimerer dato for å nå YouTube-terskelen ved målt takt", () => {
    const now = new Date("2026-09-17T00:00:00Z");
    // 10 mill. Shorts-visninger, 2 mill. oppnådd, 100 000 i døgnet => 80 dager
    const progress = thresholdProgress(10_000_000, 2_000_000, 100_000, now);

    expect(progress.remaining).toBe(8_000_000);
    expect(progress.pctComplete).toBeCloseTo(20);
    expect(progress.projectedReachDate?.toISOString().slice(0, 10)).toBe("2026-12-06");
  });

  it("gir ingen dato når kanalen ikke vokser", () => {
    // Riktig svar, ikke en feil: en kanal som står stille når aldri terskelen,
    // og et oppdiktet estimat ville skjult nettopp det.
    const progress = thresholdProgress(10_000_000, 2_000_000, 0);
    expect(progress.projectedReachDate).toBeNull();
  });

  it("melder terskelen som nådd når den er passert", () => {
    const progress = thresholdProgress(1_000, 1_200, 5);
    expect(progress.remaining).toBe(0);
    expect(progress.pctComplete).toBe(100);
    expect(progress.projectedReachDate).not.toBeNull();
  });
});
