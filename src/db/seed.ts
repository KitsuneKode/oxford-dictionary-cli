import type { Database } from "bun:sqlite";
import { normalizeWord } from "../domain/normalize";

interface SeedSense {
  pos: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

interface SeedEntry {
  lemma: string;
  ipa?: string;
  frequencyRank: number;
  source: string;
  forms: string[];
  senses: SeedSense[];
}

const CORE_LEXICON: SeedEntry[] = [
  {
    lemma: "dogmatic",
    ipa: "/dɔːɡˈmætɪk/",
    frequencyRank: 5400,
    source: "core",
    forms: ["dogmatically"],
    senses: [
      {
        pos: "adjective",
        definition:
          "being certain that your beliefs are right and expecting others to accept them without question",
        examples: ["He remained dogmatic even when confronted with evidence."],
        synonyms: ["opinionated", "assertive", "inflexible"],
        antonyms: ["open-minded", "flexible"],
      },
    ],
  },
  {
    lemma: "dogma",
    ipa: "/ˈdɒɡmə/",
    frequencyRank: 6200,
    source: "core",
    forms: ["dogmas"],
    senses: [
      {
        pos: "noun",
        definition:
          "a belief or set of beliefs accepted as authoritative without sufficient grounds",
        examples: ["The course encourages questioning of political dogma."],
        synonyms: ["doctrine", "creed", "tenet"],
        antonyms: ["skepticism", "doubt"],
      },
    ],
  },
  {
    lemma: "pragmatic",
    ipa: "/præɡˈmætɪk/",
    frequencyRank: 4300,
    source: "core",
    forms: ["pragmatically"],
    senses: [
      {
        pos: "adjective",
        definition: "dealing with problems in a sensible and realistic way",
        examples: ["She took a pragmatic approach to hiring."],
        synonyms: ["practical", "realistic", "sensible"],
        antonyms: ["idealistic", "impractical"],
      },
    ],
  },
  {
    lemma: "ephemeral",
    ipa: "/ɪˈfemərəl/",
    frequencyRank: 7100,
    source: "core",
    forms: ["ephemerally"],
    senses: [
      {
        pos: "adjective",
        definition: "lasting for a very short time",
        examples: ["Internet trends are often ephemeral."],
        synonyms: ["fleeting", "transient", "short-lived"],
        antonyms: ["enduring", "permanent"],
      },
    ],
  },
  {
    lemma: "resilient",
    ipa: "/rɪˈzɪliənt/",
    frequencyRank: 3900,
    source: "core",
    forms: ["resilience"],
    senses: [
      {
        pos: "adjective",
        definition: "able to recover quickly from difficulty",
        examples: ["Small teams can be remarkably resilient."],
        synonyms: ["tough", "adaptable", "strong"],
        antonyms: ["fragile", "vulnerable"],
      },
    ],
  },
  {
    lemma: "ubiquitous",
    ipa: "/juːˈbɪkwɪtəs/",
    frequencyRank: 6500,
    source: "core",
    forms: ["ubiquity"],
    senses: [
      {
        pos: "adjective",
        definition: "present, appearing, or found everywhere",
        examples: ["Smartphones are now ubiquitous."],
        synonyms: ["omnipresent", "widespread"],
        antonyms: ["rare", "uncommon"],
      },
    ],
  },
  {
    lemma: "serendipity",
    ipa: "/ˌserənˈdɪpəti/",
    frequencyRank: 7200,
    source: "core",
    forms: ["serendipitous"],
    senses: [
      {
        pos: "noun",
        definition: "the occurrence of happy or beneficial events by chance",
        examples: ["Their meeting was pure serendipity."],
        synonyms: ["fluke", "fortune", "luck"],
        antonyms: ["misfortune"],
      },
    ],
  },
  {
    lemma: "candid",
    ipa: "/ˈkændɪd/",
    frequencyRank: 5200,
    source: "core",
    forms: ["candidly"],
    senses: [
      {
        pos: "adjective",
        definition: "truthful and straightforward; frank",
        examples: ["Her candid feedback improved the draft."],
        synonyms: ["frank", "honest", "direct"],
        antonyms: ["guarded", "evasive"],
      },
    ],
  },
  {
    lemma: "meticulous",
    ipa: "/məˈtɪkjələs/",
    frequencyRank: 6100,
    source: "core",
    forms: ["meticulously", "meticulousness"],
    senses: [
      {
        pos: "adjective",
        definition: "showing great attention to detail; very careful and precise",
        examples: ["The audit required meticulous documentation."],
        synonyms: ["careful", "precise", "thorough"],
        antonyms: ["careless", "sloppy"],
      },
    ],
  },
  {
    lemma: "tenacious",
    ipa: "/təˈneɪʃəs/",
    frequencyRank: 6900,
    source: "core",
    forms: ["tenacity"],
    senses: [
      {
        pos: "adjective",
        definition: "tending to keep a firm hold of something; persistent",
        examples: ["Her tenacious focus got the product shipped."],
        synonyms: ["persistent", "determined", "resolute"],
        antonyms: ["weak", "yielding"],
      },
    ],
  },
  {
    lemma: "eloquent",
    ipa: "/ˈeləkwənt/",
    frequencyRank: 6000,
    source: "core",
    forms: ["eloquently", "eloquence"],
    senses: [
      {
        pos: "adjective",
        definition: "fluent or persuasive in speaking or writing",
        examples: ["He gave an eloquent defense of the proposal."],
        synonyms: ["articulate", "expressive", "fluent"],
        antonyms: ["inarticulate", "awkward"],
      },
    ],
  },
  {
    lemma: "ambiguous",
    ipa: "/æmˈbɪɡjuəs/",
    frequencyRank: 5000,
    source: "core",
    forms: ["ambiguity", "ambiguously"],
    senses: [
      {
        pos: "adjective",
        definition: "open to more than one interpretation",
        examples: ["The requirement was ambiguous and caused confusion."],
        synonyms: ["unclear", "equivocal", "vague"],
        antonyms: ["clear", "explicit"],
      },
    ],
  },
  {
    lemma: "novice",
    ipa: "/ˈnɒvɪs/",
    frequencyRank: 6700,
    source: "core",
    forms: ["novices"],
    senses: [
      {
        pos: "noun",
        definition: "a person new to or inexperienced in a field",
        examples: ["The tutorial is written for novices."],
        synonyms: ["beginner", "newcomer"],
        antonyms: ["expert", "veteran"],
      },
    ],
  },
  {
    lemma: "vivid",
    ipa: "/ˈvɪvɪd/",
    frequencyRank: 4700,
    source: "core",
    forms: ["vividly", "vividness"],
    senses: [
      {
        pos: "adjective",
        definition: "producing powerful feelings or strong, clear images",
        examples: ["She gave a vivid account of the outage."],
        synonyms: ["graphic", "striking", "clear"],
        antonyms: ["dull", "faint"],
      },
    ],
  },
  {
    lemma: "coherent",
    ipa: "/kəʊˈhɪərənt/",
    frequencyRank: 4500,
    source: "core",
    forms: ["coherently", "coherence"],
    senses: [
      {
        pos: "adjective",
        definition: "logical and consistent",
        examples: ["The migration strategy is coherent and testable."],
        synonyms: ["consistent", "logical", "clear"],
        antonyms: ["incoherent", "disjointed"],
      },
    ],
  },
];

export function seedCoreLexicon(db: Database): void {
  const hasEntries = db.query("SELECT COUNT(*) AS count FROM entries").get() as { count: number };
  if (hasEntries.count > 0) {
    return;
  }

  const insertEntry = db.prepare(
    "INSERT INTO entries (lemma, normalized_lemma, ipa, frequency_rank, source) VALUES (?, ?, ?, ?, ?)",
  );
  const insertSense = db.prepare(
    "INSERT INTO senses (entry_id, pos, definition, sense_order) VALUES (?, ?, ?, ?)",
  );
  const insertExample = db.prepare(
    "INSERT INTO examples (sense_id, text, example_order) VALUES (?, ?, ?)",
  );
  const insertSynonym = db.prepare(
    "INSERT INTO synonyms (sense_id, term, weight) VALUES (?, ?, ?)",
  );
  const insertAntonym = db.prepare(
    "INSERT INTO antonyms (sense_id, term, weight) VALUES (?, ?, ?)",
  );
  const insertForm = db.prepare("INSERT INTO forms (entry_id, form, form_type) VALUES (?, ?, ?)");
  const insertSuggest = db.prepare("INSERT INTO suggest_fts (term, normalized_term) VALUES (?, ?)");

  db.exec("BEGIN");

  try {
    for (const entry of CORE_LEXICON) {
      const normalized = normalizeWord(entry.lemma);
      const result = insertEntry.run(
        entry.lemma,
        normalized,
        entry.ipa ?? null,
        entry.frequencyRank,
        entry.source,
      ) as { lastInsertRowid: number | bigint };
      const entryId = Number(result.lastInsertRowid);

      insertSuggest.run(entry.lemma, normalized);

      for (const form of entry.forms) {
        insertForm.run(entryId, form, "derived");
        insertSuggest.run(form, normalizeWord(form));
      }

      for (const [index, sense] of entry.senses.entries()) {
        const senseResult = insertSense.run(entryId, sense.pos, sense.definition, index + 1) as {
          lastInsertRowid: number | bigint;
        };
        const senseId = Number(senseResult.lastInsertRowid);

        for (const [exampleIndex, example] of sense.examples.entries()) {
          insertExample.run(senseId, example, exampleIndex + 1);
        }

        for (const synonym of sense.synonyms) {
          insertSynonym.run(senseId, synonym, 1);
          insertSuggest.run(synonym, normalizeWord(synonym));
        }

        for (const antonym of sense.antonyms) {
          insertAntonym.run(senseId, antonym, 1);
          insertSuggest.run(antonym, normalizeWord(antonym));
        }
      }
    }

    db.exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('dataset_version', 'core-1.0.0')");
    db.exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('dataset_source', 'bundled-core')");
    db.exec(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('dataset_updated_at', '${new Date().toISOString()}')`,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
