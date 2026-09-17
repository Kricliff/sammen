import type Decimal from "decimal.js";
import type {
  AppConfig,
  Brief,
  CopyOutput,
  QaVerdict,
  ResearchOutput,
  VisualOutput,
} from "@se/core";
import type { ClaudeClient } from "./claude.js";
import type { PromptPaths } from "./prompts.js";
import type { AgentResult } from "./types.js";
import { runResearch } from "./agents/research.js";
import { runCopywriter } from "./agents/copywriter.js";
import { runVisual, type MediaProvider } from "./agents/visual.js";
import { runQuality } from "./agents/quality.js";
import { mockCopywriter, mockQuality, mockResearch, mockVisual } from "./mocks.js";

/**
 * Agentsettet orchestratoren kjører.
 *
 * Finnes som et grensesnitt slik at samme pipeline kan kjøre med mocks
 * (gratis, deterministisk, i test og dry-run) eller med ekte modellkall,
 * uten at orchestratoren vet forskjellen.
 */
export interface AgentSet {
  research(brief: Brief): Promise<AgentResult<ResearchOutput>>;
  copywriter(brief: Brief, research: ResearchOutput, learnings: string[]): Promise<AgentResult<CopyOutput>>;
  visual(brief: Brief, copy: CopyOutput, fxRate: Decimal.Value): Promise<AgentResult<VisualOutput>>;
  quality(
    brief: Brief,
    copy: CopyOutput,
    visual: VisualOutput | undefined,
    research: ResearchOutput,
    config: AppConfig,
    recentPosts: string[],
  ): Promise<AgentResult<QaVerdict>>;
}

/**
 * Fase 1-settet. Ingen modellkall, men realistiske forbrukstall.
 *
 * Tar valutakursen inn fordi mock-Visual regner mediekostnad i NOK, akkurat
 * som den ekte gjør. Et mock-sett som rapporterer i feil valuta ville gjort
 * dry-run verdiløs som beslutningsgrunnlag.
 */
export function mockAgentSet(config: AppConfig, fxRate: Decimal.Value): AgentSet {
  const ctx = { config, fxRate } as never;
  return {
    research: (brief) => mockResearch(ctx, { contentItemId: "mock", brief }),
    copywriter: (brief) => mockCopywriter(ctx, { contentItemId: "mock", brief }),
    visual: (brief) => mockVisual(ctx, { contentItemId: "mock", brief }),
    quality: (brief, copy, _visual, _research, cfg) =>
      mockQuality({ config: cfg } as never, { contentItemId: "mock", brief }, copy),
  };
}

/** Fase 2-settet. Ekte Claude-kall, med kostnadslogging fra første kall. */
export function liveAgentSet(
  claude: ClaudeClient,
  paths: PromptPaths,
  provider: MediaProvider,
): AgentSet {
  return {
    research: (brief) => runResearch(claude, paths, brief),
    copywriter: (brief, research, learnings) =>
      runCopywriter(claude, paths, brief, research, learnings),
    visual: (brief, copy, fxRate) => runVisual(claude, paths, provider, brief, copy, fxRate),
    quality: (brief, copy, visual, research, config, recentPosts) =>
      runQuality(claude, paths, { brief, copy, visual, research, config, recentPosts }),
  };
}
