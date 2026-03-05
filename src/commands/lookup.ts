import type { DictionaryStore } from "../db/store";
import { buildLookupCandidates } from "../domain/query-candidates";
import { fetchOnlineEnrichment } from "../enrich/provider";
import type {
  DictionaryEntry,
  LookupOptions,
  OnlineEnrichment,
  OxfConfig,
  Suggestion,
} from "../types";
import { copyToClipboard } from "../ui/clipboard";
import { askDetailChoice, askSuggestionChoice } from "../ui/prompt";
import {
  renderAntonyms,
  renderCard,
  renderExamples,
  renderForms,
  renderMore,
  renderOnline,
  renderSuggestions,
  renderSynonyms,
} from "../ui/render";

interface LookupCommandInput {
  word: string;
  options: LookupOptions;
  config: OxfConfig;
  store: DictionaryStore;
}

export interface LookupOutcome {
  exitCode: number;
  nextQuery?: string;
  shouldExitSession?: boolean;
}

const ONLINE_FALLBACK_TIMEOUT_MS = 900;

function mergeSuggestions(suggestionsBySeed: Suggestion[][], limit: number): Suggestion[] {
  const merged = new Map<string, Suggestion>();

  for (const suggestions of suggestionsBySeed) {
    for (const suggestion of suggestions) {
      const existing = merged.get(suggestion.lemma);
      if (!existing) {
        merged.set(suggestion.lemma, suggestion);
        continue;
      }

      merged.set(suggestion.lemma, {
        lemma: suggestion.lemma,
        distance: Math.min(existing.distance, suggestion.distance),
        frequencyRank: Math.min(
          existing.frequencyRank ?? Number.MAX_SAFE_INTEGER,
          suggestion.frequencyRank ?? Number.MAX_SAFE_INTEGER,
        ),
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return (
        (a.frequencyRank ?? Number.MAX_SAFE_INTEGER) - (b.frequencyRank ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .slice(0, limit);
}

function isCacheFresh(fetchedAt: number, ttlHours: number): boolean {
  return Date.now() - fetchedAt <= ttlHours * 60 * 60 * 1000;
}

function buildClipboardSnapshot(entry: DictionaryEntry, online: OnlineEnrichment | null): string {
  const sections = [
    renderCard(entry, { colorEnabled: false }),
    renderMore(entry, { colorEnabled: false }),
    renderExamples(entry, { colorEnabled: false }),
    renderSynonyms(entry, { colorEnabled: false }),
    renderAntonyms(entry, { colorEnabled: false }),
    renderForms(entry, { colorEnabled: false }),
  ];

  if (online) {
    sections.push(renderOnline(online, { colorEnabled: false }));
  }

  return sections.join("\n\n").trim();
}

async function getOnlineEnrichment(
  word: string,
  options: LookupOptions,
  config: OxfConfig,
  store: DictionaryStore,
  timeoutMsOverride?: number,
): Promise<OnlineEnrichment | null> {
  const cached = store.getOnlineCache(word);

  if (cached && isCacheFresh(cached.fetchedAt, config.enrichmentCacheTtlHours)) {
    return cached.payload;
  }

  try {
    const timeoutMs = timeoutMsOverride ?? options.timeoutMs;
    const enrichment = await fetchOnlineEnrichment(word, timeoutMs);
    if (!enrichment) {
      return null;
    }

    store.putOnlineCache(word, enrichment);
    return enrichment;
  } catch {
    return null;
  }
}

export async function runLookupCommand(input: LookupCommandInput): Promise<LookupOutcome> {
  const { word, options, config, store } = input;
  const colorEnabled = config.color && !options.noColor && Boolean(process.stdout.isTTY);
  const lookupCandidates = buildLookupCandidates(word);

  let resolvedBy: string | null = null;
  let showResolvedBanner = false;
  let entry = store.lookupExact(word) ?? store.lookupByLemmaVariants(word);
  let onlineDirectMatch: OnlineEnrichment | null = null;
  let latestOnline: OnlineEnrichment | null = null;

  if (!entry) {
    onlineDirectMatch = await getOnlineEnrichment(
      word,
      options,
      config,
      store,
      Math.min(options.timeoutMs, ONLINE_FALLBACK_TIMEOUT_MS),
    );

    if (onlineDirectMatch) {
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              word,
              found: true,
              source: "online-exact",
              online: onlineDirectMatch,
            },
            null,
            2,
          ),
        );
        return { exitCode: 0 };
      }

      console.log(`No exact local match for "${word}". Found exact word online.`);
      console.log();
      console.log(renderOnline(onlineDirectMatch, { colorEnabled }));
      return { exitCode: 0 };
    }

    for (const candidate of lookupCandidates) {
      const maybe = store.lookupExact(candidate) ?? store.lookupByLemmaVariants(candidate);
      if (maybe) {
        entry = maybe;
        resolvedBy = candidate;
        showResolvedBanner = true;
        break;
      }
    }
  }

  if (!entry) {
    const suggestions = mergeSuggestions(
      lookupCandidates.map((candidate) => store.suggest(candidate, 6)),
      6,
    );

    if (options.json) {
      console.log(JSON.stringify({ word, found: false, suggestions }, null, 2));
      return { exitCode: 1 };
    }

    console.log(`No exact match for "${word}".`);
    console.log(renderSuggestions(suggestions, { colorEnabled }));

    if (suggestions.length > 0 && process.stdin.isTTY && process.stdout.isTTY) {
      const selectedIndex = await askSuggestionChoice(suggestions.length);
      if (selectedIndex !== null) {
        const selected = suggestions[selectedIndex];
        if (selected) {
          const selectedEntry =
            store.lookupExact(selected.lemma) ?? store.lookupByLemmaVariants(selected.lemma);
          if (selectedEntry) {
            entry = selectedEntry;
            resolvedBy = selected.lemma;
            showResolvedBanner = false;
            console.log();
            console.log(`Selected "${selected.lemma}".`);
          }
        }
      }
    }

    if (!entry) {
      return { exitCode: 1 };
    }
  }

  if (options.json) {
    const online = options.online
      ? await getOnlineEnrichment(entry.lemma, options, config, store)
      : null;
    console.log(
      JSON.stringify(
        {
          found: true,
          resolvedBy,
          entry,
          online,
        },
        null,
        2,
      ),
    );
    return { exitCode: 0 };
  }

  if (resolvedBy && showResolvedBanner) {
    console.log(`No exact match for "${word}". Showing closest local match "${entry.lemma}".`);
    console.log();
  }

  console.log(renderCard(entry, { colorEnabled }));

  if (options.more) {
    console.log();
    console.log(renderMore(entry, { colorEnabled }));
    console.log();
    console.log(renderExamples(entry, { colorEnabled }));
    console.log();
    console.log(renderSynonyms(entry, { colorEnabled }));
    console.log();
    console.log(renderAntonyms(entry, { colorEnabled }));
    console.log();
    console.log(renderForms(entry, { colorEnabled }));
  }

  if (options.online) {
    latestOnline = await getOnlineEnrichment(entry.lemma, options, config, store);
    if (latestOnline) {
      console.log();
      console.log(renderOnline(latestOnline, { colorEnabled }));
    } else {
      console.log();
      console.log("Online enrichment unavailable.");
    }
  }

  if (!options.more && !options.online && process.stdin.isTTY && process.stdout.isTTY) {
    let running = true;
    let nextQuery: string | undefined;
    while (running) {
      const rawInput = await askDetailChoice(entry.lemma, colorEnabled);
      const normalized = rawInput.trim().toLowerCase();
      if (!normalized) {
        return { exitCode: 0, shouldExitSession: true };
      }

      switch (normalized) {
        case "more":
        case "m": {
          console.log();
          console.log(renderMore(entry, { colorEnabled }));
          break;
        }
        case "examples":
        case "e": {
          console.log();
          console.log(renderExamples(entry, { colorEnabled }));
          break;
        }
        case "synonyms":
        case "s": {
          console.log();
          console.log(renderSynonyms(entry, { colorEnabled }));
          break;
        }
        case "antonyms":
        case "a": {
          console.log();
          console.log(renderAntonyms(entry, { colorEnabled }));
          break;
        }
        case "forms":
        case "f": {
          console.log();
          console.log(renderForms(entry, { colorEnabled }));
          break;
        }
        case "online":
        case "o": {
          latestOnline = await getOnlineEnrichment(entry.lemma, options, config, store);
          console.log();
          console.log(
            latestOnline
              ? renderOnline(latestOnline, { colorEnabled })
              : "Online enrichment unavailable.",
          );
          break;
        }
        case "c":
        case "copy": {
          const result = copyToClipboard(buildClipboardSnapshot(entry, latestOnline));
          console.log();
          if (result.ok) {
            console.log(`Copied to clipboard (${result.method}).`);
          } else {
            console.log(`Copy failed: ${result.error}`);
          }
          break;
        }
        case "q":
        case "quit":
        case "exit": {
          return { exitCode: 0, shouldExitSession: true };
        }
        default: {
          nextQuery = rawInput;
          running = false;
          break;
        }
      }
    }

    return { exitCode: 0, nextQuery };
  }

  return { exitCode: 0 };
}
