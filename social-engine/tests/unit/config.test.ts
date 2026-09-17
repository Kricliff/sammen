import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { assertConsistent, loadConfig, type AppConfig } from "@se/core";

const CONFIG_DIR = join(process.cwd(), "config");

describe("konfigurasjon", () => {
  it("laster og validerer de faktiske konfigfilene", () => {
    const config = loadConfig(CONFIG_DIR);
    expect(config.strategy.themes.length).toBeGreaterThan(0);
    expect(config.channels.channels.youtube?.language).toBe("en");
    expect(config.channels.channels.linkedin?.language).toBe("no");
  });

  it("holder LinkedIn på norsk og videokanalene på engelsk", () => {
    // Språksplitten fra ARCHITECTURE.md 9.4. Snus denne ved et uhell,
    // publiserer vi norsk tekst til et globalt publikum, eller engelsk
    // tekst til norske beslutningstakere som skal kjøpe coaching.
    const { channels } = loadConfig(CONFIG_DIR).channels;
    expect(channels.linkedin?.language).toBe("no");
    for (const name of ["youtube", "instagram", "facebook", "tiktok"] as const) {
      expect(channels[name]?.language, `${name} skal publisere på engelsk`).toBe("en");
    }
  });

  it("har alle kanaler på manuell godkjenning eller av", () => {
    // Beslutningen i ARCHITECTURE.md 9.1. Havner en kanal på `auto` ved et
    // uhell, publiserer systemet uten at noen har sett innlegget.
    const { channels } = loadConfig(CONFIG_DIR).channels;
    for (const [name, channel] of Object.entries(channels)) {
      expect(["manual", "off"], `${name} står på ${channel.autopublishMode}`).toContain(
        channel.autopublishMode,
      );
    }
  });

  it("holder rekrutteringsfaglig innhold blokkert til arbeidsavtalen er sjekket", () => {
    const theme = loadConfig(CONFIG_DIR).strategy.themes.find((t) => t.name === "recruitment_craft");
    expect(theme?.status).toBe("blocked");
  });

  it("har et kapasitetstak på introsamtaler", () => {
    // Den bindende ressursen: 45 minutter ubetalt per henvendelse.
    const capacity = loadConfig(CONFIG_DIR).strategy.capacity;
    expect(capacity.maxIntroCallsPerMonth).toBeGreaterThan(0);
    expect(capacity.introCallMinutes).toBe(45);
  });
});

describe("kryssvalidering", () => {
  const base = (): AppConfig => loadConfig(CONFIG_DIR);

  it("avviser en kanal som er deaktivert men fortsatt vektet", () => {
    const config = base();
    config.channels.channels.tiktok!.enabled = false;
    config.strategy.channelWeights.tiktok = 0.3;
    expect(() => assertConsistent(config)).toThrow(/deaktivert/);
  });

  it("avviser at alle temaer er blokkert", () => {
    const config = base();
    for (const theme of config.strategy.themes) theme.status = "blocked";
    expect(() => assertConsistent(config)).toThrow(/Ingen temaer/);
  });

  it("avviser budsjettak som aldri kan bli bindende", () => {
    // Et dagstak x 7 over ukestaket betyr at ukestaket er dekorasjon.
    const config = base();
    config.budgets.dailyCapNok = 1000;
    expect(() => assertConsistent(config)).toThrow(/Ukestaket ville aldri blitt bindende/);
  });

  it("godtar de faktiske filene slik de står", () => {
    expect(() => assertConsistent(base())).not.toThrow();
  });
});
