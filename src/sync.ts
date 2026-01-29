/**
 * sync.ts
 * Executes file sync operations with a sequential rate-limited downloader.
 * Writes installed or refreshed items to the configured targets.
 */

import fs from "fs-extra";
import path from "path";
import type { RegistryItem, Changes, InstallMode } from "./types";
import type { AppConfig } from "./registry-config";
import { resolveTargetPath } from "./registry";
import { fetchRawContent } from "./github";

export type SyncLogCallback = (message: string) => void;

const DOWNLOAD_DELAY_MS = 500;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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

  const downloads = [...changes.install, ...changes.refresh];
  let completed = 0;

  for (const item of downloads) {
    const content = await fetchRawContent(item.path);
    const dest = resolveTargetPath(item, mode, config);
    await fs.ensureDir(path.dirname(dest));
    await fs.writeFile(dest, content, "utf-8");
    completed += 1;
    onLog(`Synced ${completed}/${downloads.length}: ${item.name}`);
    if (completed < downloads.length) {
      await wait(DOWNLOAD_DELAY_MS);
    }
  }
}
