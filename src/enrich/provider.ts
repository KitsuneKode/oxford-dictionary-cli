import { normalizeWord } from "../domain/normalize";
import type { OnlineEnrichment } from "../types";

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  synonyms?: string[];
  antonyms?: string[];
  definitions?: Array<{
    definition?: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
}

interface DictionaryApiEntry {
  meanings?: DictionaryApiMeaning[];
}

interface WiktionaryDefinition {
  definition?: string;
  examples?: string[];
}

interface WiktionaryWordLink {
  word?: string;
}

interface WiktionaryEntry {
  partOfSpeech?: string;
  definitions?: WiktionaryDefinition[];
  synonyms?: WiktionaryWordLink[];
  antonyms?: WiktionaryWordLink[];
}

type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

interface DatamuseEntry {
  word?: string;
  defs?: string[];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function fetchFromDictionaryApi(
  word: string,
  timeoutMs: number,
): Promise<OnlineEnrichment | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    {
      signal,
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DictionaryApiEntry[];
  const first = payload[0];

  if (!first?.meanings?.length) {
    return null;
  }

  const definitions: OnlineEnrichment["definitions"] = [];

  for (const meaning of first.meanings) {
    const baseSynonyms = meaning.synonyms ?? [];
    const baseAntonyms = meaning.antonyms ?? [];

    for (const item of meaning.definitions ?? []) {
      if (!item.definition) {
        continue;
      }

      definitions.push({
        pos: meaning.partOfSpeech ?? "unknown",
        text: item.definition,
        example: item.example,
        synonyms: uniqueStrings([...(item.synonyms ?? []), ...baseSynonyms]),
        antonyms: uniqueStrings([...(item.antonyms ?? []), ...baseAntonyms]),
      });
    }
  }

  if (definitions.length === 0) {
    return null;
  }

  return {
    provider: "dictionaryapi.dev",
    definitions,
  };
}

async function fetchFromWiktionary(
  word: string,
  timeoutMs: number,
): Promise<OnlineEnrichment | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetch(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
    {
      signal,
      headers: {
        "user-agent": "oxf-cli/0.1",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as WiktionaryResponse;
  const languageBuckets = [payload.en, payload.English]
    .filter((bucket): bucket is WiktionaryEntry[] => Array.isArray(bucket))
    .flat();

  if (languageBuckets.length === 0) {
    return null;
  }

  const definitions: OnlineEnrichment["definitions"] = [];

  for (const entry of languageBuckets) {
    const entrySynonyms = uniqueStrings((entry.synonyms ?? []).map((item) => item.word ?? ""));
    const entryAntonyms = uniqueStrings((entry.antonyms ?? []).map((item) => item.word ?? ""));

    for (const item of entry.definitions ?? []) {
      if (!item.definition) {
        continue;
      }

      definitions.push({
        pos: entry.partOfSpeech ?? "unknown",
        text: item.definition,
        example: item.examples?.[0],
        synonyms: entrySynonyms,
        antonyms: entryAntonyms,
      });
    }
  }

  if (definitions.length === 0) {
    return null;
  }

  return {
    provider: "wiktionary.org",
    definitions,
  };
}

async function fetchFromDatamuse(
  word: string,
  timeoutMs: number,
): Promise<OnlineEnrichment | null> {
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetch(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=8`,
    {
      signal,
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as DatamuseEntry[];
  const normalizedTarget = normalizeWord(word);

  const exact = payload.find((item) => normalizeWord(item.word ?? "") === normalizedTarget);
  if (!exact?.defs?.length) {
    return null;
  }

  const definitions: OnlineEnrichment["definitions"] = [];

  for (const def of exact.defs) {
    const [posRaw, textRaw] = def.split("\t");
    const text = textRaw?.trim();
    if (!text) {
      continue;
    }

    const pos = posRaw?.trim() || "unknown";
    definitions.push({
      pos,
      text,
      synonyms: [],
      antonyms: [],
    });
  }

  if (definitions.length === 0) {
    return null;
  }

  return {
    provider: "datamuse.com",
    definitions,
  };
}

export async function fetchOnlineEnrichment(
  word: string,
  timeoutMs: number,
): Promise<OnlineEnrichment | null> {
  const providers: Array<(word: string, timeoutMs: number) => Promise<OnlineEnrichment | null>> = [
    fetchFromDictionaryApi,
    fetchFromWiktionary,
    fetchFromDatamuse,
  ];

  for (const provider of providers) {
    try {
      const result = await provider(word, timeoutMs);
      if (result) {
        return result;
      }
    } catch {
      // Ignore provider failure and continue to next source.
    }
  }

  return null;
}
