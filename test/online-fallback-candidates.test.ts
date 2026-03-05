import { describe, expect, test } from "bun:test";
import { buildOnlineFallbackCandidates } from "../src/commands/lookup";
import type { Suggestion } from "../src/types";

describe("buildOnlineFallbackCandidates", () => {
  test("deduplicates candidates and prioritizes query first", () => {
    const suggestions: Suggestion[] = [
      { lemma: "dogmatic", distance: 1 },
      { lemma: "undogmatic", distance: 2 },
    ];

    const candidates = buildOnlineFallbackCandidates(
      "nondogmatic",
      ["nondogmatic", "dogmatic", "dogmatic"],
      suggestions,
    );

    expect(candidates[0]).toBe("nondogmatic");
    expect(candidates).toContain("dogmatic");
    expect(candidates).toContain("undogmatic");
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  test("caps candidate list for fast fallback", () => {
    const suggestions: Suggestion[] = [
      { lemma: "one", distance: 1 },
      { lemma: "two", distance: 2 },
      { lemma: "three", distance: 3 },
      { lemma: "four", distance: 4 },
      { lemma: "five", distance: 5 },
    ];

    const candidates = buildOnlineFallbackCandidates("zero", ["a", "b", "c", "d"], suggestions);
    expect(candidates.length).toBe(4);
  });
});
