import { spawnSync } from "node:child_process";

interface ClipboardCommand {
  command: string;
  args: string[];
}

export interface ClipboardCopyResult {
  ok: boolean;
  method?: string;
  error?: string;
}

export function clipboardCommandsForPlatform(platform: NodeJS.Platform): ClipboardCommand[] {
  if (platform === "darwin") {
    return [{ command: "pbcopy", args: [] }];
  }

  if (platform === "win32") {
    return [
      { command: "clip", args: [] },
      { command: "powershell", args: ["-NoProfile", "-Command", "Set-Clipboard"] },
    ];
  }

  return [
    { command: "wl-copy", args: [] },
    { command: "xclip", args: ["-selection", "clipboard"] },
    { command: "xsel", args: ["--clipboard", "--input"] },
    { command: "clip.exe", args: [] },
  ];
}

function tryClipboardCommand(command: ClipboardCommand, text: string): boolean {
  try {
    const result = spawnSync(command.command, command.args, {
      input: text,
      stdio: ["pipe", "ignore", "ignore"],
    });
    return result.status === 0 && !result.error;
  } catch {
    return false;
  }
}

export function copyToClipboard(text: string): ClipboardCopyResult {
  if (!text.trim()) {
    return {
      ok: false,
      error: "Nothing to copy.",
    };
  }

  const commands = clipboardCommandsForPlatform(process.platform);
  for (const command of commands) {
    if (tryClipboardCommand(command, text)) {
      return {
        ok: true,
        method: command.command,
      };
    }
  }

  return {
    ok: false,
    error:
      "No supported clipboard utility found (tried pbcopy/clip/wl-copy/xclip/xsel). Install one and retry.",
  };
}
