const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
} as const;

export interface StyleOptions {
  colorEnabled: boolean;
}

export function style(text: string, code: keyof typeof ANSI, options: StyleOptions): string {
  if (!options.colorEnabled) {
    return text;
  }

  return `${ANSI[code]}${text}${ANSI.reset}`;
}

export function bullet(text: string): string {
  return `  - ${text}`;
}
