import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { style } from "./styles";

export async function askDetailChoice(currentWord: string, colorEnabled: boolean): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const highlightedWord = style(currentWord, "bold", { colorEnabled });
    const answer = await rl.question(
      `[word: ${highlightedWord}] [M]ore [E]xamples [S]ynonyms [A]ntonyms [F]orms [O]nline [C]opy [Q]uit | type next word then Enter: `,
    );
    return answer.trim();
  } finally {
    rl.close();
  }
}

export async function askSuggestionChoice(maxOptions: number): Promise<number | null> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question(`Choose 1-${maxOptions} or press Enter to skip: `);
    const normalized = answer.trim().toLowerCase();
    if (!normalized || normalized === "q") {
      return null;
    }

    const selected = Number(normalized);
    if (!Number.isInteger(selected) || selected < 1 || selected > maxOptions) {
      return null;
    }

    return selected - 1;
  } finally {
    rl.close();
  }
}

export async function askNextLookupQuery(): Promise<string | null> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question(
      "Next word (Enter to quit, or type query then Enter; q/quit/exit also quits): ",
    );
    const trimmed = answer.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === "q" || normalized === "quit" || normalized === "exit") {
      return null;
    }

    return trimmed;
  } finally {
    rl.close();
  }
}
