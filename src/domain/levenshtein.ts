export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const left = curr[j - 1] ?? Number.MAX_SAFE_INTEGER;
      const up = prev[j] ?? Number.MAX_SAFE_INTEGER;
      const diag = prev[j - 1] ?? Number.MAX_SAFE_INTEGER;
      curr[j] = Math.min(left + 1, up + 1, diag + cost);
    }

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j] ?? Number.MAX_SAFE_INTEGER;
    }
  }

  return prev[b.length] ?? b.length;
}
