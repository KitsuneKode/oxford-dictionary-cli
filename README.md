# oxf

High-performance local-first dictionary CLI built with Bun + TypeScript.

## Prerequisites

- Bun `>= 1.3.9`

## Install dependencies

```bash
bun install
```

## Quick start (step-by-step)

1. Run a lookup:

```bash
bun run start -- dogmatic
```

2. Check local dataset status:

```bash
bun run start -- status
```

3. Build local dataset artifacts:

```bash
bun run build:core
bun run build:full
```

4. Sync from local manifest artifact:

```bash
bun run start -- sync --channel stable --manifest ./assets/manifest.json
```

5. Re-check status:

```bash
bun run start -- status
```

Executable entrypoint: `bin/oxf.ts` (global command: `oxf`)

## Usage

```bash
oxf <word>
oxf lookup <word> [--json] [--more] [--online] [--timeout <ms>] [--no-color]
oxf sync [--channel stable|latest] [--manifest <url-or-path>]
oxf status
oxf doctor
oxf config get <key>
oxf config set <key> <value>
```

## Global install (local development)

```bash
bun run link:global
oxf dogmatic
```

To remove it:

```bash
bun run unlink:global
```

## Notes

- First use is instant with bundled local core lexicon.
- `oxf sync` can replace local DB using a manifest URL/path.
- Online enrichment is opt-in only (`--online` or interactive `O`).
- If a word is missing locally, `oxf` attempts a fast online fallback (short timeout) and caches results.
- In interactive terminal mode, you can keep searching continuously and exit with `Enter`, `q`, or `Ctrl+C`.

## Data coverage and fallback behavior

- Current bundled local dataset is intentionally small (`core-1.0.0`, 15 entries).
- So uncommon words often miss locally and may resolve via fast online fallback.
- If no local exact match:
  - `oxf` first attempts a short-timeout online exact lookup.
  - if online exact is unavailable, it tries local smart candidates/suggestions.
- `build:full` currently generates a demo full DB from local core data; it is not yet a large production dictionary dump.
- To get true offline-first coverage, you need a larger synced DB generated from a real dictionary source.

## Quality workflow

```bash
bun run lint
bun run lint:fix
bun run typecheck
bun run check
bun run pkg:check
```

- Biome config: `.biome.json`
- Pre-commit hook: lint staged files via Biome
- Commit message hook: conventional commit validation via commitlint
- Pre-push hook: runs `bun run check`

## Additional docs

- Distribution and publishing: `docs/distribution.md`
- Launch messaging and social templates: `docs/launch.md`
- Oxford-style lookup architecture and data model: `docs/oxford-style.md`
