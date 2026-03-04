import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import type { OxfConfig } from "../types";

interface CountRow {
  count: number;
}

interface MetaRow {
  value: string;
}

function getMeta(db: Database, key: string): string | null {
  const row = db.query<MetaRow, [string]>("SELECT value FROM meta WHERE key = ? LIMIT 1").get(key);
  return row?.value ?? null;
}

export async function runStatusCommand(config: OxfConfig): Promise<number> {
  console.log(`db: ${config.dbPath}`);
  console.log(`config: ${config.configFile}`);

  if (!existsSync(config.dbPath)) {
    console.log("dataset: missing (run a lookup or oxf sync)");
    return 0;
  }

  const db = new Database(config.dbPath);

  try {
    const countRow = db.query<CountRow, []>("SELECT COUNT(*) AS count FROM entries").get();
    const cacheRow = db.query<CountRow, []>("SELECT COUNT(*) AS count FROM online_cache").get();

    console.log(`entries: ${countRow?.count ?? 0}`);
    console.log(`dataset version: ${getMeta(db, "dataset_version") ?? "unknown"}`);
    console.log(`dataset source: ${getMeta(db, "dataset_source") ?? "unknown"}`);
    console.log(`dataset channel: ${getMeta(db, "dataset_channel") ?? "unknown"}`);
    console.log(`dataset updated at: ${getMeta(db, "dataset_updated_at") ?? "unknown"}`);
    console.log(`online cache rows: ${cacheRow?.count ?? 0}`);

    return 0;
  } finally {
    db.close();
  }
}
