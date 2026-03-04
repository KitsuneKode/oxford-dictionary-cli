import { mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureParentDir(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

export async function atomicReplace(targetPath: string, bytes: Uint8Array): Promise<void> {
  const tmpPath = `${targetPath}.tmp-${Date.now()}`;
  await ensureParentDir(targetPath);
  await Bun.write(tmpPath, bytes);
  await rename(tmpPath, targetPath);
}
