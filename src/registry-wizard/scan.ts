//Scans a directory tree and constructs Wizard Nodes for registry selection.
//Identifies agents, commands, skills, and documentation within the file structure.

import fs from "fs-extra";
import path from "path";
import type { Registry, RegistryItem, Pack, ItemType } from "../types";
import type { WizardItem, WizardNode } from "./types";
import { listDirectories, shouldSkipDir } from "./fs-utils";
import { buildItem, normalizeDescription, readFrontmatter } from "./item-builder";

const resolveItemType = (segments: string[], basename: string): { type: RegistryItem["type"]; target: string } => {
  const opencodeIndex = segments.indexOf(".opencode");
  const skillIdx = segments.indexOf("skill");

  if (skillIdx !== -1) {
    const skillDir = segments[skillIdx + 1];
    const relativeFromSkill = segments.slice(skillIdx + 2);
    if (skillDir && relativeFromSkill.length > 0) {
      return {
        type: "skill",
        target: path.join("skill", skillDir, ...relativeFromSkill),
      };
    }
  }

  if (opencodeIndex !== -1) {
    const opencodeType = segments[opencodeIndex + 1];
    switch (opencodeType) {
      case "agent":
        return { type: "agent", target: path.join("agent", basename) };
      case "command":
        return { type: "command", target: path.join("command", basename) };
      case "skill": {
        const skillDir = segments[opencodeIndex + 2];
        if (skillDir) {
          return { type: "skill", target: path.join("skill", skillDir, basename) };
        }
        return { type: "doc", target: basename };
      }
    }
  }

  // Fallback: look for direct type folders (nearest to file wins)
  // We check segments.slice(0, -1) to exclude the filename itself
  const parentSegments = segments.slice(0, -1);
  
  if (parentSegments.includes("command")) {
    return { type: "command", target: path.join("command", basename) };
  }
  
  if (segments.includes("skill")) {
    const fallbackSkillIdx = segments.lastIndexOf("skill");
    const skillDir = fallbackSkillIdx !== -1 ? segments[fallbackSkillIdx + 1] : undefined;
    if (skillDir) return { type: "skill", target: path.join("skill", skillDir, basename) };
  }

  if (parentSegments.includes("agent")) {
    return { type: "agent", target: path.join("agent", basename) };
  }

  // Default to agent ONLY if directly in the root 'agents/' folder
  if (segments[0] === "agents" && segments.length === 2) {
    return { type: "agent", target: path.join("agent", basename) };
  }

  return { type: "doc", target: basename };
};

export const scanRootTree = async (rootDir: string): Promise<WizardNode[]> => {
  const entries = await listDirectories(rootDir);
  return entries
    .filter((name) => !shouldSkipDir(name))
    .map((name) => ({
      id: `root:${name}`,
      label: name,
      type: "group",
      depth: 0,
      children: [],
      childrenLoaded: false,
    } satisfies WizardNode));
};

export async function scanWizardTree(rootDir: string, allowedRoots: string[]): Promise<WizardNode[]> {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const allowedList = allowedRoots.map((root) => normalize(root.trim())).filter(Boolean);
  const allowedSet = new Set(allowedList);
  if (allowedSet.size === 0) return [];

  const files: { relativePath: string; entry: fs.Dirent }[] = [];
  const items: WizardItem[] = [];
  const directories = new Set<string>();
  const walk = async (baseDir: string, baseLabel: string, relative = ""): Promise<void> => {
    const dirPath = relative.length > 0 ? path.join(baseDir, relative) : baseDir;
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;
        const next = relative.length > 0 ? path.join(relative, entry.name) : entry.name;
        const relPath = normalize(path.join(baseLabel, next));
        directories.add(relPath);
        await walk(baseDir, baseLabel, next);
      } else {
        const next = relative.length > 0 ? path.join(relative, entry.name) : entry.name;
        const relPath = normalize(path.join(baseLabel, next));
        files.push({ relativePath: relPath, entry });
      }
    }
  };

  for (const root of allowedSet) {
    if (shouldSkipDir(root)) continue;
    const rootPath = path.join(rootDir, root);
    if (!(await fs.pathExists(rootPath))) continue;
    directories.add(root);
    await walk(rootPath, root);
  }

  const EXCLUDED_FILES = new Set([
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
  ]);

  for (const { relativePath, entry } of files) {
    const segments = relativePath.split("/");
    const basename = entry.name;

    if (basename === "registry.json" || basename === "registry.toml") continue;
    if (basename.startsWith(".")) continue;
    if (EXCLUDED_FILES.has(basename)) continue;
    const loweredBase = basename.toLowerCase();
    if (loweredBase === "readme.md" || loweredBase === "readme.txt" || loweredBase === "readme") continue;

    const { type, target } = resolveItemType(segments, basename);
    const isMarkdown = entry.name.toLowerCase().endsWith(".md");
    const isSkillAsset = segments.includes("skill");
    if (!isMarkdown && !isSkillAsset) continue;

    const fullPath = path.join(rootDir, relativePath);
    let description = "";
    let resolvedName = basename.replace(/\.md$/i, "");

    if (isMarkdown) {
      const frontmatter = await readFrontmatter(fullPath);
      description = frontmatter.description ? normalizeDescription(frontmatter.description) : "";
      if (frontmatter.name) resolvedName = frontmatter.name.trim();
    }

    const repoPath = relativePath;
    const packName = (segments[0] === "agents" && segments.length > 1) ? segments[1] : undefined;
    const item = buildItem(type, resolvedName, repoPath, target, packName);
    item.description = description;
    items.push(item);
  }

  // Create nodes for all directories that were allowed
  const nodes: WizardNode[] = [];
  const nodeMap = new Map<string, WizardNode>();

  const getOrCreateNode = (fullPath: string, isFile = false, item?: WizardItem): WizardNode => {
    const normalizedPath = normalize(fullPath);
    if (nodeMap.has(normalizedPath)) {
      const existing = nodeMap.get(normalizedPath)!;
      if (item) existing.item = item;
      return existing;
    }

    const segments = normalizedPath.split("/");
    const label = segments[segments.length - 1] ?? "";
    const depth = segments.length - 1;
    const node: WizardNode = {
      id: `path:${normalizedPath}`,
      label,
      type: isFile ? "item" : "folder",
      depth,
      children: [],
      item,
    };

    nodeMap.set(normalizedPath, node);

    if (depth > 0) {
      const parentPath = segments.slice(0, -1).join("/");
      const parent = getOrCreateNode(parentPath);
      parent.children.push(node);
      parent.type = "group"; // Ensure parent is group if it has children
    } else {
      nodes.push(node);
    }

    return node;
  };

  // Add all files
  items.forEach(item => {
    getOrCreateNode(item.repoPath, true, item);
  });

  // Add all directories to ensure full tree structure
  directories.forEach(dir => {
    getOrCreateNode(dir, false);
  });

  return nodes.sort((a, b) => a.label.localeCompare(b.label));
}

export function flattenWizardTree(nodes: WizardNode[], expanded: Set<string>): WizardNode[] {
  const flat: WizardNode[] = [];
  const walk = (node: WizardNode) => {
    flat.push(node);
    if (node.type === "group" && !expanded.has(node.id)) return;
    if (node.type === "folder" && !expanded.has(node.id)) return;
    if (node.children) {
      [...node.children].sort((a, b) => a.label.localeCompare(b.label)).forEach(walk);
    }
  };
  [...nodes].sort((a, b) => a.label.localeCompare(b.label)).forEach(walk);
  return flat;
}

export function buildRegistryFromSelection(
  name: string,
  selectedItems: WizardItem[],
  includeRoots: Set<string>,
  overrides: Map<string, ItemType | "pack">
): Registry {
  const resolveTarget = (item: WizardItem, effectiveType: ItemType): string => {
    if (effectiveType === "skill") return item.target;
    if (effectiveType === "doc") return path.basename(item.repoPath);
    return path.join(effectiveType, `${item.name}.md`);
  };
  const packsByRoot = new Map<string, Pack>();
  const standalone: RegistryItem[] = [];

  const filteredItems = selectedItems.filter((item) => {
    if (includeRoots.size === 0) return true;
    for (const root of includeRoots) {
      if (item.repoPath === root || item.repoPath.startsWith(`${root}/`)) return true;
    }
    return false;
  });

  const explicitPackRoots = Array.from(overrides.entries())
    .filter(([, type]) => type === "pack")
    .map(([repoPath]) => repoPath)
    .sort((a, b) => b.length - a.length);

  explicitPackRoots.forEach((repoPath) => {
    packsByRoot.set(repoPath, {
      name: path.basename(repoPath),
      description: "",
      path: repoPath,
      items: [],
      kind: "structure",
    });
  });

  // Process items (standalone unless explicitly assigned to a pack root)
  for (const item of filteredItems) {
    const effectiveType = (overrides.get(item.repoPath) ?? item.type ?? "doc") as ItemType;
    const registryItem: RegistryItem = {
      name: item.name,
      description: item.description,
      type: effectiveType,
      path: item.repoPath,
      target: resolveTarget(item, effectiveType),
    };

    const packRoot = explicitPackRoots.find((root) => item.repoPath.startsWith(`${root}/`));
    if (packRoot) {
      const pack = packsByRoot.get(packRoot);
      if (pack) pack.items.push(registryItem);
      continue;
    }

    standalone.push(registryItem);
  }

  return {
    name,
    version: "1.0.0",
    packs: Array.from(packsByRoot.values()).filter((pack) => pack.items.length > 0),
    standalone,
  };
}
