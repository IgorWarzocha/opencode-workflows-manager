//Provides file system utilities for scanning directories and markdown files.
//Handles filtering of excluded directories and documents.

import fs from "fs-extra";
import path from "path";

const EXCLUDED_DOCS = new Set(["README.md", "readme.md", "README", "readme", "README.txt", "readme.txt"]);
const EXCLUDED_DIRS = new Set(["node_modules", "build", "dist", ".git"]);

export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  const exists = await fs.pathExists(dirPath);
  if (!exists) return [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && !EXCLUDED_DOCS.has(entry.name))
    .map((entry) => entry.name);
}

export async function listDirectories(dirPath: string): Promise<string[]> {
  const exists = await fs.pathExists(dirPath);
  if (!exists) return [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export function shouldSkipDir(name: string): boolean {
  if (EXCLUDED_DIRS.has(name)) return true;
  if (name.startsWith(".") && name !== ".opencode") return true;
  return false;
}

export async function listFilesRecursive(rootDir: string, relative = ""): Promise<string[]> {
  const fullPath = path.join(rootDir, relative);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      const nested = await listFilesRecursive(rootDir, path.join(relative, entry.name));
      files.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md") && !EXCLUDED_DOCS.has(entry.name)) {
      files.push(path.join(relative, entry.name));
    }
  }

  return files;
}

export async function listDirectoriesRecursive(rootDir: string, relative = ""): Promise<string[]> {
  const fullPath = path.join(rootDir, relative);
  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  const dirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipDir(entry.name)) continue;
    const next = path.join(relative, entry.name);
    dirs.push(next);
    const nested = await listDirectoriesRecursive(rootDir, next);
    dirs.push(...nested);
  }
  return dirs;
}
