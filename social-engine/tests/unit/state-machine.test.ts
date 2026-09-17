import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertTransition,
  canTransition,
  IllegalTransitionError,
  MAIN_STATES,
  MAX_REVISION_ROUNDS,
  STATES,
  TransitionGuardError,
  type ContentState,
} from "@se/core";

describe("tilstandsmaskinen", () => {
  it("tillater hele hovedløpet fra planned til settled", () => {
    for (let i = 0; i < MAIN_STATES.length - 1; i++) {
      const from = MAIN_STATES[i]!;
      const to = MAIN_STATES[i + 1]!;
      expect(canTransition(from, to), `${from} -> ${to} skulle vært lovlig`).toBe(true);
    }
  });

  it("avviser hopp forbi steg i løpet", () => {
    expect(canTransition("planned", "published")).toBe(false);
    expect(canTransition("drafted", "settled")).toBe(false);
    expect(() => assertTransition("planned", "published")).toThrow(IllegalTransitionError);
  });

  it("har cancelled som terminal tilstand", () => {
    expect(allowedTransitions("cancelled")).toHaveLength(0);
    for (const state of STATES) {
      expect(canTransition("cancelled", state)).toBe(false);
    }
  });

  it("lar sen inntekt åpne et oppgjort innlegg på nytt", () => {
    // Plattformene rapporterer med etterslep. Dette er normaldrift.
    expect(canTransition("settled", "measured")).toBe(true);
  });

  it("lar et målt innlegg måles på nytt", () => {
    expect(canTransition("measured", "measured")).toBe(true);
  });
});

describe("vakten mot settled", () => {
  const ctx = (over: Record<string, unknown> = {}) => ({ hasCost: true, hasRevenue: true, ...over });

  it("slipper gjennom når både kostnad og inntekt er ført", () => {
    expect(() => assertTransition("measured", "settled", ctx())).not.toThrow();
  });

  it("nekter uten registrert kostnad", () => {
    // Oppdragets «ingen innlegg uten kostnadstall», håndhevet i kode.
    expect(() => assertTransition("measured", "settled", ctx({ hasCost: false }))).toThrow(
      /uten registrert kostnad/,
    );
  });

  it("nekter uten registrert inntekt", () => {
    expect(() => assertTransition("measured", "settled", ctx({ hasRevenue: false }))).toThrow(
      TransitionGuardError,
    );
  });
});

describe("revisjonsgrensen", () => {
  it("tillater revisjon innenfor grensen", () => {
    expect(() => assertTransition("visual_ready", "revising", { revisionRounds: 0 })).not.toThrow();
    expect(() => assertTransition("visual_ready", "revising", { revisionRounds: 1 })).not.toThrow();
  });

  it("stopper ved maks antall runder", () => {
    expect(() =>
      assertTransition("visual_ready", "revising", { revisionRounds: MAX_REVISION_ROUNDS }),
    ).toThrow(/revisjonsrunder/);
  });
});

describe("sideutganger", () => {
  it("lar eier overstyre en blokkering tilbake til skriving", () => {
    expect(canTransition("blocked", "drafted")).toBe(true);
  });

  it("lar en feilet publisering prøves igjen", () => {
    expect(canTransition("failed", "scheduled")).toBe(true);
  });

  it("gir alle tilstander utenom cancelled minst én vei videre", () => {
    const dead = (STATES as readonly ContentState[])
      .filter((s) => s !== "cancelled")
      .filter((s) => allowedTransitions(s).length === 0);
    expect(dead, "tilstander uten utgang ville latt innlegg henge for alltid").toEqual([]);
  });
});
