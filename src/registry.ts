/**
 * registry.ts
 * Handles registry loading and target path resolution.
 * Prefixes specialized items with .opencode/ when needed.
 */

import fs from "fs-extra";
import path from "path";
import type { Registry, RegistryItem, Pack, InstallMode } from "./types";
import type { AppConfig } from "./registry-config";

export function resolveTargetPath(
  item: RegistryItem,
  mode: InstallMode,
  config: AppConfig
): string {
  const baseDir = mode === "global" ? config.install.globalDir : config.install.localDir;
  
  if (config.install.prefixTypes.includes(item.type)) {
    return path.join(baseDir, item.target);
  }
  // For non-prefixed types (docs), install relative to cwd
  return path.join(process.cwd(), item.target);
}

export function getAllItems(registry: Registry): RegistryItem[] {
  return [
    ...registry.packs.flatMap((p: Pack) => p.items),
    ...registry.standalone,
  ];
}

export async function findInstalledItems(
  items: RegistryItem[],
  mode: InstallMode,
  config: AppConfig
): Promise<Set<RegistryItem>> {
  const installed = new Set<RegistryItem>();
  for (const item of items) {
    const exists = await fs.pathExists(resolveTargetPath(item, mode, config));
    if (exists) {
      installed.add(item);
    }
  }
  return installed;
}
