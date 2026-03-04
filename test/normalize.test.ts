import { describe, expect, test } from "bun:test";
import { normalizeWord } from "../src/domain/normalize";

describe("normalizeWord", () => {
  test("trims punctuation and lowercases", () => {
    expect(normalizeWord("  Dogmatic!! ")).toBe("dogmatic");
  });

  test("returns empty for blank input", () => {
    expect(normalizeWord("   ")).toBe("");
  });
});
