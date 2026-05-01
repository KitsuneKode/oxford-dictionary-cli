export interface LookupOptions {
  json: boolean;
  more: boolean;
  online: boolean;
  timeoutMs: number;
  noColor: boolean;
  urban: boolean;
}

export interface Sense {
  id: number;
  pos: string;
  definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
}

export interface DictionaryEntry {
  id: number;
  lemma: string;
  normalizedLemma: string;
  ipa?: string;
  source: string;
  frequencyRank?: number;
  senses: Sense[];
  forms: string[];
}

export interface Suggestion {
  lemma: string;
  frequencyRank?: number;
  distance: number;
}

export interface OnlineEnrichment {
  provider: string;
  definitions: Array<{
    pos: string;
    text: string;
    example?: string;
    synonyms: string[];
    antonyms: string[];
  }>;
}

export interface SyncChannel {
  version: string;
  url: string;
  sha256: string;
  sizeBytes?: number;
  updatedAt?: string;
}

export interface SyncManifest {
  channels: Record<string, SyncChannel>;
}

export interface OxfConfig {
  dataDir: string;
  configFile: string;
  dbPath: string;
  metaPath: string;
  syncManifestUrl: string;
  enrichmentCacheTtlHours: number;
  timeoutMs: number;
  color: boolean;
  autoSync: boolean;
}
