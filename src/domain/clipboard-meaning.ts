import type { DictionaryEntry, OnlineEnrichment } from "../types";

interface MeaningLine {
  pos: string;
  text: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collectMeanings(entry: DictionaryEntry, online: OnlineEnrichment | null): MeaningLine[] {
  const lines: MeaningLine[] = [];

  for (const sense of entry.senses) {
    const text = normalizeWhitespace(sense.definition);
    if (!text) {
      continue;
    }
    lines.push({ pos: sense.pos, text });
  }

  if (online) {
    for (const item of online.definitions) {
      const text = normalizeWhitespace(item.text);
      if (!text) {
        continue;
      }
      lines.push({ pos: item.pos, text });
    }
  }

  return lines;
}

export function buildClipboardMeaning(
  entry: DictionaryEntry,
  online: OnlineEnrichment | null,
): string {
  const deduped: MeaningLine[] = [];
  const seen = new Set<string>();

  for (const item of collectMeanings(entry, online)) {
    const key = `${item.pos.toLowerCase()}|${item.text.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  const output: string[] = [entry.lemma];
  for (const [index, item] of deduped.entries()) {
    output.push(`${index + 1}. (${item.pos.toLowerCase()}) ${item.text}`);
  }

  return output.join("\n").trim();
}
