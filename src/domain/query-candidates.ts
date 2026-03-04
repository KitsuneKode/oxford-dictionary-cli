import { normalizeWord } from "./normalize";

const NEGATION_PREFIXES = ["non", "un", "dis", "in", "im", "il", "ir"] as const;

function splitTokens(value: string): string[] {
  return value
    .split(/[\s\-_/]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function stripKnownPrefixes(word: string): string[] {
  const stripped: string[] = [];

  for (const prefix of NEGATION_PREFIXES) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      stripped.push(word.slice(prefix.length));
    }
  }

  return stripped;
}

export function buildLookupCandidates(rawQuery: string): string[] {
  const normalized = normalizeWord(rawQuery);
  if (!normalized) {
    return [];
  }

  const candidates = new Set<string>([normalized]);
  const tokens = splitTokens(normalized);

  for (const token of tokens) {
    candidates.add(token);
  }

  if (tokens.length > 1) {
    const last = tokens.at(-1);
    if (last) {
      candidates.add(last);
    }
  }

  const compact = normalized.replace(/[^a-z0-9]/g, "");
  if (compact) {
    candidates.add(compact);
  }

  const snapshot = [...candidates];
  for (const candidate of snapshot) {
    for (const stripped of stripKnownPrefixes(candidate)) {
      candidates.add(stripped);
    }
  }

  return [...candidates];
}
