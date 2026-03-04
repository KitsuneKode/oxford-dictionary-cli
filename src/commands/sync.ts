import { Database } from "bun:sqlite";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { OxfConfig, SyncManifest } from "../types";
import { atomicReplace } from "../util/fs";
import { sha256Hex } from "../util/hash";

interface SyncOptions {
  channel: string;
  manifest?: string;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function isFileUrl(value: string): boolean {
  return value.startsWith("file://");
}

async function readManifest(source: string): Promise<{ manifest: SyncManifest; source: string }> {
  if (isHttpUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Manifest request failed with status ${response.status}`);
    }

    return {
      manifest: (await response.json()) as SyncManifest,
      source,
    };
  }

  const path = isFileUrl(source) ? fileURLToPath(source) : resolve(source);
  const text = await Bun.file(path).text();

  return {
    manifest: JSON.parse(text) as SyncManifest,
    source: `file://${path}`,
  };
}

function resolveAssetLocation(manifestSource: string, asset: string): string {
  if (isHttpUrl(asset) || isFileUrl(asset) || isAbsolute(asset)) {
    return asset;
  }

  if (isHttpUrl(manifestSource)) {
    return new URL(asset, manifestSource).toString();
  }

  const basePath = fileURLToPath(manifestSource);
  return resolve(dirname(basePath), asset);
}

async function readBytes(location: string): Promise<Uint8Array> {
  if (isHttpUrl(location)) {
    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`Dataset request failed with status ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  const path = isFileUrl(location) ? fileURLToPath(location) : location;
  return await Bun.file(path).bytes();
}

function looksLikeSqlite(bytes: Uint8Array): boolean {
  const signature = "SQLite format 3\u0000";
  if (bytes.byteLength < signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature.charCodeAt(i)) {
      return false;
    }
  }

  return true;
}

function updateMeta(dbPath: string, channel: string, version: string, sourceUrl: string): void {
  const db = new Database(dbPath, { create: true });
  try {
    db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_version",
      version,
    );
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_source",
      sourceUrl,
    );
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_channel",
      channel,
    );
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_updated_at",
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }
}

export async function runSyncCommand(config: OxfConfig, options: SyncOptions): Promise<number> {
  const manifestSource = options.manifest ?? config.syncManifestUrl;

  if (!manifestSource) {
    console.error(
      "No manifest URL configured. Set syncManifestUrl via `oxf config set syncManifestUrl <url>`.",
    );
    return 1;
  }

  const { manifest, source } = await readManifest(manifestSource);
  const channel = manifest.channels[options.channel];

  if (!channel) {
    const available = Object.keys(manifest.channels);
    throw new Error(
      `Channel '${options.channel}' not found. Available channels: ${available.join(", ")}`,
    );
  }

  const datasetLocation = resolveAssetLocation(source, channel.url);
  const bytes = await readBytes(datasetLocation);
  if (bytes.byteLength === 0) {
    throw new Error("Downloaded dataset is empty.");
  }

  if (!looksLikeSqlite(bytes)) {
    throw new Error("Downloaded dataset is not a valid SQLite file.");
  }

  if (channel.sizeBytes !== undefined && channel.sizeBytes !== bytes.byteLength) {
    throw new Error(
      `Dataset size mismatch. Expected ${channel.sizeBytes} bytes, got ${bytes.byteLength} bytes.`,
    );
  }

  const hash = sha256Hex(bytes).toLowerCase();

  if (hash !== channel.sha256.toLowerCase()) {
    throw new Error("Checksum mismatch. Aborting sync.");
  }

  await atomicReplace(config.dbPath, bytes);
  updateMeta(config.dbPath, options.channel, channel.version, datasetLocation);

  await Bun.write(
    config.metaPath,
    JSON.stringify(
      {
        channel: options.channel,
        version: channel.version,
        updatedAt: new Date().toISOString(),
        source: datasetLocation,
      },
      null,
      2,
    ),
  );

  console.log(`Synced dataset ${channel.version} (${options.channel})`);
  return 0;
}
