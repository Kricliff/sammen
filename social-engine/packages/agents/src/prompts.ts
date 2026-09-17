import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Laster systemprompter og voice-filer fra disk.
 *
 * Filene leses ved kjøring, ikke bundles inn, slik at en prompt kan endres
 * uten redeploy. De caches i minnet per prosess - en worker som kjører i
 * dager skal ikke lese samme fil tusen ganger, men en omstart plukker opp
 * endringer.
 */

const cache = new Map<string, string>();

export type PromptName = "strategist" | "research" | "copywriter" | "visual" | "quality";

export interface PromptPaths {
  promptsDir: string;
  configDir: string;
}

function read(path: string): string {
  const cached = cache.get(path);
  if (cached !== undefined) return cached;

  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch (cause) {
    throw new Error(`Kunne ikke lese ${path}: ${(cause as Error).message}`, { cause });
  }
  if (!content.trim()) throw new Error(`${path} er tom.`);

  cache.set(path, content);
  return content;
}

export function loadSystemPrompt(paths: PromptPaths, name: PromptName): string {
  return read(join(paths.promptsDir, `${name}.md`));
}

/** Voice-fila for et språk. Engelsk og norsk er ulike stemmer, ikke oversettelser. */
export function loadVoice(paths: PromptPaths, language: "en" | "no"): string {
  return read(join(paths.configDir, `voice.${language}.md`));
}

/** Tømmer cachen. Brukes i tester og av en eventuell reload-kommando. */
export function clearPromptCache(): void {
  cache.clear();
}
