---
"@kitsunekode/oxf": minor
---

# Add oxf setup command with download progress

- New `oxf setup` command downloads the full WordNet dataset with a visual progress bar
- Download progress shows percentage, bytes transferred, and total size
- README restructured to recommend `oxf setup` as the first command
- `full.db` removed from git, added to .gitignore (released via GitHub assets)
- Exported sync utilities (`readManifest`, `resolveAssetLocation`, `readBytesWithProgress`, `looksLikeSqlite`) for reuse
