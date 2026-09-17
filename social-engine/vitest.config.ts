import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integrasjonstestene deler én database. Kjør filene sekvensielt
    // så migrering og opprydding ikke tråkker på hverandre.
    fileParallelism: false,
    include: ["tests/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
