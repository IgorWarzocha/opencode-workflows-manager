<instructions>
## Verification & One-Shot Commands
- **Type Check**: `bun x tsc --noEmit` (MANDATORY before submission).
- **Registry Check**: `cat registry.toml` (Verify path mappings).
- **Prohibited**: MUST NOT run `bun run dev` or any long-running process.
</instructions>

<rules>
## Technical Conventions
- **TUI Framework**: Solid.js + OpenTUI (`@opentui/solid`). Use reactive primitives (`createSignal`, `createMemo`).
- **Styles**: Use `<span>` for inline styling; nested `<text>` inside `<text>` MUST be avoided (freezes UI).
- **File Ops**: MUST use `fs-extra` for all filesystem operations.
- **Standards**: MUST use RFC 2119 uppercase keywords (MUST, SHOULD, MAY).
</rules>

<routing>
## Core Routing
| Component | Primary Files |
|-----------|---------------|
| UI Entry | `src/index.tsx`, `src/components.tsx` |
| Registry Logic | `src/registries.ts`, `src/registry.ts`, `src/registry-config.ts` |
| Sync Engine | `src/sync.ts` |
| Wizard | `src/registry-wizard/*.ts` (scan, write, types) |
| Views | `src/components/*.tsx` (Selection, Confirm, Sync, etc.) |
| Config | `registry.toml`, `registries.json`, `src/types.ts` |
</routing>

<context>
## Architecture Details
- **Resolution**: Resolves `globalDir` (~/.config/opencode) and `localDir` (.opencode) via `registry.toml`.
- **Registry**: Manages `packs` (collections) and `standalone` items (agents, skills, commands).
- **JSX**: Configured for `@opentui/solid` via `tsconfig.json`.
</context>

<safety>
## Safety & Constraints
- **Restricted**: `node_modules/`, `bun.lock`, and `bun.lockb` MUST NOT be modified.
- **Path Safety**: Path manipulations MUST respect `globalDir` and `localDir` constraints.
</safety>
