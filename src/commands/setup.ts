import { existsSync } from "node:fs";
import type { OxfConfig } from "../types";

interface SetupOptions {
  channel: string;
  manifest?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function printProgress(current: number, total: number): void {
  const pct = Math.min((current / total) * 100, 100);
  const filled = Math.round(pct / 5);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);
  const downloaded = formatBytes(current);
  const totalSize = formatBytes(total);
  process.stdout.write(`\r  ${bar} ${pct.toFixed(0)}%  ${downloaded} / ${totalSize}`);
}

function clearProgressLine(): void {
  process.stdout.write("\r\x1b[K");
}

export async function runSetupCommand(config: OxfConfig, options: SetupOptions): Promise<number> {
  console.log("oxf setup\n");

  if (existsSync(config.dbPath)) {
    try {
      const { Database } = await import("bun:sqlite");
      const db = new Database(config.dbPath, { create: false, readonly: true });
      try {
        const row = db
          .query<{ value: string }, []>(
            "SELECT value FROM meta WHERE key = 'dataset_version' LIMIT 1",
          )
          .get();
        const entryCount = db
          .query<{ count: number }, []>("SELECT COUNT(*) AS count FROM entries")
          .get();
        db.close();

        if (row?.value && entryCount?.count && entryCount.count > 0) {
          console.log(`Already set up with ${row.value} (${entryCount.count} entries).`);
          console.log(`Database: ${config.dbPath}`);
          console.log("Run `oxf status` for details or `oxf sync` to update.");
          return 0;
        }
      } finally {
        db.close();
      }
    } catch {
      // Corrupted or unreadable DB — will recreate below
    }
  }

  const manifestSource = options.manifest ?? config.syncManifestUrl;
  if (!manifestSource) {
    console.error(
      "No manifest URL configured. Set syncManifestUrl via `oxf config set syncManifestUrl <url>`.",
    );
    return 1;
  }

  console.log("1/3  Reading manifest…");
  const { readManifest } = await import("../util/sync");
  const { manifest, source } = await readManifest(manifestSource);
  const channel = manifest.channels[options.channel];

  if (!channel) {
    const available = Object.keys(manifest.channels);
    console.error(`Channel '${options.channel}' not found. Available: ${available.join(", ")}`);
    return 1;
  }

  console.log(`     Channel: ${options.channel} (${channel.version})`);
  if (channel.sizeBytes) {
    console.log(`     Size: ${formatBytes(channel.sizeBytes)}`);
  }
  console.log();

  console.log("2/3  Downloading dataset…");
  const { resolveAssetLocation, readBytesWithProgress } = await import("../util/sync");
  const location = resolveAssetLocation(source, channel.url);
  const bytes = await readBytesWithProgress(location, channel.sizeBytes, printProgress);
  clearProgressLine();

  if (bytes.byteLength === 0) {
    console.error("Downloaded dataset is empty.");
    return 1;
  }

  const { looksLikeSqlite } = await import("../util/sync");
  if (!looksLikeSqlite(bytes)) {
    console.error("Downloaded dataset is not a valid SQLite file.");
    return 1;
  }

  if (channel.sizeBytes !== undefined && channel.sizeBytes !== bytes.byteLength) {
    console.error(`Dataset size mismatch. Expected ${channel.sizeBytes}, got ${bytes.byteLength}.`);
    return 1;
  }

  const { sha256Hex } = await import("../util/hash");
  const hash = sha256Hex(bytes).toLowerCase();
  if (hash !== channel.sha256.toLowerCase()) {
    console.error("Checksum mismatch. Aborting setup.");
    return 1;
  }

  console.log("     ✓ Download complete");
  console.log();

  console.log("3/3  Installing dataset…");
  const { atomicReplace } = await import("../util/fs");
  await atomicReplace(config.dbPath, bytes);

  const { Database } = await import("bun:sqlite");
  const db = new Database(config.dbPath, { create: true });
  try {
    db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_version",
      channel.version,
    );
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_source",
      location,
    );
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_channel",
      options.channel,
    );
    db.query("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(
      "dataset_updated_at",
      new Date().toISOString(),
    );
  } finally {
    db.close();
  }

  await Bun.write(
    config.metaPath,
    JSON.stringify(
      {
        channel: options.channel,
        version: channel.version,
        updatedAt: new Date().toISOString(),
        source: location,
      },
      null,
      2,
    ),
  );

  console.log("     ✓ Installed");
  console.log();
  console.log(`Setup complete. Dataset: ${channel.version} (${options.channel})`);
  console.log(`Database: ${config.dbPath}`);
  console.log("Run `oxf <word>` to start looking up words.");

  return 0;
}
