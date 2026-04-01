import { getConfigValue, isConfigKey, setConfigValue } from "../config/config";

export async function runConfigCommand(args: string[]): Promise<number> {
  const action = args[0];
  const key = args[1];

  if (!action || (action !== "get" && action !== "set")) {
    console.error("Usage: oxf config get <key> | oxf config set <key> <value>");
    return 1;
  }

  if (!key || !isConfigKey(key)) {
    console.error(
      "Invalid key. Allowed keys: syncManifestUrl, enrichmentCacheTtlHours, timeoutMs, color, autoSync",
    );
    return 1;
  }

  if (action === "get") {
    const value = await getConfigValue(key);
    console.log(String(value));
    return 0;
  }

  const value = args[2];
  if (value === undefined) {
    console.error("Missing value for config set");
    return 1;
  }

  await setConfigValue(key, value);
  console.log(`Updated ${key}=${value}`);
  return 0;
}
