export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function makeProgressPrinter(): (current: number, total: number) => void {
  let lastPct = -1;

  return (current: number, total: number) => {
    const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    const rounded = Math.round(pct);
    if (rounded === lastPct) return; // skip duplicate frames
    lastPct = rounded;

    const filled = Math.round(pct / 5);
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(20 - filled);
    const downloaded = formatBytes(current);
    const totalSize = formatBytes(total);
    process.stdout.write(`\r  ${bar} ${rounded}%  ${downloaded} / ${totalSize}`);
  };
}

export function clearProgressLine(): void {
  process.stdout.write("\r\x1b[K");
}
