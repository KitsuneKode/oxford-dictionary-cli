import { createHash } from "node:crypto";

export function sha256Hex(buffer: ArrayBuffer | Uint8Array): string {
  const hash = createHash("sha256");
  hash.update(buffer instanceof Uint8Array ? buffer : Buffer.from(buffer));
  return hash.digest("hex");
}
