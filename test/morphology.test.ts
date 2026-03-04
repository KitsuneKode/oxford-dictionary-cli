import { describe, expect, test } from "bun:test";
import { lemmaCandidates } from "../src/domain/morphology";

describe("lemmaCandidates", () => {
  test("includes singular/plural forms", () => {
    expect(lemmaCandidates("novices")).toContain("novice");
  });

  test("includes irregular fallback", () => {
    expect(lemmaCandidates("went")).toContain("go");
  });
});
