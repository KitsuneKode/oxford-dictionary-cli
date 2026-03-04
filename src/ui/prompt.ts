import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

export type PromptChoice = "m" | "e" | "s" | "a" | "f" | "o" | "q";

const ALLOWED = new Set<PromptChoice>(["m", "e", "s", "a", "f", "o", "q"]);

export async function askDetailChoice(): Promise<PromptChoice> {
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    const answer = await rl.question(
      "[M]ore [E]xamples [S]ynonyms [A]ntonyms [F]orms [O]nline [Q]uit: ",
    );
    const choice = answer.trim().toLowerCase().slice(0, 1) as PromptChoice;
    if (ALLOWED.has(choice)) {
      return choice;
    }

    return "q";
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
