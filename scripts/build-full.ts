import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "../src/util/hash";

const assetsDir = Bun.argv[2] ?? "assets";
await mkdir(assetsDir, { recursive: true });

const corePath = join(assetsDir, "core.db");
const fullPath = join(assetsDir, "full.db");
const manifestPath = join(assetsDir, "manifest.json");

await rm(fullPath, { force: true });
await copyFile(corePath, fullPath);

const bytes = await Bun.file(fullPath).bytes();
if (bytes.byteLength === 0) {
  throw new Error("full.db is empty. Run `bun run build:core` again.");
}
const hash = sha256Hex(bytes);

const manifest = {
  channels: {
    stable: {
      version: "core-derived-1.0.0",
      url: "full.db",
      sha256: hash,
      sizeBytes: bytes.byteLength,
      updatedAt: new Date().toISOString(),
    },
    latest: {
      version: "core-derived-1.0.0",
      url: "full.db",
      sha256: hash,
      sizeBytes: bytes.byteLength,
      updatedAt: new Date().toISOString(),
    },
  },
};

await Bun.write(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Built full dataset + manifest in ${assetsDir}`);
