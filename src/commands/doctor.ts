import { Database } from "bun:sqlite";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import type { OxfConfig } from "../types";

export async function runDoctorCommand(config: OxfConfig): Promise<number> {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  try {
    await mkdir(config.dataDir, { recursive: true });
    await access(config.dataDir, constants.W_OK | constants.R_OK);
    checks.push({ name: "data dir", ok: true, detail: config.dataDir });
  } catch (error) {
    checks.push({ name: "data dir", ok: false, detail: String(error) });
  }

  try {
    const db = new Database(":memory:");
    const options = db.query<{ compile_options: string }, []>("PRAGMA compile_options").all();
    const hasFts5 = options.some((row) => row.compile_options === "ENABLE_FTS5");
    db.close();
    checks.push({ name: "sqlite fts5", ok: hasFts5, detail: hasFts5 ? "enabled" : "disabled" });
  } catch (error) {
    checks.push({ name: "sqlite fts5", ok: false, detail: String(error) });
  }

  try {
    const parsed = Number(config.timeoutMs);
    checks.push({
      name: "config timeoutMs",
      ok: Number.isFinite(parsed) && parsed > 0,
      detail: String(config.timeoutMs),
    });
  } catch (error) {
    checks.push({ name: "config timeoutMs", ok: false, detail: String(error) });
  }

  for (const check of checks) {
    const marker = check.ok ? "OK" : "FAIL";
    console.log(`[${marker}] ${check.name}: ${check.detail}`);
  }

  return checks.every((check) => check.ok) ? 0 : 1;
}
