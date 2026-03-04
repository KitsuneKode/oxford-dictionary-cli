const EDGE_PUNCTUATION = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;

export function normalizeWord(input: string): string {
  return input.trim().normalize("NFKC").replace(EDGE_PUNCTUATION, "").toLowerCase();
}
