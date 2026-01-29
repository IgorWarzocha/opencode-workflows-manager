# Registry Specification

This document describes how to structure a repository so it can be consumed by Opencode Workflows Manager.

## Required Files (repo root)

### 1) `registry.json`
Machine-readable registry data (no comments). This is the source of packs and standalone items.

**Shape:**
- `name`: string
- `version`: string
- `packs`: array of packs
- `standalone`: array of registry items

**Pack shape:**
- `name`: string
- `description`: string
- `path`: string (base directory of the pack in the repo)
- `items`: array of registry items

**Registry item shape:**
- `name`: string
- `description`: string
- `type`: one of `agent` | `skill` | `command` | `doc`
- `path`: string (path to the file in the repo)
- `target`: string (install target path)

Notes:
- `path` is relative to the repo root. The app resolves it to a raw GitHub URL.
- `target` for `agent`, `skill`, `command` is installed under the Opencode config dir.
- `target` for `doc` is installed relative to the current working directory.

### 2) `registry.toml`
Human-editable configuration. This is optional but recommended.

Supported keys:
```toml
[ui]
brand = "Howaboua"
product = "Opencode Workflows"

[ui.about]
lines = [
  "Short intro line 1",
  "Short intro line 2"
]
emphasis = "Markdown Is All You Need"
link = "https://github.com/your/repo"
linkNote = "Link note text"
footer = "Press any key to return..."

[install]
globalDir = "~/.config/opencode" # optional override
localDir = ".opencode"           # optional override
prefixTypes = ["agent", "skill", "command"]
```

## Local Registry Index (app root)

The app reads a local list of registries from `registries.json` (in the app root):

```json
[
  {
    "name": "Howaboua's Opencode Workflows",
    "description": "An ever evolving repository of Opencode workflow examples that might enhance your experience with it. I only left the stuff that actually works. YMMV.",
    "url": "https://github.com/IgorWarzocha/Opencode-Workflows"
  }
]
```

Each entry is a GitHub repo URL. The app fetches `registry.toml` and `registry.json` from that repo’s root.

## Notes

- The app checks `main` then `master` when fetching.
- Files are fetched via raw GitHub URLs and downloaded sequentially to avoid rate limits.
- Overwrites are intentional: customized files will be replaced by registry versions.
