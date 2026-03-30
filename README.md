# oxf

High-performance local-first dictionary CLI built with Bun + TypeScript.

## Prerequisites

- Bun `>= 1.3.9`

## Install

```bash
bun add -g @kitsunekode/oxf
```

You can also install with npm if Bun is already available on your `PATH` at runtime:

```bash
npm install -g @kitsunekode/oxf
```

### Install from source

```bash
bun install
bun run link:global
```

## Run locally (no global install)

Use `bun run start -- ...` directly from this repo:

```bash
bun run start -- dogmatic
bun run start -- lookup dogmatic --more
bun run start -- status
```

## First-time offline setup (recommended)

```bash
oxf sync --channel stable
oxf status
```

The published package includes the fast core lexicon. `oxf sync` pulls the larger offline dataset from the latest GitHub release manifest by default.

## Local dataset workflow

If you are working from the repo and want to build the larger dataset locally:

```bash
bun run build:core
bun run build:full
bun run start -- sync --channel stable --manifest ./assets/manifest.json
```

Re-check status:

```bash
bun run start -- status
```

To remove the global source link:

```bash
bun run unlink:global
```

Published wrapper: `bin/oxf` (global command: `oxf`)

## Release Workflow

- Add a changeset with `bun run changeset` for user-facing or release-worthy changes.
- Work from short-lived branches and merge to `main`.
- `.github/workflows/version-packages.yml` opens or updates a `Version Packages` PR from merged changesets.
- Merging the version PR updates `package.json` and changelog entries for the next release.
- `CI` runs on pull requests and `main`, and its workflow summary records the exact package version it validated.
- `Release` runs on pushes to `main` and manual dispatch. It publishes the exact `package.json` version of `@kitsunekode/oxf` through npm trusted publishing, creates a GitHub release tagged `vX.Y.Z`, and uploads `manifest.json`, `full.db`, `checksums-vX.Y.Z.txt`, and `oxf-linux-x64-vX.Y.Z.tar.gz`.
- For a brand-new package, do one manual bootstrap publish first so the npm package settings page exists and you can attach the trusted publisher to `release.yml`.

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
- Zsh: `completions/oxf.zsh`

Enable for current shell session:

```bash
# bash
source ./completions/oxf.bash

# zsh
source ./completions/oxf.zsh
```

If completions still do not appear, reload zsh completion cache once:

```bash
rm -f "${XDG_CACHE_HOME:-$HOME/.cache}/zsh/.zcompdump-oxf"*
exec zsh
```

The Zsh completion already quotes the literal `--help`/`-h` branch so that any `--help` alias (e.g., `--help='--help 2>&1 | bat …'`) can’t inject redirections into the script. Keep the shipped file synced if you copy it elsewhere; otherwise mirror the quoted `status|doctor|'--help'|'-h'` branch in your own completion to avoid parse errors.

Enable permanently (recommended):

```bash
# bash
mkdir -p ~/.local/share/bash-completion/completions
cp ./completions/oxf.bash ~/.local/share/bash-completion/completions/oxf
```

```bash
# zsh
mkdir -p ~/.zsh/completions
cp ./completions/oxf.zsh ~/.zsh/completions/_oxf
```

Then add this to `~/.zshrc` if not already present:

```bash
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit
compinit -d "${XDG_CACHE_HOME:-$HOME/.cache}/zsh/.zcompdump-oxf"
source ~/.zsh/completions/_oxf
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
- If a word is missing locally, `oxf` attempts a fast smart online fallback (exact first, then relevant candidates) and caches results.
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

Release assets:

- `manifest.json` and `full.db` are uploaded to the matching GitHub release for `oxf sync`
- `oxf-linux-x64-vX.Y.Z.tar.gz` is the versioned Bun binary bundle for direct download
- `checksums-vX.Y.Z.txt` is uploaded alongside the release assets
- release versions are prepared through Changesets and the `Version Packages` PR flow

## Additional docs

- Contribution guide: `CONTRIBUTING.md`
- Distribution and publishing: `docs/distribution.md`
- Launch messaging and social templates: `docs/launch.md`
- Oxford-style lookup architecture and data model: `docs/oxford-style.md`
