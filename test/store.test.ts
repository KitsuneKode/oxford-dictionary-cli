import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDictionaryStore } from "../src/db/store";

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
});
