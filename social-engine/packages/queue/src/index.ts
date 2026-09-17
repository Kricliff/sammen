import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import IORedis from "ioredis";
import type { Brief, Channel } from "@se/core";

/**
 * Køer over BullMQ og Redis. Ikke naken cron - vi trenger retry,
 * dead-letter og innsyn i hva som faktisk står og venter.
 */

export const QUEUE_NAMES = [
  "strategy",
  "research",
  "copywrite",
  "visual",
  "qa",
  "publish",
  "metrics",
  "revenue",
  "economics",
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export interface QueueSettings {
  concurrency: number;
  attempts: number;
  backoffMs: number;
}

/**
 * Innstillinger per kø.
 *
 * `visual` har lavest concurrency med vilje: det er den dyreste køen, og
 * parallell mediegenerering er den raskeste måten å brenne gjennom et
 * dagsbudsjett før budsjettvakten rekker å se det.
 *
 * `publish` kjører én om gangen per kanal for å respektere rate limits.
 */
export const QUEUE_SETTINGS: Record<QueueName, QueueSettings> = {
  strategy: { concurrency: 1, attempts: 2, backoffMs: 60_000 },
  research: { concurrency: 3, attempts: 3, backoffMs: 5_000 },
  copywrite: { concurrency: 3, attempts: 2, backoffMs: 5_000 },
  visual: { concurrency: 2, attempts: 2, backoffMs: 10_000 },
  qa: { concurrency: 4, attempts: 2, backoffMs: 5_000 },
  publish: { concurrency: 1, attempts: 5, backoffMs: 30_000 },
  metrics: { concurrency: 2, attempts: 3, backoffMs: 60_000 },
  revenue: { concurrency: 1, attempts: 3, backoffMs: 300_000 },
  economics: { concurrency: 1, attempts: 2, backoffMs: 60_000 },
};

export interface JobPayloads {
  strategy: { weekStart: string };
  research: { contentItemId: string; brief: Brief };
  copywrite: { contentItemId: string; brief: Brief };
  visual: { contentItemId: string; brief: Brief };
  qa: { contentItemId: string; brief: Brief };
  publish: { contentItemId: string; channel: Channel };
  metrics: { contentItemId: string; channel: Channel };
  revenue: { channel: Channel; periodStart: string };
  economics: { scope: "daily" | "weekly" };
}

export function createConnection(url: string): IORedis {
  // maxRetriesPerRequest: null er påkrevd av BullMQ for blokkerende kall.
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function defaultJobOptions(name: QueueName): JobsOptions {
  const settings = QUEUE_SETTINGS[name];
  return {
    attempts: settings.attempts,
    backoff: { type: "exponential", delay: settings.backoffMs },
    // Beholder feilede jobber så de kan inspiseres. En jobb som forsvinner
    // i stillhet er verre enn en som står rødt i dashboardet.
    removeOnComplete: { count: 500 },
    removeOnFail: false,
  };
}

export function createQueue<N extends QueueName>(name: N, connection: IORedis): Queue<JobPayloads[N]> {
  return new Queue<JobPayloads[N]>(name, { connection, defaultJobOptions: defaultJobOptions(name) });
}

export function createWorker<N extends QueueName>(
  name: N,
  connection: IORedis,
  processor: Processor<JobPayloads[N]>,
): Worker<JobPayloads[N]> {
  return new Worker<JobPayloads[N]>(name, processor, {
    connection,
    concurrency: QUEUE_SETTINGS[name].concurrency,
  });
}

/**
 * Repeterende jobber, i Europe/Oslo.
 *
 * Tidene kommer fra oppdraget: Strategist mandag 06:00, Analyst fredag 15:00.
 */
export const REPEATABLE_JOBS: { queue: QueueName; pattern: string; tz: string }[] = [
  { queue: "strategy", pattern: "0 6 * * 1", tz: "Europe/Oslo" },
  { queue: "metrics", pattern: "0 7 * * *", tz: "Europe/Oslo" },
  { queue: "revenue", pattern: "0 8 * * *", tz: "Europe/Oslo" },
  { queue: "economics", pattern: "0 15 * * 5", tz: "Europe/Oslo" },
];
