import { Database } from "bun:sqlite";
import { mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { applyPragmas } from "../src/db/pragmas";
import { ensureSchema } from "../src/db/schema";
import { normalizeWord } from "../src/domain/normalize";
import { ensureParentDir } from "../src/util/fs";
import { sha256Hex } from "../src/util/hash";

interface WordnetModule {
  path: string;
}

interface ParsedWordnetLine {
  words: string[];
  definition: string;
  examples: string[];
}

const require = createRequire(import.meta.url);
const wndb = require("wordnet-db") as WordnetModule;

const assetsDir = Bun.argv[2] ?? "assets";
await mkdir(assetsDir, { recursive: true });

const fullPath = join(assetsDir, "full.db");
const manifestPath = join(assetsDir, "manifest.json");

function parseWordnetLine(line: string): ParsedWordnetLine | null {
  if (!/^\d{8}\s/.test(line)) {
    return null;
  }

  const pipeIndex = line.indexOf("|");
  if (pipeIndex === -1) {
    return null;
  }

  const dataPart = line.slice(0, pipeIndex).trim();
  const glossPart = line.slice(pipeIndex + 1).trim();
  if (!dataPart || !glossPart) {
    return null;
  }

  const tokens = dataPart.split(/\s+/);
  if (tokens.length < 5) {
    return null;
  }

  const wordCount = Number.parseInt(tokens[3] ?? "0", 16);
  if (!Number.isFinite(wordCount) || wordCount <= 0) {
    return null;
  }

  const words: string[] = [];
  let cursor = 4;
  for (let index = 0; index < wordCount; index += 1) {
    const word = tokens[cursor];
    if (!word) {
      return null;
    }

    words.push(word.replaceAll("_", " "));
    cursor += 2;
  }

  const definition = glossPart.split(";")[0]?.trim() ?? "";
  if (!definition) {
    return null;
  }

  const examples = Array.from(glossPart.matchAll(/"([^"]+)"/g))
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);

  return { words, definition, examples };
}

function mapPos(fileName: string): string {
  if (fileName.includes("noun")) {
    return "noun";
  }
  if (fileName.includes("verb")) {
    return "verb";
  }
  if (fileName.includes("adv")) {
    return "adverb";
  }

  return "adjective";
}

await ensureParentDir(fullPath);
await rm(fullPath, { force: true });

const db = new Database(fullPath, { create: true });

try {
  applyPragmas(db);
  ensureSchema(db);

  const insertEntry = db.prepare(
    "INSERT INTO entries (lemma, normalized_lemma, ipa, frequency_rank, source) VALUES (?, ?, ?, ?, ?)",
  );
  const findEntryId = db.prepare("SELECT id FROM entries WHERE normalized_lemma = ? LIMIT 1");
  const insertSense = db.prepare(
    "INSERT INTO senses (entry_id, pos, definition, sense_order) VALUES (?, ?, ?, ?)",
  );
  const insertExample = db.prepare(
    "INSERT INTO examples (sense_id, text, example_order) VALUES (?, ?, ?)",
  );
  const insertSuggest = db.prepare("INSERT INTO suggest_fts (term, normalized_term) VALUES (?, ?)");

  const entryIds = new Map<string, number>();
  const nextSenseOrder = new Map<number, number>();

  const dataFiles = ["data.noun", "data.verb", "data.adj", "data.adv"] as const;

  let sensesInserted = 0;

  db.exec("BEGIN");

  for (const file of dataFiles) {
    const pos = mapPos(file);
    const path = join(wndb.path, file);
    const content = await Bun.file(path).text();
    const lines = content.split("\n");

    for (const line of lines) {
      const parsed = parseWordnetLine(line);
      if (!parsed) {
        continue;
      }

      for (const rawLemma of parsed.words) {
        const lemma = rawLemma.trim();
        const normalizedLemma = normalizeWord(lemma);
        if (!lemma || !normalizedLemma) {
          continue;
        }

        let entryId = entryIds.get(normalizedLemma);

        if (!entryId) {
          const existing = findEntryId.get(normalizedLemma) as { id: number } | null;
          if (existing?.id) {
            entryId = existing.id;
          } else {
            insertEntry.run(lemma, normalizedLemma, null, null, "wordnet-3.1");
            const created = findEntryId.get(normalizedLemma) as { id: number } | null;
            if (!created?.id) {
              continue;
            }
            entryId = created.id;
            insertSuggest.run(lemma, normalizedLemma);
          }

          entryIds.set(normalizedLemma, entryId);
          if (!nextSenseOrder.has(entryId)) {
            nextSenseOrder.set(entryId, 0);
          }
        }

        const order = (nextSenseOrder.get(entryId) ?? 0) + 1;
        nextSenseOrder.set(entryId, order);

        const senseResult = insertSense.run(entryId, pos, parsed.definition, order) as {
          lastInsertRowid: number | bigint;
        };
        const senseId = Number(senseResult.lastInsertRowid);
        sensesInserted += 1;

        const example = parsed.examples[0];
        if (example) {
          insertExample.run(senseId, example, 1);
        }
      }
    }

    console.log(`Processed ${file}`);
  }

  db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
    "dataset_version",
    "wordnet-3.1",
  );
  db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
    "dataset_source",
    "wordnet-db",
  );
  db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
    "dataset_updated_at",
    new Date().toISOString(),
  );

  db.exec("COMMIT");

  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  db.exec("PRAGMA journal_mode = DELETE;");
  db.exec("VACUUM;");

  const entryCount = db.query("SELECT COUNT(*) AS count FROM entries").get() as { count: number };
  console.log(`WordNet dataset built: ${entryCount.count} entries, ${sensesInserted} senses.`);
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

const bytes = await Bun.file(fullPath).bytes();
if (bytes.byteLength === 0) {
  throw new Error("full.db is empty after WordNet build.");
}

const hash = sha256Hex(bytes);

const manifest = {
  channels: {
    stable: {
      version: "wordnet-3.1",
      url: "full.db",
      sha256: hash,
      sizeBytes: bytes.byteLength,
      updatedAt: new Date().toISOString(),
    },
    latest: {
      version: "wordnet-3.1",
      url: "full.db",
      sha256: hash,
      sizeBytes: bytes.byteLength,
      updatedAt: new Date().toISOString(),
    },
  },
};

await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Built full WordNet dataset + manifest in ${assetsDir}`);
