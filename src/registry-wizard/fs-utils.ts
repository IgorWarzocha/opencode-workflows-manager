//Provides file system utilities for scanning directories and markdown files.
//Handles filtering of excluded directories and documents.

import fs from "fs-extra";
import { EXCLUDED_FOLDERS } from "./excluded-folders";

export async function listDirectories(dirPath: string): Promise<string[]> {
  const exists = await fs.pathExists(dirPath);
  if (!exists) return [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export function shouldSkipDir(name: string): boolean {
  return EXCLUDED_FOLDERS.has(name);
}
