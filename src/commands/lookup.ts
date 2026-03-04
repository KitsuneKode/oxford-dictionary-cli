import type { DictionaryStore } from "../db/store";
import { fetchOnlineEnrichment } from "../enrich/provider";
import type { LookupOptions, OnlineEnrichment, OxfConfig } from "../types";
import { askDetailChoice } from "../ui/prompt";
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

function isCacheFresh(fetchedAt: number, ttlHours: number): boolean {
  return Date.now() - fetchedAt <= ttlHours * 60 * 60 * 1000;
}

async function getOnlineEnrichment(
  word: string,
  options: LookupOptions,
  config: OxfConfig,
  store: DictionaryStore,
): Promise<OnlineEnrichment | null> {
  const cached = store.getOnlineCache(word);

  if (cached && isCacheFresh(cached.fetchedAt, config.enrichmentCacheTtlHours)) {
    return cached.payload;
  }

  try {
    const enrichment = await fetchOnlineEnrichment(word, options.timeoutMs);
    if (!enrichment) {
      return null;
    }

    store.putOnlineCache(word, enrichment);
    return enrichment;
  } catch {
    return null;
  }
}

export async function runLookupCommand(input: LookupCommandInput): Promise<number> {
  const { word, options, config, store } = input;
  const colorEnabled = config.color && !options.noColor && Boolean(process.stdout.isTTY);

  const entry = store.lookupExact(word) ?? store.lookupByLemmaVariants(word);

  if (!entry) {
    const suggestions = store.suggest(word, 6);

    if (options.json) {
      console.log(JSON.stringify({ word, found: false, suggestions }, null, 2));
    } else {
      console.log(`No exact match for "${word}".`);
      console.log(renderSuggestions(suggestions));
    }

    return 1;
  }

  if (options.json) {
    const online = options.online ? await getOnlineEnrichment(word, options, config, store) : null;
    console.log(
      JSON.stringify(
        {
          found: true,
          entry,
          online,
        },
        null,
        2,
      ),
    );
    return 0;
  }

  console.log(renderCard(entry, { colorEnabled }));

  if (options.more) {
    console.log();
    console.log(renderMore(entry));
    console.log();
    console.log(renderExamples(entry));
    console.log();
    console.log(renderSynonyms(entry));
    console.log();
    console.log(renderAntonyms(entry));
    console.log();
    console.log(renderForms(entry));
  }

  if (options.online) {
    const online = await getOnlineEnrichment(word, options, config, store);
    if (online) {
      console.log();
      console.log(renderOnline(online));
    } else {
      console.log();
      console.log("Online enrichment unavailable.");
    }
  }

  if (!options.more && !options.online && process.stdin.isTTY && process.stdout.isTTY) {
    let running = true;
    while (running) {
      const choice = await askDetailChoice();

      switch (choice) {
        case "m": {
          console.log();
          console.log(renderMore(entry));
          break;
        }
        case "e": {
          console.log();
          console.log(renderExamples(entry));
          break;
        }
        case "s": {
          console.log();
          console.log(renderSynonyms(entry));
          break;
        }
        case "a": {
          console.log();
          console.log(renderAntonyms(entry));
          break;
        }
        case "f": {
          console.log();
          console.log(renderForms(entry));
          break;
        }
        case "o": {
          const online = await getOnlineEnrichment(word, options, config, store);
          console.log();
          console.log(online ? renderOnline(online) : "Online enrichment unavailable.");
          break;
        }
        default: {
          running = false;
          break;
        }
      }
    }
  }

  return 0;
}
