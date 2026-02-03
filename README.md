# Opencode Workflows Manager

Terminal UI for browsing and syncing OpenCode workflow registries.
Built for end users: pick packs/agents/skills/commands and sync them into your OpenCode config.

## Install

This CLI runs with Bun.

```bash
bunx @howaboua/opencode-workflows-manager
```

Optional global install:

```bash
bun add -g @howaboua/opencode-workflows-manager
opencode-workflows-manager
```

## Usage

```bash
opencode-workflows-manager
```

Navigation:

- Up/Down: move
- Left/Right: expand/collapse
- Space: select
- Enter: sync
- Tab: toggle global/local install mode
- A: about
- Esc: back

Global mode installs to `~/.config/opencode/`. Local mode installs to `.opencode/` in the current repo.
Docs are excluded in global mode by design.

## Admin Mode (Registry Builder)

```bash
opencode-workflows-manager --admin
```

Admin mode lets you scan a repo and generate `registry.json` + `registry.toml` for a new pack.
It supports folder selection, pack assignment, and nested skill assets.

## Registry Sources

By default, the CLI loads registry sources from:

```
https://raw.githubusercontent.com/IgorWarzocha/opencode-workflows-manager/<branch>/registries.json
```

Branches are tried in order: `master`, `main`, `universal`.
If remote fetch fails, the CLI falls back to a local `registries.json` in the current working directory.

## Get Your Repo Featured

The CLI fetches registry sources from this repo’s `registries.json`.
If you want your workflows repository featured, open an issue here and see `CONTRIBUTING.md` for the required details:

```
https://github.com/IgorWarzocha/opencode-workflows-manager/issues
```

## License

MIT
