import { describe, expect, test } from "bun:test";
import { buildClipboardMeaning } from "../src/domain/clipboard-meaning";
import type { DictionaryEntry, OnlineEnrichment } from "../src/types";

function makeEntry(): DictionaryEntry {
  return {
    id: 1,
    lemma: "dogmatic",
    normalizedLemma: "dogmatic",
    source: "wordnet-3.1",
    senses: [
      {
        id: 1,
        pos: "adjective",
        definition: "being certain that your beliefs are right.",
        examples: ["a dogmatic style"],
        synonyms: ["opinionated"],
        antonyms: ["open-minded"],
      },
      {
        id: 2,
        pos: "adjective",
        definition: "  rigidly   doctrinal  ",
        examples: [],
        synonyms: [],
        antonyms: [],
      },
    ],
    forms: [],
  };
}

describe("buildClipboardMeaning", () => {
  test("copies only normalized meanings", () => {
    const output = buildClipboardMeaning(makeEntry(), null);
    expect(output).toContain("dogmatic");
    expect(output).toContain("1. (adjective) being certain that your beliefs are right.");
    expect(output).toContain("2. (adjective) rigidly doctrinal");
    expect(output).not.toContain("WORD");
    expect(output).not.toContain("SYNONYMS");
    expect(output).not.toContain("source:");
  });

  test("dedupes local and online meaning overlaps", () => {
    const online: OnlineEnrichment = {
      provider: "dictionaryapi.dev",
      definitions: [
        {
          pos: "adjective",
          text: "being certain that your beliefs are right.",
          synonyms: [],
          antonyms: [],
        },
      ],
    };

    const output = buildClipboardMeaning(makeEntry(), online);
    const lines = output.split("\n").filter((line) => line.includes("being certain"));
    expect(lines.length).toBe(1);
  });
});
