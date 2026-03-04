# Contributing to oxf

Thanks for contributing. This project is a Bun + TypeScript CLI with a local-first dictionary workflow.

## Prerequisites

- Bun `>= 1.3.9`
- Git

## Setup

```bash
bun install
bun run build:core
```

Optional full offline dataset:

```bash
bun run build:full
bun run start -- sync --manifest ./assets/manifest.json
```

## Development workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run quality checks:

```bash
bun run check
```

4. Commit with Conventional Commits:
   - `feat(scope): ...`
   - `fix(scope): ...`
   - `docs(scope): ...`

## Quality gates

- `pre-commit`: `lint-staged` (Biome + markdownlint for staged files)
- `commit-msg`: commitlint conventional commit validation
- `pre-push`: `bun run check`

Useful commands:

```bash
bun run lint
bun run lint:fix
bun run lint:md
bun run lint:md:fix
bun run typecheck
bun run test
```

## Data and assets

- Keep generated DB artifacts intentional.
- If you change DB generation logic (`scripts/build-*.ts`), regenerate related assets and manifest.
- Avoid adding temporary debug scripts at repo root. Put reusable checks under `test/`.

## Pull requests

Before opening a PR:

1. Ensure `bun run check` passes.
2. Ensure docs are updated for behavior or command changes.
3. Keep commits scoped and readable.
