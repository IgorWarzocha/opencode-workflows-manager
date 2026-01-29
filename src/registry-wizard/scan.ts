//Scans a directory tree and constructs Wizard Nodes for registry selection.
//Identifies agents, commands, skills, and documentation within the file structure.

import path from "path";
import type { Registry, RegistryItem, Pack } from "../types";
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
 * Builds a wizard tree from a list of discovered items.
 */
const buildTreeFromItems = (items: WizardItem[]): WizardNode[] => {
  const nodes: WizardNode[] = [];
  const treeRoots = new Map<string, WizardNode>();

  items.forEach((item) => {
    const segments = item.repoPath.split("/").filter(Boolean);
    if (segments.length === 0) return;

    let currentMap = treeRoots;
    let currentNode: WizardNode | null = null;
    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!currentMap.has(currentPath)) {
        const isLeaf = index === segments.length - 1;
        const node: WizardNode = {
          id: `path:${currentPath}`,
          label: segment,
          type: isLeaf ? "item" : "group",
          depth: index,
          children: [],
          item: isLeaf ? item : undefined,
        };
        currentMap.set(currentPath, node);
        if (currentNode) currentNode.children.push(node); else nodes.push(node);
      }
      currentNode = currentMap.get(currentPath) ?? null;
      if (!currentNode || currentNode.type === "item") return;
    });
  });

  return nodes;
};

/**
 * Scans the workspace and builds wizard nodes for the selection interface.
 */
export async function scanWizardTree(rootDir: string, allowedRoots: string[]): Promise<WizardNode[]> {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const allowedList = allowedRoots.map((root) => normalize(root.trim())).filter(Boolean);
  const allowedSet = new Set(allowedList);
  if (allowedSet.size === 0) return [];
  const rawFiles = await listFilesRecursive(rootDir);
  const items: WizardItem[] = [];

  const isAllowed = (filePath: string) => {
    const normalized = normalize(filePath);
    for (const root of allowedSet) {
      if (normalized === root || normalized.startsWith(`${root}/`)) return true;
    }
    return false;
  };

  for (const file of rawFiles) {
    if (!isAllowed(file)) continue;
    const segments = file.split("/");

    const basename = path.basename(file);
    const { type, target } = resolveItemType(segments, basename);
    
    // Skip non-primary skill files (we only want the main skill.md)
    if (type === "skill" && basename.toLowerCase() !== "skill.md") continue;
    // Skip if it was resolved as doc but inside skill dir (already handled by skill.md)
    if (type === "doc" && segments.includes("skill")) continue;

    const fullPath = path.join(rootDir, file);
    const frontmatter = await readFrontmatter(fullPath);
    const description = frontmatter.description ? normalizeDescription(frontmatter.description) : "";
    let repoPath = file;
    
    if (type === "skill") {
      const opencodeIndex = segments.indexOf(".opencode");
      const skillDir = segments[opencodeIndex + 2];
      repoPath = path.join(...segments.slice(0, opencodeIndex + 3));
    }

    const packName = (segments[0] === "agents" && segments.length > 1) ? segments[1] : undefined;
    const resolvedName = frontmatter.name?.trim() || basename.replace(/\.md$/i, "");
    const item = buildItem(type, resolvedName, repoPath, target, packName);
    item.description = description;
    items.push(item);
  }

  // Group items into packs and standalone
  const packs = new Map<string, WizardItem[]>();
  const standalone: WizardItem[] = [];

  items.forEach(item => {
    if (item.packName) {
      const list = packs.get(item.packName) ?? [];
      list.push(item);
      packs.set(item.packName, list);
    } else {
      standalone.push(item);
    }
  });

  // Dissolve packs that only contain agents (no commands/skills)
  for (const [packName, packItems] of packs) {
    const hasNonAgent = packItems.some(i => i.type !== "agent");
    if (!hasNonAgent) {
      packItems.forEach(i => standalone.push({ ...i, packName: undefined }));
      packs.delete(packName);
    }
  }

  return buildTreeFromItems([...standalone, ...Array.from(packs.values()).flat()]);
}

/**
 * Flattens the wizard tree into a list for rendering, respecting expanded state.
 */
export function flattenWizardTree(nodes: WizardNode[], expanded: Set<string>): WizardNode[] {
  const flat: WizardNode[] = [];
  const walk = (node: WizardNode) => {
    flat.push(node);
    if (node.type === "group" && !expanded.has(node.id)) return;
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return flat;
}

/**
 * Generates a Registry definition from the user's wizard selections.
 */
export function buildRegistryFromSelection(
  selectedItems: WizardItem[],
  includeRoots: Set<string>,
  overrides: Map<string, RegistryItem["type"]>
): Registry {
  const packsByName = new Map<string, Pack>();
  const standalone: RegistryItem[] = [];

  const filteredItems = selectedItems.filter((item) => {
    if (includeRoots.size === 0) return true;
    const root = item.repoPath.split("/")[0] ?? "";
    return includeRoots.has(root);
  });

  for (const item of filteredItems) {
    const effectiveType = overrides.get(item.repoPath) ?? item.type ?? "doc";
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
