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

export async function fetchOnlineEnrichment(
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
        synonyms: [...new Set([...(item.synonyms ?? []), ...baseSynonyms])],
        antonyms: [...new Set([...(item.antonyms ?? []), ...baseAntonyms])],
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
