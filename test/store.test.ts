import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureSchema } from "../src/db/schema";
import { openDictionaryStore } from "../src/db/store";
import { sha256Hex } from "../src/util/hash";

describe("DictionaryStore", () => {
  test("lookup exact returns seeded entry", async () => {
    const root = mkdtempSync(join(tmpdir(), "oxf-test-"));

    try {
      const store = await openDictionaryStore({
        dataDir: root,
        configFile: join(root, "config.json"),
        dbPath: join(root, "dict.db"),
        metaPath: join(root, "meta.json"),
        syncManifestUrl: "https://example.com/oxf/manifest.json",
        enrichmentCacheTtlHours: 168,
        timeoutMs: 2000,
        color: true,
        autoSync: false,
      });

      try {
        const result = store.lookupExact("dogmatic");
        expect(result).not.toBeNull();
        expect(result?.lemma).toBe("dogmatic");
      } finally {
        store.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("suggest returns alternatives", async () => {
    const root = mkdtempSync(join(tmpdir(), "oxf-test-"));

    try {
      const store = await openDictionaryStore({
        dataDir: root,
        configFile: join(root, "config.json"),
        dbPath: join(root, "dict.db"),
        metaPath: join(root, "meta.json"),
        syncManifestUrl: "https://example.com/oxf/manifest.json",
        enrichmentCacheTtlHours: 168,
        timeoutMs: 2000,
        color: true,
        autoSync: false,
      });

      try {
        const suggestions = store.suggest("dogmatc", 5);
        expect(suggestions.length).toBeGreaterThan(0);
      } finally {
        store.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("autoSync bootstraps from local manifest dataset", async () => {
    const root = mkdtempSync(join(tmpdir(), "oxf-test-"));

    try {
      const datasetPath = join(root, "full.db");
      const datasetDb = new Database(datasetPath, { create: true });
      try {
        ensureSchema(datasetDb);
        datasetDb
          .query(
            "INSERT INTO entries (lemma, normalized_lemma, ipa, frequency_rank, source) VALUES (?, ?, ?, ?, ?)",
          )
          .run("synchronizable", "synchronizable", null, 1234, "wordnet-test");
      } finally {
        datasetDb.close();
      }

      const datasetBytes = await Bun.file(datasetPath).bytes();
      const manifestPath = join(root, "manifest.json");
      await writeFile(
        manifestPath,
        JSON.stringify(
          {
            channels: {
              stable: {
                version: "wordnet-test-1",
                url: "full.db",
                sha256: sha256Hex(datasetBytes),
                sizeBytes: datasetBytes.byteLength,
              },
            },
          },
          null,
          2,
        ),
      );

      const store = await openDictionaryStore({
        dataDir: root,
        configFile: join(root, "config.json"),
        dbPath: join(root, "dict.db"),
        metaPath: join(root, "meta.json"),
        syncManifestUrl: manifestPath,
        enrichmentCacheTtlHours: 168,
        timeoutMs: 2000,
        color: true,
        autoSync: true,
      });

      try {
        expect(store.lookupExact("synchronizable")?.lemma).toBe("synchronizable");
        expect(store.getMeta("dataset_version")).toBe("wordnet-test-1");
      } finally {
        store.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
