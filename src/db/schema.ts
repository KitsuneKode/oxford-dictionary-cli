import type { Database } from "bun:sqlite";

export function ensureSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lemma TEXT NOT NULL UNIQUE,
      normalized_lemma TEXT NOT NULL UNIQUE,
      ipa TEXT,
      frequency_rank INTEGER,
      source TEXT NOT NULL DEFAULT 'core',
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS senses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      pos TEXT NOT NULL,
      definition TEXT NOT NULL,
      sense_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sense_id INTEGER NOT NULL REFERENCES senses(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      example_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS synonyms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sense_id INTEGER NOT NULL REFERENCES senses(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS antonyms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sense_id INTEGER NOT NULL REFERENCES senses(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      form TEXT NOT NULL,
      form_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS online_cache (
      word TEXT PRIMARY KEY,
      fetched_at INTEGER NOT NULL,
      payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_normalized ON entries(normalized_lemma);
    CREATE INDEX IF NOT EXISTS idx_senses_entry_order ON senses(entry_id, sense_order);
    CREATE INDEX IF NOT EXISTS idx_examples_sense_order ON examples(sense_id, example_order);

    CREATE VIRTUAL TABLE IF NOT EXISTS suggest_fts USING fts5(
      term,
      normalized_term,
      tokenize = 'unicode61 remove_diacritics 2'
    );
  `);
}
