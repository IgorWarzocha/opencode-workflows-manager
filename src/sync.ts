/**
 * sync.ts
 * Executes file sync operations: installing and removing workflow items.
 * Fetches content from GitHub and writes to local filesystem.
 */

import fs from "fs-extra";
import path from "path";
import type { RegistryItem, Changes, InstallMode } from "./types";
import type { AppConfig } from "./registry-config";
import { resolveTargetPath } from "./registry";
import { fetchRawContent } from "./github";

export type SyncLogCallback = (message: string) => void;

export async function performSync(
  changes: Changes,
  mode: InstallMode,
  config: AppConfig,
  onLog: SyncLogCallback
): Promise<void> {
  for (const item of changes.remove) {
    const dest = resolveTargetPath(item, mode, config);
    await fs.remove(dest);
    onLog(`Removed ${item.name}`);
  }

  for (const item of changes.install) {
    const content = await fetchRawContent(item.path);
    const dest = resolveTargetPath(item, mode, config);
    await fs.ensureDir(path.dirname(dest));
    await fs.writeFile(dest, content, "utf-8");
    onLog(`Installed ${item.name}`);
  }

  for (const item of changes.refresh) {
    const content = await fetchRawContent(item.path);
    const dest = resolveTargetPath(item, mode, config);
    await fs.ensureDir(path.dirname(dest));
    await fs.writeFile(dest, content, "utf-8");
    onLog(`Updated ${item.name}`);
  }
}
