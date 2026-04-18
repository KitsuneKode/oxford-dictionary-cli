import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { levenshteinDistance } from "../domain/levenshtein";
import { lemmaCandidates } from "../domain/morphology";
import { normalizeWord } from "../domain/normalize";
import type { DictionaryEntry, OnlineEnrichment, OxfConfig, Suggestion } from "../types";
import { syncDatasetOrThrow } from "../util/sync";
import { applyPragmas } from "./pragmas";
import { ensureSchema } from "./schema";
import { seedCoreLexicon } from "./seed";

interface EntryRow {
  id: number;
  lemma: string;
  normalized_lemma: string;
  ipa: string | null;
  frequency_rank: number | null;
  source: string;
}

interface SenseRow {
  id: number;
  pos: string;
  definition: string;
}

interface TextRow {
  text: string;
}

interface TermRow {
  term: string;
}

interface FormRow {
  form: string;
}

interface SuggestionRow {
  lemma: string;
  frequency_rank: number | null;
}

interface MetaRow {
  value: string;
}

interface CountRow {
  count: number;
}

interface CacheRow {
  payload: string;
  fetched_at: number;
}

function buildFtsPrefixQuery(term: string): string {
  const cleaned = term.replace(/[^a-z0-9\s-]/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(/\s+/)
    .map((token) => `${token}*`)
    .join(" ");
}

export class DictionaryStore {
  constructor(private readonly db: Database) {}

  close(): void {
    this.db.close();
  }

  lookupExact(rawWord: string): DictionaryEntry | null {
    const normalized = normalizeWord(rawWord);
    if (!normalized) {
      return null;
    }

    const row = this.db
      .query<EntryRow, [string]>(
        "SELECT id, lemma, normalized_lemma, ipa, frequency_rank, source FROM entries WHERE normalized_lemma = ? LIMIT 1",
      )
      .get(normalized);

    return row ? this.hydrateEntry(row) : null;
  }

  lookupByLemmaVariants(rawWord: string): DictionaryEntry | null {
    for (const candidate of lemmaCandidates(rawWord)) {
      const row = this.db
        .query<EntryRow, [string]>(
          "SELECT id, lemma, normalized_lemma, ipa, frequency_rank, source FROM entries WHERE normalized_lemma = ? LIMIT 1",
        )
        .get(candidate);
      if (row) {
        return this.hydrateEntry(row);
      }
    }

    return null;
  }

  suggest(rawWord: string, limit: number): Suggestion[] {
    const normalized = normalizeWord(rawWord);
    if (!normalized) {
      return [];
    }

    const rows = new Map<string, SuggestionRow>();

    const ftsQuery = buildFtsPrefixQuery(normalized);
    if (ftsQuery) {
      const ftsRows = this.db
        .query<TermRow, [string, number]>(
          "SELECT term FROM suggest_fts WHERE suggest_fts MATCH ? LIMIT ?",
        )
        .all(ftsQuery, limit * 4);

      for (const row of ftsRows) {
        const entry = this.db
          .query<SuggestionRow, [string]>(
            "SELECT lemma, frequency_rank FROM entries WHERE normalized_lemma = ? LIMIT 1",
          )
          .get(normalizeWord(row.term));

        if (entry) {
          rows.set(entry.lemma, entry);
        }
      }
    }

    const likeRows = this.db
      .query<SuggestionRow, [string, number]>(
        "SELECT lemma, frequency_rank FROM entries WHERE normalized_lemma LIKE ? ORDER BY frequency_rank ASC LIMIT ?",
      )
      .all(`${normalized.slice(0, 3)}%`, limit * 4);

    for (const row of likeRows) {
      rows.set(row.lemma, row);
    }

    return [...rows.values()]
      .map((row) => ({
        lemma: row.lemma,
        frequencyRank: row.frequency_rank ?? undefined,
        distance: levenshteinDistance(normalized, normalizeWord(row.lemma)),
      }))
      .sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        return (
          (a.frequencyRank ?? Number.MAX_SAFE_INTEGER) -
          (b.frequencyRank ?? Number.MAX_SAFE_INTEGER)
        );
      })
      .slice(0, limit);
  }

  countEntries(): number {
    const row = this.db.query<CountRow, []>("SELECT COUNT(*) AS count FROM entries").get();
    return row?.count ?? 0;
  }

  getMeta(key: string): string | null {
    const row = this.db
      .query<MetaRow, [string]>("SELECT value FROM meta WHERE key = ? LIMIT 1")
      .get(key);
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value);
  }

  getOnlineCache(word: string): { payload: OnlineEnrichment; fetchedAt: number } | null {
    const normalized = normalizeWord(word);
    if (!normalized) {
      return null;
    }

    const row = this.db
      .query<CacheRow, [string]>(
        "SELECT payload, fetched_at FROM online_cache WHERE word = ? LIMIT 1",
      )
      .get(normalized);
    if (!row) {
      return null;
    }

    return {
      payload: JSON.parse(row.payload) as OnlineEnrichment,
      fetchedAt: row.fetched_at,
    };
  }

  putOnlineCache(word: string, payload: OnlineEnrichment): void {
    const normalized = normalizeWord(word);
    if (!normalized) {
      return;
    }

    this.db
      .query("INSERT OR REPLACE INTO online_cache (word, fetched_at, payload) VALUES (?, ?, ?)")
      .run(normalized, Date.now(), JSON.stringify(payload));
  }

  countOnlineCacheRows(): number {
    const row = this.db.query<CountRow, []>("SELECT COUNT(*) AS count FROM online_cache").get();
    return row?.count ?? 0;
  }

  private hydrateEntry(entry: EntryRow): DictionaryEntry {
    const senses = this.db
      .query<SenseRow, [number]>(
        "SELECT id, pos, definition FROM senses WHERE entry_id = ? ORDER BY sense_order ASC",
      )
      .all(entry.id)
      .map((sense) => {
        const examples = this.db
          .query<TextRow, [number]>(
            "SELECT text FROM examples WHERE sense_id = ? ORDER BY example_order ASC",
          )
          .all(sense.id)
          .map((row) => row.text);

        const synonyms = this.db
          .query<TermRow, [number]>(
            "SELECT term FROM synonyms WHERE sense_id = ? ORDER BY weight DESC",
          )
          .all(sense.id)
          .map((row) => row.term);

        const antonyms = this.db
          .query<TermRow, [number]>(
            "SELECT term FROM antonyms WHERE sense_id = ? ORDER BY weight DESC",
          )
          .all(sense.id)
          .map((row) => row.term);

        return {
          id: sense.id,
          pos: sense.pos,
          definition: sense.definition,
          examples,
          synonyms,
          antonyms,
        };
      });

    const forms = this.db
      .query<FormRow, [number]>("SELECT form FROM forms WHERE entry_id = ? ORDER BY form ASC")
      .all(entry.id)
      .map((row) => row.form);

    return {
      id: entry.id,
      lemma: entry.lemma,
      normalizedLemma: entry.normalized_lemma,
      ipa: entry.ipa ?? undefined,
      source: entry.source,
      frequencyRank: entry.frequency_rank ?? undefined,
      senses,
      forms,
    };
  }
}

export async function openDictionaryStore(config: OxfConfig): Promise<DictionaryStore> {
  await mkdir(config.dataDir, { recursive: true });

  if (config.autoSync) {
    const dbExists = existsSync(config.dbPath);
    let needsSync = !dbExists;

    if (dbExists) {
      try {
        const tempDb = new Database(config.dbPath, { create: false, readonly: true });
        try {
          const meta = tempDb
            .query<{ value: string }, []>("SELECT value FROM meta WHERE key = 'dataset_source'")
            .get();
          if (meta?.value === "bundled-core") {
            needsSync = true;
          }
        } finally {
          tempDb.close();
        }
      } catch {
        // Corrupted or unreadable DB — will recreate
      }
    }

    if (needsSync) {
      try {
        await syncDatasetOrThrow(config, { channel: "stable" });
      } catch (error) {
        console.warn(
          `Auto-sync failed (${error instanceof Error ? error.message : "unknown error"}). Falling back to bundled core lexicon.`,
        );
      }
    }
  }

  const db = new Database(config.dbPath, { create: true });
  applyPragmas(db);
  ensureSchema(db);
  seedCoreLexicon(db);
  return new DictionaryStore(db);
}
