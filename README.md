# oxf

High-performance local-first dictionary CLI built with Bun + TypeScript.

## Prerequisites

- Bun `>= 1.3.9`

## Install dependencies

```bash
bun install
```

## Run locally

```bash
bun run start -- dogmatic
```

Executable entrypoint: `bin/oxf.ts`

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

## Quality workflow

```bash
bun run lint
bun run lint:fix
bun run typecheck
bun run check
```

- Biome config: `.biome.json`
- Pre-commit hook: lint staged files via Biome
- Pre-push hook: runs `bun run check`

## Additional docs

- Distribution and publishing: `docs/distribution.md`
- Launch messaging and social templates: `docs/launch.md`
- Oxford-style lookup architecture and data model: `docs/oxford-style.md`
