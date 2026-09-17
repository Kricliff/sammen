import { z } from "zod";
import { channelSchema, formatSchema, languageSchema } from "./domain.js";

/**
 * Input/output-kontraktene mellom agentene.
 *
 * Hver agent validerer sin egen output mot skjemaet sitt før den skriver til
 * databasen. En agent som returnerer noe utenfor kontrakten er en feil, ikke
 * noe orchestratoren skal forsøke å tolke.
 */

/** Strategist -> alle. Én brief per planlagt innlegg. */
export const briefSchema = z.object({
  theme: z.string().min(1),
  angle: z.string().min(1),
  channel: channelSchema,
  format: formatSchema,
  language: languageSchema,
  targetRpmNok: z.string(),
  costCapNok: z.string(),
  scheduledFor: z.coerce.date(),
  rationale: z.string().min(1),
});
export type Brief = z.infer<typeof briefSchema>;

/**
 * Research -> Copywriter.
 *
 * `sources` er ikke valgfri. Regelen fra oppdraget er at ingen påstand går
 * videre uten kilde; mangler kilden, settes innlegget til `needs_review`.
 */
export const researchSourceSchema = z.object({
  claim: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
  retrievedAt: z.coerce.date(),
});
export type ResearchSource = z.infer<typeof researchSourceSchema>;

export const researchOutputSchema = z.object({
  sources: z.array(researchSourceSchema),
  newsHooks: z.array(z.string()).default([]),
  /** Påstander agenten ikke fant dekning for. Ikke-tom liste => needs_review. */
  unsourcedClaims: z.array(z.string()).default([]),
});
export type ResearchOutput = z.infer<typeof researchOutputSchema>;

/**
 * Copywriter -> Visual og Quality. Alltid to varianter for A/B-testing.
 *
 * Teksten skrives på `language` fra briefen, fra start. Aldri skrevet på ett
 * språk og oversatt - se ARCHITECTURE.md 9.4.
 */
export const copyVariantSchema = z.object({
  variant: z.union([z.literal(1), z.literal(2)]),
  hook: z.string().min(1),
  script: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
});

export const copyOutputSchema = z.object({
  language: languageSchema,
  variants: z.tuple([copyVariantSchema, copyVariantSchema]),
});
export type CopyOutput = z.infer<typeof copyOutputSchema>;

/** Visual -> Quality. */
export const visualOutputSchema = z.object({
  mediaUrls: z.array(z.string()).min(1),
  /** Hentet fra /assets i stedet for generert. Kostnad ~0. */
  reusedFromLibrary: z.boolean(),
  aspectRatio: z.enum(["9:16", "4:5", "1:1", "16:9"]),
  estimatedCostNok: z.string(),
});
export type VisualOutput = z.infer<typeof visualOutputSchema>;

/**
 * Quality -> Orchestrator. Agenten med vetorett.
 *
 * Hver sjekk rapporteres for seg, med begrunnelse, slik at en avvisning kan
 * spores tilbake til nøyaktig hvilken regel som slo ut.
 */
export const QA_CHECKS = [
  "language_native",       // riktig språk for kanalen, på morsmålsnivå
  "facts_sourced",         // hver påstand dekket av research_sources
  "brand_tone",
  "gdpr",                  // ingen navngitte personer uten samtykkeflagg
  "no_health_claims",      // coaching-nivå, ikke behandling
  "monetization_safe",     // ikke demonetiseringsutsatt
  "ad_disclosure",         // merking etter markedsføringsloven
  "plagiarism",            // mot egne innlegg siste 90 dager
  "theme_allowed",         // mot allowed-lista i strategy.yaml
  "channel_rules",         // tegngrenser og formatkrav
] as const;
export type QaCheck = (typeof QA_CHECKS)[number];

export const qaCheckResultSchema = z.object({
  check: z.enum(QA_CHECKS),
  passed: z.boolean(),
  reasoning: z.string().min(1),
});

export const qaVerdictSchema = z.object({
  verdict: z.enum(["approved", "revise", "blocked"]),
  checks: z.array(qaCheckResultSchema).min(1),
  reasoning: z.string().min(1),
});
export type QaVerdict = z.infer<typeof qaVerdictSchema>;

/** Publisher -> Orchestrator. */
export const publishResultSchema = z.object({
  externalPostId: z.string().min(1),
  publishedAt: z.coerce.date(),
  dryRun: z.boolean(),
});
export type PublishResult = z.infer<typeof publishResultSchema>;
