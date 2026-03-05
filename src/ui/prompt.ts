import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

export async function askDetailChoice(): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question(
      "[M]ore [E]xamples [S]ynonyms [A]ntonyms [F]orms [O]nline [C]opy [Q]uit | type next word: ",
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
    const answer = await rl.question("Next word (Enter/q to quit, or type another query): ");
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
