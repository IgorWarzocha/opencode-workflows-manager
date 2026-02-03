//Scans a directory tree and constructs Wizard Nodes for registry selection.
//Identifies agents, commands, skills, and documentation within the file structure.

import fs from "fs-extra";
import path from "path";
import type { Registry, RegistryItem, Pack, ItemType } from "../types";
import type { WizardItem, WizardNode } from "./types";
import { listFilesRecursive, listDirectories, shouldSkipDir } from "./fs-utils";
import { buildItem, normalizeDescription, readFrontmatter } from "./item-builder";

/**
 * Identifies the type and target path of a file based on its location in the directory tree.
 */
const resolveItemType = (segments: string[], basename: string): { type: RegistryItem["type"]; target: string } => {
  const opencodeIndex = segments.indexOf(".opencode");
  if (opencodeIndex === -1) return { type: "doc", target: basename };

  const opencodeType = segments[opencodeIndex + 1];
  switch (opencodeType) {
    case "agent":
      return { type: "agent", target: path.join("agent", basename) };
    case "command":
      return { type: "command", target: path.join("command", basename) };
    case "skill": {
      const skillDir = segments[opencodeIndex + 2];
      if (basename.toLowerCase() === "skill.md" && skillDir) {
        return { type: "skill", target: path.join("skill", skillDir) };
      }
      return { type: "doc", target: basename };
    }
    default:
      return { type: "doc", target: basename };
  }
};

/**
 * Scans the root directory for potential registry folders.
 */
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

/**
 * Scans the workspace and builds wizard nodes for the selection interface.
 */
export async function scanWizardTree(rootDir: string, allowedRoots: string[]): Promise<WizardNode[]> {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const allowedList = allowedRoots.map((root) => normalize(root.trim())).filter(Boolean);
  const allowedSet = new Set(allowedList);
  if (allowedSet.size === 0) return [];

  const rawFiles = await fs.readdir(rootDir, { withFileTypes: true, recursive: true });
  const items: WizardItem[] = [];
  const directories = new Set<string>();

  const isAllowed = (filePath: string) => {
    const normalized = normalize(filePath);
    for (const root of allowedSet) {
      if (normalized === root || normalized.startsWith(`${root}/`)) return true;
    }
    return false;
  };

  for (const entry of rawFiles) {
    const relativePath = normalize(path.relative(rootDir, path.join(entry.parentPath, entry.name)));
    if (!isAllowed(relativePath)) continue;

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      directories.add(relativePath);
      continue;
    }

    if (!entry.name.endsWith(".md")) continue;

    const segments = relativePath.split("/");
    const basename = entry.name;
    const { type, target } = resolveItemType(segments, basename);
    
    // Skip non-primary skill files (we only want the main skill.md)
    if (type === "skill" && basename.toLowerCase() !== "skill.md") continue;
    // Skip if it was resolved as doc but inside skill dir (already handled by skill.md)
    if (type === "doc" && segments.includes("skill")) continue;

    const fullPath = path.join(rootDir, relativePath);
    const frontmatter = await readFrontmatter(fullPath);
    const description = frontmatter.description ? normalizeDescription(frontmatter.description) : "";
    let repoPath = relativePath;
    
    if (type === "skill") {
      const opencodeIndex = segments.indexOf(".opencode");
      repoPath = path.join(...segments.slice(0, opencodeIndex + 3));
    }

    const packName = (segments[0] === "agents" && segments.length > 1) ? segments[1] : undefined;
    const resolvedName = frontmatter.name?.trim() || basename.replace(/\.md$/i, "");
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

/**
 * Flattens the wizard tree into a list for rendering, respecting expanded state.
 */
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

/**
 * Generates a Registry definition from the user's wizard selections.
 */
export function buildRegistryFromSelection(
  selectedItems: WizardItem[],
  includeRoots: Set<string>,
  overrides: Map<string, ItemType | "pack">
): Registry {
  const packsByName = new Map<string, Pack>();
  const standalone: RegistryItem[] = [];

  const filteredItems = selectedItems.filter((item) => {
    if (includeRoots.size === 0) return true;
    const root = item.repoPath.split("/")[0] ?? "";
    return includeRoots.has(root);
  });

  // 1. Process Folders explicitly marked as Packs
  for (const [repoPath, type] of overrides) {
    if (type !== "pack") continue;

    const packName = path.basename(repoPath);
    const pack: Pack = {
      name: packName,
      description: "",
      path: repoPath,
      items: [],
    };

    // Find all selected items that belong to this folder
    for (const item of filteredItems) {
      if (item.repoPath.startsWith(`${repoPath}/`)) {
        const effectiveType = (overrides.get(item.repoPath) ?? item.type ?? "doc") as ItemType;
        pack.items.push({
          name: item.name,
          description: item.description,
          type: effectiveType,
          path: item.repoPath,
          target: effectiveType === "doc"
            ? path.basename(item.repoPath)
            : effectiveType === "skill"
              ? path.join("skill", item.name)
              : path.join(effectiveType, `${item.name}.md`),
        });
      }
    }

    if (pack.items.length > 0) {
      packsByName.set(repoPath, pack);
    }
  }

  // 2. Process everything else (Standalone or implicit packs from agents/ folders)
  for (const item of filteredItems) {
    // Skip if already included in an explicit pack
    let inExplicitPack = false;
    for (const [packPath] of packsByName) {
      if (item.repoPath.startsWith(`${packPath}/`)) {
        inExplicitPack = true;
        break;
      }
    }
    if (inExplicitPack) continue;

    const effectiveType = (overrides.get(item.repoPath) ?? item.type ?? "doc") as ItemType;
    const registryItem: RegistryItem = {
      name: item.name,
      description: item.description,
      type: effectiveType,
      path: item.repoPath,
      target: effectiveType === "doc"
        ? path.basename(item.repoPath)
        : effectiveType === "skill"
          ? path.join("skill", item.name)
          : path.join(effectiveType, `${item.name}.md`),
    };
    
    if (item.packName) {
      const pack = packsByName.get(item.packName) ?? {
        name: item.packName,
        description: "",
        path: path.join("agents", item.packName),
        items: [],
      };
      pack.items.push(registryItem);
      packsByName.set(item.packName, pack);
    } else {
      standalone.push(registryItem);
    }
  }

  return {
    name: "opencode-workflows",
    version: "1.0.0",
    packs: Array.from(packsByName.values()),
    standalone,
  };
}
