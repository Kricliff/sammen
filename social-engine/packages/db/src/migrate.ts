import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDb } from "./client.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(url: string): Promise<void> {
  const { db, close } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: join(here, "..", "migrations") });
  } finally {
    await close();
  }
}

// Kjørbar direkte: npm run db:migrate
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL mangler.");
    process.exit(1);
  }
  await runMigrations(url);
  console.log("Migreringer kjørt.");
}
