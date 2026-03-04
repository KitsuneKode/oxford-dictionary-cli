import { runConfigCommand } from "./commands/config";
import { runDoctorCommand } from "./commands/doctor";
import { runLookupCommand } from "./commands/lookup";
import { runStatusCommand } from "./commands/status";
import { runSyncCommand } from "./commands/sync";
import { loadConfig } from "./config/config";
import { openDictionaryStore } from "./db/store";
import type { LookupOptions, OxfConfig } from "./types";
import { askNextLookupQuery } from "./ui/prompt";

interface ParsedLookup {
  word: string;
  options: LookupOptions;
}

function printHelp(): void {
  console.log(`oxf - local-first dictionary CLI

Usage:
  oxf <word>
  oxf lookup <word> [--json] [--more] [--online] [--timeout <ms>] [--no-color]
  oxf sync [--channel stable|latest] [--manifest <url-or-path>]
  oxf status
  oxf doctor
  oxf config get <key>
  oxf config set <key> <value>

Config keys:
  syncManifestUrl
  enrichmentCacheTtlHours
  timeoutMs
  color
`);
}

function parseLookupArgs(args: string[], defaultTimeout: number): ParsedLookup {
  const words: string[] = [];
  const options: LookupOptions = {
    json: false,
    more: false,
    online: false,
    timeoutMs: defaultTimeout,
    noColor: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token) {
      continue;
    }

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--more") {
      options.more = true;
      continue;
    }

    if (token === "--online") {
      options.online = true;
      continue;
    }

    if (token === "--no-color") {
      options.noColor = true;
      continue;
    }

    if (token === "--timeout") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Missing value for --timeout");
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("--timeout must be a positive number");
      }

      options.timeoutMs = parsed;
      index += 1;
      continue;
    }

    if (token.startsWith("-")) {
      throw new Error(`Unknown lookup flag: ${token}`);
    }

    words.push(token);
  }

  const word = words.join(" ").trim();
  if (!word) {
    throw new Error("Missing <word> argument");
  }

  return { word, options };
}

function parseSyncArgs(args: string[]): { channel: string; manifest?: string } {
  let channel = "stable";
  let manifest: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--channel") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Missing value for --channel");
      }
      channel = value;
      index += 1;
      continue;
    }

    if (token === "--manifest") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Missing value for --manifest");
      }
      manifest = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown sync argument: ${token}`);
  }

  return { channel, manifest };
}

async function runLookupSession(
  initialWord: string,
  options: LookupOptions,
  config: OxfConfig,
): Promise<number> {
  const store = await openDictionaryStore(config);
  let lastExitCode = 0;
  let currentWord = initialWord;

  try {
    while (true) {
      lastExitCode = await runLookupCommand({
        word: currentWord,
        options: {
          ...options,
          timeoutMs: options.timeoutMs || config.timeoutMs,
        },
        config,
        store,
      });

      const shouldLoop = process.stdin.isTTY && process.stdout.isTTY && !options.json;
      if (!shouldLoop) {
        return lastExitCode;
      }

      console.log();
      const next = await askNextLookupQuery();
      if (!next) {
        return 0;
      }

      currentWord = next;
      console.log();
    }
  } finally {
    store.close();
  }
}

export async function runCli(argv: string[]): Promise<number> {
  const config = await loadConfig();

  const first = argv[0];
  if (!first || first === "--help" || first === "-h") {
    printHelp();
    return 0;
  }

  const rest = argv.slice(1);

  if (first === "lookup") {
    const parsed = parseLookupArgs(rest, config.timeoutMs);
    return await runLookupSession(parsed.word, parsed.options, config);
  }

  if (first === "sync") {
    const options = parseSyncArgs(rest);
    return await runSyncCommand(config, options);
  }

  if (first === "status") {
    return await runStatusCommand(config);
  }

  if (first === "doctor") {
    return await runDoctorCommand(config);
  }

  if (first === "config") {
    return await runConfigCommand(rest);
  }

  if (first.startsWith("-")) {
    throw new Error(`Unknown command: ${first}`);
  }

  const parsed = parseLookupArgs(argv, config.timeoutMs);
  return await runLookupSession(parsed.word, parsed.options, config);
}
