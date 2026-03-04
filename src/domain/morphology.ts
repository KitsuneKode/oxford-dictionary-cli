import { normalizeWord } from "./normalize";

const IRREGULAR_MAP: Readonly<Record<string, string>> = {
  went: "go",
  gone: "go",
  better: "good",
  best: "good",
  worse: "bad",
  worst: "bad",
  children: "child",
  mice: "mouse",
  geese: "goose",
  teeth: "tooth",
  feet: "foot",
  written: "write",
  wrote: "write",
  ran: "run",
  ate: "eat",
};

export function lemmaCandidates(rawWord: string): string[] {
  const word = normalizeWord(rawWord);
  if (!word) {
    return [];
  }

  const candidates = new Set<string>([word]);

  const irregular = IRREGULAR_MAP[word];
  if (irregular) {
    candidates.add(irregular);
  }

  if (word.endsWith("ies") && word.length > 3) {
    candidates.add(`${word.slice(0, -3)}y`);
  }

  if (word.endsWith("es") && word.length > 2) {
    candidates.add(word.slice(0, -2));
  }

  if (word.endsWith("s") && word.length > 1) {
    candidates.add(word.slice(0, -1));
  }

  if (word.endsWith("ing") && word.length > 4) {
    candidates.add(word.slice(0, -3));
    candidates.add(`${word.slice(0, -3)}e`);
  }

  if (word.endsWith("ed") && word.length > 3) {
    candidates.add(word.slice(0, -2));
    candidates.add(`${word.slice(0, -2)}e`);
  }

  return [...candidates];
}
