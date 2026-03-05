import { describe, expect, test } from "bun:test";
import { clipboardCommandsForPlatform } from "../src/ui/clipboard";

describe("clipboardCommandsForPlatform", () => {
  test("returns macOS clipboard command", () => {
    const commands = clipboardCommandsForPlatform("darwin");
    expect(commands[0]?.command).toBe("pbcopy");
  });

  test("returns Windows clipboard commands", () => {
    const commands = clipboardCommandsForPlatform("win32");
    expect(commands.some((item) => item.command === "clip")).toBe(true);
  });

  test("returns Linux clipboard fallbacks", () => {
    const commands = clipboardCommandsForPlatform("linux");
    expect(commands.some((item) => item.command === "wl-copy")).toBe(true);
    expect(commands.some((item) => item.command === "xclip")).toBe(true);
    expect(commands.some((item) => item.command === "xsel")).toBe(true);
  });
});
