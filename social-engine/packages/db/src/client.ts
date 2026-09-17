import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDb>["db"];

export function createDb(url: string) {
  // max: 10 er nok for én worker. BullMQ-concurrency er lav med vilje
  // (visual-køen kjører 2 parallelle jobber), så flere tilkoblinger ville
  // bare stått ubrukt og spist minne på en liten VPS.
  const sql = postgres(url, { max: 10, onnotice: () => {} });
  const db = drizzle(sql, { schema });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}
