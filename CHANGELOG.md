# @kitsunekode/oxf

## 0.1.1

### Patch Changes

- e767f34: # Patch release notes

  Fix first-run behavior for global installs by auto-syncing the full WordNet dataset instead of staying on the bundled core lexicon.

  Also refactors sync logic into a shared utility, improves auto-sync failure visibility, updates config key messaging for `autoSync`, and adds test coverage for local-manifest auto-sync bootstrap.
