# Contributing

This guide explains how to get your workflows repository included in the default registry list used by the CLI.

## How Inclusion Works

The CLI fetches registry sources from this repo’s `registries.json` via raw GitHub.
When your repo is added there, it becomes available to everyone.

## Request Inclusion

Open an issue with the following:

- Repository URL
- Short description (1–2 sentences)
- Confirmation that your repo contains `registry.json` and `registry.toml`
- Optional: screenshot of the registry wizard output

Issue tracker:

```
https://github.com/IgorWarzocha/opencode-workflows-manager/issues
```

## Admin Mode Guide (Generate Registry Files)

Run the wizard from the root of your workflows repository:

```bash
opencode-workflows-manager --admin
```

Steps:

1. Select root folders (recommended: `/agents /commands /skills /docs`).
2. Select what to include. Use Tab to mark folders as packs.
3. Enter repo URL and a short description.
4. Generate `registry.json` and `registry.toml`.

Notes:

- Nested skill assets (references/scripts) are treated as skill files.
- Docs are included for local usage but excluded from global installs.
- The wizard does not scan file contents during the root selection step.

## Notes

- The CLI tries branches in order: `master`, `main`, `universal`.
- If the remote list is unavailable, it falls back to a local `registries.json`.
