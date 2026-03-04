import { describe, expect, test } from "bun:test";
import { buildLookupCandidates } from "../src/domain/query-candidates";

describe("buildLookupCandidates", () => {
  test("extracts dogmatic from nondogmatic", () => {
    const result = buildLookupCandidates("nondogmatic");
    expect(result).toContain("dogmatic");
  });

  test("extracts base token from multi-word input", () => {
    const result = buildLookupCandidates("non dogmatic");
    expect(result).toContain("dogmatic");
  });
});
