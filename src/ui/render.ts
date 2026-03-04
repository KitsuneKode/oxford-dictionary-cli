import type { DictionaryEntry, OnlineEnrichment, Suggestion } from "../types";
import { bullet, style } from "./styles";

interface RenderOptions {
  colorEnabled: boolean;
}

function uniqueByValue(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function renderCard(entry: DictionaryEntry, options: RenderOptions): string {
  const lines: string[] = [];
  const title = entry.ipa ? `${entry.lemma} ${style(entry.ipa, "gray", options)}` : entry.lemma;

  lines.push(style(title, "bold", options));

  const topSenses = entry.senses.slice(0, 2);
  for (const sense of topSenses) {
    lines.push(style(sense.pos, "cyan", options));
    lines.push(bullet(sense.definition));
  }

  lines.push(
    style(
      `source: ${entry.source}${entry.frequencyRank ? ` | rank: ${entry.frequencyRank}` : ""}`,
      "dim",
      options,
    ),
  );

  return lines.join("\n");
}

export function renderExamples(entry: DictionaryEntry): string {
  const lines: string[] = ["Examples"];
  for (const sense of entry.senses) {
    const scoped = sense.examples.map((example) => `${sense.pos}: ${example}`);
    for (const line of scoped) {
      lines.push(bullet(line));
    }
  }

  if (lines.length === 1) {
    lines.push(bullet("No examples found in local dataset."));
  }

  return lines.join("\n");
}

export function renderSynonyms(entry: DictionaryEntry): string {
  const terms = uniqueByValue(entry.senses.flatMap((sense) => sense.synonyms));
  if (terms.length === 0) {
    return ["Synonyms", bullet("No synonyms found in local dataset.")].join("\n");
  }

  return ["Synonyms", bullet(terms.join(", "))].join("\n");
}

export function renderAntonyms(entry: DictionaryEntry): string {
  const terms = uniqueByValue(entry.senses.flatMap((sense) => sense.antonyms));
  if (terms.length === 0) {
    return ["Antonyms", bullet("No antonyms found in local dataset.")].join("\n");
  }

  return ["Antonyms", bullet(terms.join(", "))].join("\n");
}

export function renderForms(entry: DictionaryEntry): string {
  if (entry.forms.length === 0) {
    return ["Forms", bullet("No inflections/forms found in local dataset.")].join("\n");
  }

  return ["Forms", bullet(entry.forms.join(", "))].join("\n");
}

export function renderMore(entry: DictionaryEntry): string {
  const lines: string[] = ["Details"];

  for (const sense of entry.senses) {
    lines.push(`${sense.pos}: ${sense.definition}`);

    if (sense.examples.length > 0) {
      lines.push(bullet(`example: ${sense.examples[0]}`));
    }

    if (sense.synonyms.length > 0) {
      lines.push(bullet(`synonyms: ${sense.synonyms.join(", ")}`));
    }

    if (sense.antonyms.length > 0) {
      lines.push(bullet(`antonyms: ${sense.antonyms.join(", ")}`));
    }
  }

  return lines.join("\n");
}

export function renderSuggestions(suggestions: Suggestion[]): string {
  if (suggestions.length === 0) {
    return "No close matches found.";
  }

  const lines = ["Did you mean:"];
  for (const [index, suggestion] of suggestions.entries()) {
    lines.push(`${index + 1}. ${suggestion.lemma}`);
  }

  return lines.join("\n");
}

export function renderOnline(enrichment: OnlineEnrichment): string {
  const lines: string[] = [`Online enrichment (${enrichment.provider})`];

  for (const item of enrichment.definitions.slice(0, 8)) {
    lines.push(`${item.pos}: ${item.text}`);
    if (item.example) {
      lines.push(bullet(`example: ${item.example}`));
    }
    if (item.synonyms.length > 0) {
      lines.push(bullet(`synonyms: ${item.synonyms.slice(0, 8).join(", ")}`));
    }
    if (item.antonyms.length > 0) {
      lines.push(bullet(`antonyms: ${item.antonyms.slice(0, 8).join(", ")}`));
    }
  }

  return lines.join("\n");
}
