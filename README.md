# oxf

High-performance local-first dictionary CLI built with Bun + TypeScript.

## Prerequisites

- Bun `>= 1.3.9`

## Install dependencies

```bash
bun install
```

## Run locally (no global install)

Use `bun run start -- ...` directly from this repo:

```bash
bun run start -- dogmatic
bun run start -- lookup dogmatic --more
bun run start -- status
```

## Install system-wide with Bun link

```bash
bun run link:global
oxf dogmatic
oxf status
```

To remove the global link:

```bash
bun run unlink:global
```

## First-time offline setup (recommended)

1. Build local dataset artifacts:

```bash
bun run build:core
bun run build:full
```

2. Sync from local manifest artifact:

```bash
bun run start -- sync --channel stable --manifest ./assets/manifest.json
```

3. Re-check status:

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

## Shell autocomplete

Completion scripts are available in `completions/`:

- Bash: `completions/oxf.bash`
- Zsh: `completions/_oxf`

Enable for current shell session:

```bash
# bash
source ./completions/oxf.bash

# zsh
fpath=(./completions $fpath)
autoload -Uz compinit && compinit
```

Enable permanently (recommended):

```bash
# bash
mkdir -p ~/.local/share/bash-completion/completions
cp ./completions/oxf.bash ~/.local/share/bash-completion/completions/oxf
```

```bash
# zsh
mkdir -p ~/.zsh/completions
cp ./completions/_oxf ~/.zsh/completions/_oxf
```

Then add this to `~/.zshrc` if not already present:

```bash
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit
compinit
```

## How to use (practical)

Local run from this repo:

```bash
bun run start -- undogmatic
```

Global run after `bun run link:global`:

```bash
oxf undogmatic
```

Interactive lookup flow:

```bash
oxf dogmatic
```

- Type feature keys in prompt (`m`, `e`, `s`, `a`, `f`, `o`) for more details.
- Press `c` to copy the current lookup snapshot to system clipboard.
- Type another word and press Enter to lookup immediately.
- Press Enter on empty input, `q`, `quit`, or `exit` to close.

## Notes

- First use is instant with bundled local core lexicon.
- `oxf sync` can replace local DB using a manifest URL/path (for large offline coverage).
- Online enrichment is opt-in only (`--online` or interactive `O`).
- If a word is missing locally, `oxf` attempts a fast online fallback (short timeout) and caches results.
- In interactive terminal mode, you can keep searching continuously and exit with `q`/`quit` or `Ctrl+C`.

## Data coverage and fallback behavior

- Current bundled local dataset is intentionally small (`core-1.0.0`, 15 entries) for instant first-run speed.
- `build:full` now builds a much larger offline dataset from WordNet 3.1 into `assets/full.db`.
- After `build:full` + `sync`, local coverage is significantly broader.
- If no local exact match:
  - `oxf` first attempts a short-timeout online exact lookup.
  - if online exact is unavailable, it tries local smart candidates/suggestions.
- For best offline-first behavior, run `build:full` and sync that DB before relying on fallback.

## Quality workflow

```bash
bun run lint
bun run lint:fix
bun run lint:md
bun run lint:md:fix
bun run typecheck
bun run check
bun run pkg:check
```

- Biome config: `.biome.json`
- Markdownlint config: `.markdownlint-cli2.jsonc`
- Pre-commit hook: lint staged files via Biome + markdownlint
- Commit message hook: conventional commit validation via commitlint
- Pre-push hook: runs `bun run check`

## Additional docs

- Contribution guide: `CONTRIBUTING.md`
- Distribution and publishing: `docs/distribution.md`
- Launch messaging and social templates: `docs/launch.md`
- Oxford-style lookup architecture and data model: `docs/oxford-style.md`
