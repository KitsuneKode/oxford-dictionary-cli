import { existsSync } from "node:fs";
import type { OxfConfig } from "../types";
import { clearProgressLine, makeProgressPrinter } from "../ui/progress";
import { readManifest, resolveAssetLocation, syncDatasetOrThrow } from "../util/sync";

interface SetupOptions {
  channel: string;
  manifest?: string;
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
  const { manifest, source } = await readManifest(manifestSource);
  const channel = manifest.channels[options.channel];

  if (!channel) {
    const available = Object.keys(manifest.channels);
    console.error(`Channel '${options.channel}' not found. Available: ${available.join(", ")}`);
    return 1;
  }

  const { formatBytes } = await import("../ui/progress");
  console.log(`     Channel: ${options.channel} (${channel.version})`);
  if (channel.sizeBytes) {
    console.log(`     Size: ${formatBytes(channel.sizeBytes)}`);
  }
  console.log();

  console.log("2/3  Downloading dataset…");
  const onProgress = makeProgressPrinter();
  const result = await syncDatasetOrThrow(config, {
    channel: options.channel,
    manifestSource: source,
    onProgress: (current, total) => {
      onProgress(current, total);
    },
  });
  clearProgressLine();

  console.log("     ✓ Download complete");
  console.log();
  console.log("3/3  Installing dataset…");
  console.log("     ✓ Installed");
  console.log();
  console.log(`Setup complete. Dataset: ${result.version} (${result.channel})`);
  console.log(`Database: ${config.dbPath}`);
  console.log("Run `oxf <word>` to start looking up words.");

  return 0;
}
