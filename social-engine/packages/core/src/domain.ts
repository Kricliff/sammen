import { z } from "zod";

export const CHANNELS = ["youtube", "tiktok", "instagram", "facebook", "linkedin"] as const;
export type Channel = (typeof CHANNELS)[number];
export const channelSchema = z.enum(CHANNELS);

export const FORMATS = ["short_video", "long_video", "image_post", "text_post"] as const;
export type Format = (typeof FORMATS)[number];
export const formatSchema = z.enum(FORMATS);

/**
 * Publiseringsspråk. Settes per kanal i channels.yaml, ikke globalt.
 * Begrunnelsen står i ARCHITECTURE.md 9.4: engelsk gir 10-20x RPM og et
 * globalt publikum, men coachingen selges i Norge, på norsk.
 */
export const LANGUAGES = ["en", "no"] as const;
export type Language = (typeof LANGUAGES)[number];
export const languageSchema = z.enum(LANGUAGES);

/** Hovedløpet, i rekkefølge. */
export const MAIN_STATES = [
  "planned",
  "researched",
  "drafted",
  "visual_ready",
  "qa_passed",
  "awaiting_approval",
  "scheduled",
  "published",
  "measured",
  "settled",
] as const;

/** Sideutganger. Et innlegg kan havne her fra flere steder i hovedløpet. */
export const SIDE_STATES = ["needs_review", "revising", "blocked", "failed", "cancelled"] as const;

export const STATES = [...MAIN_STATES, ...SIDE_STATES] as const;
export type ContentState = (typeof STATES)[number];
export const stateSchema = z.enum(STATES);

export const COST_TYPES = [
  "tokens",
  "media_image",
  "media_video",
  "tts",
  "storage",
  "infra",
  "api_call",
] as const;
export type CostType = (typeof COST_TYPES)[number];
export const costTypeSchema = z.enum(COST_TYPES);

/**
 * `lead` er tillegget fra UNIT_ECONOMICS.md 6.3: en attribuert henvendelse
 * til Clifford Coaching. Uten den ser Portfolio-agenten LinkedIn som en
 * nullinntektskanal og kutter den — feil beslutning på riktig data.
 */
export const REVENUE_TYPES = ["ad", "sponsor", "lead"] as const;
export type RevenueType = (typeof REVENUE_TYPES)[number];
export const revenueTypeSchema = z.enum(REVENUE_TYPES);

export const ATTRIBUTIONS = ["direct", "pro_rata"] as const;
export type Attribution = (typeof ATTRIBUTIONS)[number];
export const attributionSchema = z.enum(ATTRIBUTIONS);

export const AGENTS = [
  "strategist",
  "research",
  "copywriter",
  "visual",
  "quality",
  "publisher",
  "engagement",
  "analyst",
  "revenue",
  "cost_controller",
  "portfolio",
  "orchestrator",
  "owner",
] as const;
export type AgentName = (typeof AGENTS)[number];
export const agentSchema = z.enum(AGENTS);
