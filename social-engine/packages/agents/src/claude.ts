import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { TokenUsage } from "@se/economics";

/**
 * Claude-klienten agentene går gjennom.
 *
 * Grensesnittet finnes for at agentene skal kunne testes med faste
 * testinput uten å kalle API-et og uten å koste penger. Enhetstestene
 * bruker `FakeClaudeClient`; kun `npm run smoke` treffer ekte API.
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface SystemBlock {
  text: string;
  /**
   * Skal denne blokka caches?
   *
   * Cachen er et prefiksmatch: alt etter siste cache-punkt må være likt
   * mellom kall for å treffe. Derfor markeres kun det stabile - systemprompt
   * og voice-fila, som er identiske for hvert eneste innlegg.
   */
  cache?: boolean;
}

export interface StructuredRequest<T> {
  model: string;
  system: SystemBlock[];
  user: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  effort?: Effort;
  maxTokens?: number;
}

export interface ClaudeResult<T> {
  output: T;
  usage: TokenUsage;
}

export interface WebResearchRequest {
  model: string;
  system: SystemBlock[];
  user: string;
  maxUses?: number;
  allowedDomains?: string[];
  maxTokens?: number;
}

export interface ClaudeClient {
  /** Ett kall som returnerer data validert mot et Zod-skjema. */
  structured<T>(request: StructuredRequest<T>): Promise<ClaudeResult<T>>;
  /** Ett kall med websøk. Returnerer fritekst; struktureringen skjer etterpå. */
  research(request: WebResearchRequest): Promise<ClaudeResult<string>>;
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

/**
 * Oversetter SDK-ets typede feil til noe køen kan handle på.
 *
 * Skillet som betyr noe er `retryable`: BullMQ skal prøve igjen ved 429 og
 * 5xx, men ikke ved 400 - en ugyldig forespørsel blir ikke gyldig av å
 * sendes fem ganger, den brenner bare budsjett.
 */
function toClaudeError(error: unknown): ClaudeError {
  if (error instanceof Anthropic.RateLimitError) {
    return new ClaudeError("Rate limit fra Anthropic.", true, error);
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new ClaudeError("Ugyldig API-nøkkel. Sjekk ANTHROPIC_API_KEY.", false, error);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new ClaudeError(`Ugyldig forespørsel: ${error.message}`, false, error);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ClaudeError("Fikk ikke kontakt med Anthropic.", true, error);
  }
  if (error instanceof Anthropic.APIError) {
    return new ClaudeError(`API-feil ${error.status}: ${error.message}`, (error.status ?? 500) >= 500, error);
  }
  return new ClaudeError(`Ukjent feil: ${String(error)}`, false, error);
}

function buildSystem(blocks: SystemBlock[]): Anthropic.TextBlockParam[] {
  return blocks.map((block) => ({
    type: "text" as const,
    text: block.text,
    ...(block.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

function extractUsage(model: string, usage: Anthropic.Usage): TokenUsage {
  const cached = usage.cache_read_input_tokens ?? 0;
  return {
    model,
    // input_tokens teller kun det ucachede. Cost-modellen vår forventer
    // totalen, med cachet antall som eget felt - se tokenCostUsd.
    inputTokens: usage.input_tokens + cached,
    outputTokens: usage.output_tokens,
    cachedTokens: cached,
  };
}

export class AnthropicClaudeClient implements ClaudeClient {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = apiKey ? new Anthropic({ apiKey }) : new Anthropic();
  }

  async structured<T>(request: StructuredRequest<T>): Promise<ClaudeResult<T>> {
    try {
      const response = await this.client.messages.parse({
        model: request.model,
        max_tokens: request.maxTokens ?? 16_000,
        system: buildSystem(request.system),
        messages: [{ role: "user", content: request.user }],
        output_config: {
          effort: request.effort ?? "medium",
          format: zodOutputFormat(request.schema as never),
        },
      });

      if (response.stop_reason === "refusal") {
        throw new ClaudeError(
          `Modellen avslo forespørselen (${response.stop_details?.category ?? "ukjent"}).`,
          false,
        );
      }
      if (response.stop_reason === "max_tokens") {
        throw new ClaudeError("Svaret ble kuttet på max_tokens. Øk grensen.", true);
      }
      if (response.parsed_output == null) {
        throw new ClaudeError("Modellen returnerte noe som ikke matchet skjemaet.", true);
      }

      return {
        output: response.parsed_output as T,
        usage: extractUsage(request.model, response.usage),
      };
    } catch (error) {
      if (error instanceof ClaudeError) throw error;
      throw toClaudeError(error);
    }
  }

  async research(request: WebResearchRequest): Promise<ClaudeResult<string>> {
    try {
      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens ?? 16_000,
        system: buildSystem(request.system),
        messages: [{ role: "user", content: request.user }],
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: request.maxUses ?? 5,
            ...(request.allowedDomains ? { allowed_domains: request.allowedDomains } : {}),
          },
        ],
      });

      if (response.stop_reason === "refusal") {
        throw new ClaudeError(
          `Modellen avslo research-forespørselen (${response.stop_details?.category ?? "ukjent"}).`,
          false,
        );
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      if (!text.trim()) {
        throw new ClaudeError("Research returnerte ingen tekst.", true);
      }

      return { output: text, usage: extractUsage(request.model, response.usage) };
    } catch (error) {
      if (error instanceof ClaudeError) throw error;
      throw toClaudeError(error);
    }
  }
}

/**
 * Testklient. Returnerer forhåndsdefinerte svar og teller kall.
 *
 * Enhetstestene bruker denne. Det er hele poenget med at agentene tar
 * klienten inn som argument: en testsuite som koster penger blir ikke kjørt.
 */
export class FakeClaudeClient implements ClaudeClient {
  readonly calls: { kind: "structured" | "research"; model: string; system: string; user: string }[] = [];

  constructor(
    private readonly responses: {
      structured?: unknown[];
      research?: string[];
    } = {},
  ) {}

  private structuredIndex = 0;
  private researchIndex = 0;

  async structured<T>(request: StructuredRequest<T>): Promise<ClaudeResult<T>> {
    this.calls.push({
      kind: "structured",
      model: request.model,
      system: request.system.map((b) => b.text).join("\n"),
      user: request.user,
    });

    const queued = this.responses.structured?.[this.structuredIndex++];
    if (queued === undefined) {
      throw new Error(
        `FakeClaudeClient har ikke flere structured-svar (kall nr. ${this.structuredIndex}).`,
      );
    }

    // Valideres mot det ekte skjemaet, så en test ikke kan lykkes med
    // testdata den ekte agenten ville avvist.
    const parsed = request.schema.safeParse(queued);
    if (!parsed.success) {
      throw new Error(
        `Testsvaret matcher ikke skjemaet:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`,
      );
    }

    return {
      output: parsed.data,
      usage: { model: request.model, inputTokens: 12_000, outputTokens: 2_000, cachedTokens: 8_000 },
    };
  }

  async research(request: WebResearchRequest): Promise<ClaudeResult<string>> {
    this.calls.push({
      kind: "research",
      model: request.model,
      system: request.system.map((b) => b.text).join("\n"),
      user: request.user,
    });

    const queued = this.responses.research?.[this.researchIndex++];
    if (queued === undefined) {
      throw new Error(`FakeClaudeClient har ikke flere research-svar (kall nr. ${this.researchIndex}).`);
    }

    return {
      output: queued,
      usage: { model: request.model, inputTokens: 25_000, outputTokens: 2_000, cachedTokens: 0 },
    };
  }
}
