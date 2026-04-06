# @kitsunekode/oxf

## 0.2.0

### Minor Changes

- c162dca: # Add oxf setup command with download progress

  - New `oxf setup` command downloads the full WordNet dataset with a visual progress bar
  - Download progress shows percentage, bytes transferred, and total size
  - README restructured to recommend `oxf setup` as the first command
  - `full.db` removed from git, added to .gitignore (released via GitHub assets)
  - Exported sync utilities (`readManifest`, `resolveAssetLocation`, `readBytesWithProgress`, `looksLikeSqlite`) for reuse

## 0.1.1

### Patch Changes

- e767f34: # Patch release notes

  Fix first-run behavior for global installs by auto-syncing the full WordNet dataset instead of staying on the bundled core lexicon.

  Also refactors sync logic into a shared utility, improves auto-sync failure visibility, updates config key messaging for `autoSync`, and adds test coverage for local-manifest auto-sync bootstrap.
