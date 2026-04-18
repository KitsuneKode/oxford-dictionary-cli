import type { OxfConfig } from "../types";
import { clearProgressLine, makeProgressPrinter } from "../ui/progress";
import { syncDatasetOrThrow } from "../util/sync";

interface SyncOptions {
  channel: string;
  manifest?: string;
}

export async function runSyncCommand(config: OxfConfig, options: SyncOptions): Promise<number> {
  const manifestSource = options.manifest ?? config.syncManifestUrl;

  if (!manifestSource) {
    console.error(
      "No manifest URL configured. Set syncManifestUrl via `oxf config set syncManifestUrl <url>`.",
    );
    return 1;
  }

  const onProgress = makeProgressPrinter();
  const result = await syncDatasetOrThrow(config, {
    channel: options.channel,
    manifestSource,
    onProgress: (current, total) => {
      onProgress(current, total);
    },
  });
  clearProgressLine();

  console.log(`Synced dataset ${result.version} (${result.channel})`);
  return 0;
}
