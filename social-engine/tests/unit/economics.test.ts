import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  canSpend,
  evaluateBudget,
  imageCostUsd,
  periodBounds,
  tokenCostUsd,
  videoCostUsd,
} from "@se/economics";

describe("tokenCostUsd", () => {
  it("regner Opus 5 uten caching", () => {
    // 12 000 inn a $5/MTok = $0,06. 3 000 ut a $25/MTok = $0,075. Sum $0,135.
    const cost = tokenCostUsd({ model: "claude-opus-5", inputTokens: 12_000, outputTokens: 3_000 });
    expect(cost.toFixed(6)).toBe("0.135000");
  });

  it("priser cachede tokens til en tidel", () => {
    // 4 000 ucachet a $5/MTok = $0,020
    // 8 000 cachet a $0,50/MTok = $0,004
    // 3 000 ut a $25/MTok = $0,075  => $0,099
    const cost = tokenCostUsd({
      model: "claude-opus-5",
      inputTokens: 12_000,
      outputTokens: 3_000,
      cachedTokens: 8_000,
    });
    expect(cost.toFixed(6)).toBe("0.099000");
  });

  it("regner Sonnet 5 billigere enn Opus 5 på samme forbruk", () => {
    const usage = { inputTokens: 25_000, outputTokens: 2_000 };
    const opus = tokenCostUsd({ model: "claude-opus-5", ...usage });
    const sonnet = tokenCostUsd({ model: "claude-sonnet-5", ...usage });
    expect(sonnet.lt(opus)).toBe(true);
    expect(sonnet.toFixed(6)).toBe("0.070000");
  });

  it("avviser flere cachede tokens enn input-tokens", () => {
    expect(() =>
      tokenCostUsd({ model: "claude-opus-5", inputTokens: 100, outputTokens: 10, cachedTokens: 200 }),
    ).toThrow(/cachede tokens/);
  });

  it("avviser ukjent modell i stedet for å gjette en pris", () => {
    expect(() => tokenCostUsd({ model: "claude-fantasy-9", inputTokens: 1, outputTokens: 1 })).toThrow(
      /Ukjent modell/,
    );
  });
});

describe("mediekostnad", () => {
  it("regner en 32-sekunders Short på Veo 3.1 Lite 720p", () => {
    // 4 klipp a 8 sek = 32 sek a $0,03 = $0,96
    expect(videoCostUsd("veo-3.1-lite-720p", 32).toFixed(4)).toBe("0.9600");
  });

  it("regner 1080p dyrere enn 720p", () => {
    expect(videoCostUsd("veo-3.1-lite-1080p", 32).toFixed(4)).toBe("1.6000");
  });

  it("avviser ikke-positiv varighet", () => {
    expect(() => videoCostUsd("veo-3.1-lite-720p", 0)).toThrow(/positiv/);
  });

  it("regner bildekostnad", () => {
    expect(imageCostUsd("gemini-3.1-flash-image", 2).toFixed(4)).toBe("0.0700");
  });
});

describe("budsjettvakt", () => {
  it("varsler ved 80 prosent", () => {
    const state = evaluateBudget("month", 2000, 1600, 0.8);
    expect(state.status).toBe("warning");
    expect(state.remainingNok.toFixed(2)).toBe("400.00");
  });

  it("stopper ved 100 prosent", () => {
    const state = evaluateBudget("month", 2000, 2000, 0.8);
    expect(state.status).toBe("exceeded");
    expect(state.remainingNok.toFixed(2)).toBe("0.00");
  });

  it("lar den strengeste perioden vinne", () => {
    // Måneden har god plass, men dagstaket er nesten brukt opp.
    const decision = canSpend(
      [
        evaluateBudget("day", 70, 65, 0.8),
        evaluateBudget("week", 500, 100, 0.8),
        evaluateBudget("month", 2000, 400, 0.8),
      ],
      new Decimal("15.60"),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.blockingPeriod).toBe("day");
  });

  it("slipper gjennom en kostnad som er innenfor alle tak", () => {
    const decision = canSpend(
      [
        evaluateBudget("day", 70, 10, 0.8),
        evaluateBudget("week", 500, 100, 0.8),
        evaluateBudget("month", 2000, 400, 0.8),
      ],
      new Decimal("15.60"),
    );
    expect(decision.allowed).toBe(true);
  });

  it("nekter alt når taket allerede er sprengt", () => {
    const decision = canSpend([evaluateBudget("day", 70, 71, 0.8)], new Decimal("0.01"));
    expect(decision.allowed).toBe(false);
  });
});

describe("periodegrenser", () => {
  it("lar uken starte på mandag", () => {
    // 2026-09-17 er en torsdag; uken skal starte mandag 14.
    const { from, to } = periodBounds("week", new Date("2026-09-17T12:00:00Z"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-09-14");
    expect(to.toISOString().slice(0, 10)).toBe("2026-09-21");
  });

  it("dekker hele måneden", () => {
    const { from, to } = periodBounds("month", new Date("2026-09-17T12:00:00Z"));
    expect(from.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(to.toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});
