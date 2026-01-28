<instructions>
## Verification & Dev Flow
This project is a **Workflow Selector CLI** built with Bun, Solid.js, and OpenTUI.
- **Type Check**: `bun x tsc --noEmit` (MANDATORY verification command).
- **Execution**: `bun run src/index.tsx` (PROHIBITED; direct execution is for users only).
- **Constraints**: MUST NOT run `bun run dev` or any long-running/blocking process.
- **Verification**: Changes MUST be verified via `tsc` before submission.
</instructions>

<rules>
## Technical Conventions
- **Solid.js + OpenTUI**: Uses `@opentui/solid` for TUI rendering. Follow Solid.js reactive patterns (`createSignal`, `createMemo`, `Show`, `For`).
- **Keyboard Handling**: Use the `useKeyboard` hook from `@opentui/solid` for input management.
- **Registry Management**: Interacts with `registry.json` at the repository root. Uses `fs-extra` for file operations.
- **RFC 2119**: MUST use uppercase keywords (MUST, SHOULD, MAY) for requirements.
- **File System**: MUST use `fs-extra` for all file operations to ensure compatibility.
</rules>

<routing>
## Task Navigation
| Feature | Path |
|---------|------|
| TUI Components & UI Logic | `src/index.tsx` |
| Sync & File Ops Logic | `src/index.tsx` (see `performSync`) |
| Registry Definition | `../registry.json` (parent directory relative to project) |
| TS Configuration | `tsconfig.json` |
| Dependencies | `package.json` |
</routing>

<context>
## Architecture Details
- **Path Resolution**: The app resolves `ROOT_DIR` relative to `src/index.tsx` (pointing two levels up).
- **Registry Structure**: Supports `packs` (collections) and `standalone` items (agents, skills, commands, docs).
- **Target Paths**: Specialized items are automatically prefixed with `.opencode/` unless already present.
- **JSX Engine**: Uses `jsxImportSource: "@opentui/solid"` as configured in `tsconfig.json`.
</context>

<safety>
## Safety & Constraints
- **Read-Only Paths**: `node_modules/` and `bun.lock` MUST NOT be modified manually.
- **Process Isolation**: The CLI interacts with the host filesystem; ensure all path manipulations are relative to `ROOT_DIR`.
</safety>
