import { homedir } from "node:os";
import { join } from "node:path";

export interface AppPaths {
  dataDir: string;
  configDir: string;
  configFile: string;
  dbPath: string;
  metaPath: string;
}

export function getAppPaths(): AppPaths {
  const home = homedir();
  const dataHome = process.env.XDG_DATA_HOME ?? join(home, ".local", "share");
  const configHome = process.env.XDG_CONFIG_HOME ?? join(home, ".config");

  const dataDir = join(dataHome, "oxf");
  const configDir = join(configHome, "oxf");

  return {
    dataDir,
    configDir,
    configFile: join(configDir, "config.json"),
    dbPath: join(dataDir, "dict.db"),
    metaPath: join(dataDir, "meta.json"),
  };
}
