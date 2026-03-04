import type { DictionaryEntry, OnlineEnrichment, Suggestion } from "../types";
import { bullet, style } from "./styles";

interface RenderOptions {
  colorEnabled: boolean;
}

const PLAIN_RENDER_OPTIONS: RenderOptions = { colorEnabled: false };

function uniqueByValue(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function title(label: string, options: RenderOptions): string {
  return style(label, "yellow", options);
}

function divider(minLength: number, options: RenderOptions): string {
  return style("=".repeat(Math.max(40, minLength)), "gray", options);
}

function resolveOptions(options?: RenderOptions): RenderOptions {
  return options ?? PLAIN_RENDER_OPTIONS;
}

export function renderCard(entry: DictionaryEntry, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);
  const lines: string[] = [];
  const titleText = entry.ipa ? `${entry.lemma} ${entry.ipa}` : entry.lemma;

  lines.push(divider(titleText.length + 8, options));
  lines.push(
    `${title("WORD", options)} ${style(entry.lemma, "bold", options)}${entry.ipa ? ` ${style(entry.ipa, "gray", options)}` : ""}`,
  );

  const topSenses = entry.senses.slice(0, 2);
  for (const [index, sense] of topSenses.entries()) {
    lines.push(
      `${style(`#${index + 1}`, "green", options)} ${style(sense.pos.toUpperCase(), "cyan", options)}`,
    );
    lines.push(`   ${sense.definition}`);
  }

  lines.push(
    style(
      `[source: ${entry.source}${entry.frequencyRank ? ` | rank: ${entry.frequencyRank}` : ""}]`,
      "dim",
      options,
    ),
  );
  lines.push(divider(titleText.length + 8, options));

  return lines.join("\n");
}

export function renderExamples(entry: DictionaryEntry, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);
  const lines: string[] = [title("EXAMPLES", options)];

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

export function renderSynonyms(entry: DictionaryEntry, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);
  const terms = uniqueByValue(entry.senses.flatMap((sense) => sense.synonyms));

  if (terms.length === 0) {
    return [title("SYNONYMS", options), bullet("No synonyms found in local dataset.")].join("\n");
  }

  return [title("SYNONYMS", options), bullet(terms.join(", "))].join("\n");
}

export function renderAntonyms(entry: DictionaryEntry, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);
  const terms = uniqueByValue(entry.senses.flatMap((sense) => sense.antonyms));

  if (terms.length === 0) {
    return [title("ANTONYMS", options), bullet("No antonyms found in local dataset.")].join("\n");
  }

  return [title("ANTONYMS", options), bullet(terms.join(", "))].join("\n");
}

export function renderForms(entry: DictionaryEntry, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);

  if (entry.forms.length === 0) {
    return [title("FORMS", options), bullet("No inflections/forms found in local dataset.")].join(
      "\n",
    );
  }

  return [title("FORMS", options), bullet(entry.forms.join(", "))].join("\n");
}

export function renderMore(entry: DictionaryEntry, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);
  const lines: string[] = [title("DETAILS", options)];

  for (const sense of entry.senses) {
    lines.push(`${style(sense.pos.toUpperCase(), "magenta", options)}: ${sense.definition}`);

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

export function renderSuggestions(suggestions: Suggestion[], maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);

  if (suggestions.length === 0) {
    return style("No close matches found.", "dim", options);
  }

  const lines = [title("Not found. This might be what you're looking for:", options)];
  for (const [index, suggestion] of suggestions.entries()) {
    lines.push(
      `${style(String(index + 1), "green", options)}. ${style(suggestion.lemma, "bold", options)}`,
    );
  }

  return lines.join("\n");
}

export function renderOnline(enrichment: OnlineEnrichment, maybeOptions?: RenderOptions): string {
  const options = resolveOptions(maybeOptions);
  const lines: string[] = [title(`ONLINE ENRICHMENT (${enrichment.provider})`, options)];

  for (const item of enrichment.definitions.slice(0, 8)) {
    lines.push(`${style(item.pos.toUpperCase(), "cyan", options)}: ${item.text}`);
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
