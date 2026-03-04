import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import type { OxfConfig } from "../types";
import { getAppPaths } from "./paths";

const DEFAULT_SYNC_MANIFEST_URL = "https://example.com/oxf/manifest.json";

const CONFIG_KEYS = ["syncManifestUrl", "enrichmentCacheTtlHours", "timeoutMs", "color"] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export function isConfigKey(value: string): value is ConfigKey {
  return (CONFIG_KEYS as readonly string[]).includes(value);
}

function defaultConfig(): OxfConfig {
  const paths = getAppPaths();
  return {
    dataDir: paths.dataDir,
    configFile: paths.configFile,
    dbPath: paths.dbPath,
    metaPath: paths.metaPath,
    syncManifestUrl: DEFAULT_SYNC_MANIFEST_URL,
    enrichmentCacheTtlHours: 24 * 7,
    timeoutMs: 2500,
    color: true,
  };
}

export async function loadConfig(): Promise<OxfConfig> {
  const defaults = defaultConfig();
  if (!existsSync(defaults.configFile)) {
    return defaults;
  }

  const raw = await Bun.file(defaults.configFile).text();
  const parsed = JSON.parse(raw) as Partial<OxfConfig>;

  return {
    ...defaults,
    ...parsed,
  };
}

export async function saveConfig(config: OxfConfig): Promise<void> {
  const paths = getAppPaths();
  await mkdir(paths.configDir, { recursive: true });
  await Bun.write(paths.configFile, JSON.stringify(config, null, 2));
}

export async function setConfigValue(key: ConfigKey, rawValue: string): Promise<OxfConfig> {
  const config = await loadConfig();

  switch (key) {
    case "syncManifestUrl": {
      config.syncManifestUrl = rawValue;
      break;
    }
    case "enrichmentCacheTtlHours": {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("enrichmentCacheTtlHours must be a non-negative number");
      }
      config.enrichmentCacheTtlHours = parsed;
      break;
    }
    case "timeoutMs": {
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("timeoutMs must be a positive number");
      }
      config.timeoutMs = parsed;
      break;
    }
    case "color": {
      if (rawValue !== "true" && rawValue !== "false") {
        throw new Error("color must be true or false");
      }
      config.color = rawValue === "true";
      break;
    }
  }

  await saveConfig(config);
  return config;
}

export async function getConfigValue(key: ConfigKey): Promise<string | number | boolean> {
  const config = await loadConfig();
  return config[key];
}
