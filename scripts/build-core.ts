import { Database } from "bun:sqlite";
import { rm } from "node:fs/promises";
import { applyPragmas } from "../src/db/pragmas";
import { ensureSchema } from "../src/db/schema";
import { seedCoreLexicon } from "../src/db/seed";
import { ensureParentDir } from "../src/util/fs";

const output = Bun.argv[2] ?? "assets/core.db";

await ensureParentDir(output);
await rm(output, { force: true });

const db = new Database(output, { create: true });
try {
  applyPragmas(db);
  ensureSchema(db);
  seedCoreLexicon(db);
  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  db.exec("PRAGMA journal_mode = DELETE;");
  db.exec("VACUUM;");
} finally {
  db.close();
}

console.log(`Built core dataset: ${output}`);
