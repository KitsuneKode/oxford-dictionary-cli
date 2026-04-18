import { Database } from "bun:sqlite";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { OxfConfig, SyncManifest } from "../types";
import { atomicReplace } from "./fs";
import { sha256Hex } from "./hash";

export interface SyncResult {
  version: string;
  channel: string;
  success: boolean;
  source?: string;
  error?: string;
}

interface SyncOptions {
  channel?: string;
  manifestSource?: string;
  onProgress?: (current: number, total: number) => void;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

function isFileUrl(value: string): boolean {
  return value.startsWith("file://");
}

export async function readManifest(
  source: string,
): Promise<{ manifest: SyncManifest; source: string }> {
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

export function resolveAssetLocation(manifestSource: string, asset: string): string {
  if (isHttpUrl(asset) || isFileUrl(asset) || isAbsolute(asset)) {
    return asset;
  }

  if (isHttpUrl(manifestSource)) {
    return new URL(asset, manifestSource).toString();
  }

  const basePath = fileURLToPath(manifestSource);
  return resolve(dirname(basePath), asset);
}

export async function readBytes(location: string): Promise<Uint8Array> {
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

export async function readBytesWithProgress(
  location: string,
  expectedSize: number | undefined,
  onProgress: (current: number, total: number) => void,
): Promise<Uint8Array> {
  if (isFileUrl(location) || (!isHttpUrl(location) && !isFileUrl(location))) {
    const path = isFileUrl(location) ? fileURLToPath(location) : location;
    const file = Bun.file(path);
    const total = file.size;
    const bytes = await file.bytes();
    onProgress(bytes.byteLength, total);
    return bytes;
  }

  const response = await fetch(location);
  if (!response.ok) {
    throw new Error(`Dataset request failed with status ${response.status}`);
  }

  const total = expectedSize ?? Number(response.headers.get("content-length")) ?? 0;
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable.");
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) {
      onProgress(received, total);
    }
  }

  const result = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (total > 0) {
    onProgress(received, total);
  }

  return result;
}

export function looksLikeSqlite(bytes: Uint8Array): boolean {
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

export async function syncDatasetOrThrow(
  config: OxfConfig,
  options: SyncOptions = {},
): Promise<Omit<SyncResult, "success" | "error">> {
  const channel = options.channel ?? "stable";
  const manifestSource = options.manifestSource ?? config.syncManifestUrl;

  if (!manifestSource) {
    throw new Error("No manifest URL configured.");
  }

  const { manifest, source } = await readManifest(manifestSource);
  const selectedChannel = manifest.channels[channel];

  if (!selectedChannel) {
    const available = Object.keys(manifest.channels);
    throw new Error(`Channel '${channel}' not found. Available channels: ${available.join(", ")}`);
  }

  const datasetLocation = resolveAssetLocation(source, selectedChannel.url);
  const bytes = options.onProgress
    ? await readBytesWithProgress(datasetLocation, selectedChannel.sizeBytes, options.onProgress)
    : await readBytes(datasetLocation);
  if (bytes.byteLength === 0) {
    throw new Error("Downloaded dataset is empty.");
  }

  if (!looksLikeSqlite(bytes)) {
    throw new Error("Downloaded dataset is not a valid SQLite file.");
  }

  if (selectedChannel.sizeBytes !== undefined && selectedChannel.sizeBytes !== bytes.byteLength) {
    throw new Error(
      `Dataset size mismatch. Expected ${selectedChannel.sizeBytes} bytes, got ${bytes.byteLength} bytes.`,
    );
  }

  const hash = sha256Hex(bytes).toLowerCase();

  if (hash !== selectedChannel.sha256.toLowerCase()) {
    throw new Error("Checksum mismatch. Aborting sync.");
  }

  await atomicReplace(config.dbPath, bytes);
  updateMeta(config.dbPath, channel, selectedChannel.version, datasetLocation);

  await Bun.write(
    config.metaPath,
    JSON.stringify(
      {
        channel,
        version: selectedChannel.version,
        updatedAt: new Date().toISOString(),
        source: datasetLocation,
      },
      null,
      2,
    ),
  );

  return {
    version: selectedChannel.version,
    channel,
    source: datasetLocation,
  };
}
