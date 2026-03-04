import type { Database } from "bun:sqlite";

export function applyPragmas(db: Database): void {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA temp_store = MEMORY;");
  db.exec("PRAGMA cache_size = -20000;");
  db.exec("PRAGMA foreign_keys = ON;");
}
