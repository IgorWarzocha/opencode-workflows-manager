/**
 * registry.ts
 * Handles registry loading and target path resolution.
 * Prefixes specialized items with .opencode/ when needed.
 */

import fs from "fs-extra";
import path from "path";
import type { Registry, RegistryItem, Pack, InstallMode } from "./types";
import { GLOBAL_INSTALL_DIR, LOCAL_INSTALL_DIR } from "./config";
import { fetchJson } from "./github";

const PREFIXED_TYPES = new Set(["agent", "skill", "command"]);

export function resolveTargetPath(item: RegistryItem, mode: InstallMode): string {
  const baseDir = mode === "global" ? GLOBAL_INSTALL_DIR : LOCAL_INSTALL_DIR;
  
  if (PREFIXED_TYPES.has(item.type)) {
    return path.join(baseDir, item.target);
  }
  // For non-prefixed types (docs), install relative to cwd
  return path.join(process.cwd(), item.target);
}

export async function loadRegistry(): Promise<Registry | null> {
  return fetchJson<Registry>("registry.json");
}

export function getAllItems(registry: Registry): RegistryItem[] {
  return [
    ...registry.packs.flatMap((p: Pack) => p.items),
    ...registry.standalone,
  ];
}

export async function findInstalledItems(
  items: RegistryItem[],
  mode: InstallMode
): Promise<Set<RegistryItem>> {
  const installed = new Set<RegistryItem>();
  for (const item of items) {
    const exists = await fs.pathExists(resolveTargetPath(item, mode));
    if (exists) {
      installed.add(item);
    }
  }
  return installed;
}
