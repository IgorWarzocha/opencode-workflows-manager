//Builds the visible UI tree from registry data.
//Handles category and pack expansion state for the selection view.

import type { Registry, UIItem, Pack, InstallMode, RegistryItem } from "../types";

const STANDALONE_CATEGORIES = [
  { id: "agents", title: "Agents", filter: "agent" as const, desc: "Global orchestration and speed agents" },
  { id: "commands", title: "Commands", filter: "command" as const, desc: "Repository maintenance utility commands" },
] as const;

export function buildVisibleItems(
  registry: Registry,
  expandedCategory: string | null,
  expandedPack: string | null,
  expandedFolders: Set<string>,
  mode: InstallMode
): UIItem[] {
  const items: UIItem[] = [];

  if (registry.packs.length > 0) {
    const packsExpanded = expandedCategory === "packs";
    items.push({
      type: "category",
      id: "packs",
      title: "Packs",
      expanded: packsExpanded,
      description: "Collection of specialized agent toolkits",
    });

    if (packsExpanded) {
      for (const pack of registry.packs) {
        const packExpanded = expandedPack === pack.name;
        items.push({
          type: "pack",
          id: `pack:${pack.name}`,
          title: pack.name,
          expanded: packExpanded,
          parent: "packs",
          depth: 1,
          pack,
          description: pack.description,
        });
        if (packExpanded) {
          type FolderNode = {
            name: string;
            path: string;
            children: Map<string, FolderNode>;
            items: RegistryItem[];
          };

          const root: FolderNode = {
            name: "",
            path: "",
            children: new Map<string, FolderNode>(),
            items: [],
          };

          const prefix = pack.path.endsWith("/") ? pack.path : `${pack.path}/`;

          const normalizeRelativePath = (fullPath: string): string => {
            if (!fullPath.startsWith("http")) return fullPath;
            try {
              const url = new URL(fullPath);
              const trimmed = url.pathname.replace(/^\/+/, "");
              const packIndex = trimmed.indexOf(prefix);
              if (packIndex !== -1) {
                return trimmed.slice(packIndex);
              }
              return trimmed;
            } catch {
              return fullPath;
            }
          };

          for (const packItem of pack.items) {
            if (mode === "global" && packItem.type === "doc") continue;
            const normalizedPath = normalizeRelativePath(packItem.path);
            const rawPath = normalizedPath.startsWith(prefix)
              ? normalizedPath.slice(prefix.length)
              : normalizedPath;
            const segments = rawPath
              .split("/")
              .filter((segment) => segment.length > 0 && segment !== ".opencode");
            const fileName = segments.pop() ?? packItem.name;
            let current = root;

            for (const segment of segments) {
              const nextPath = current.path.length > 0 ? `${current.path}/${segment}` : segment;
              let child = current.children.get(segment);
              if (!child) {
                child = { name: segment, path: nextPath, children: new Map(), items: [] };
                current.children.set(segment, child);
              }
              current = child;
            }

            current.items.push({ ...packItem, name: packItem.name || fileName });
          }

          const pushFolder = (
            node: FolderNode,
            depth: number,
            parentId: string
          ) => {
            const folderId = node.path.length > 0 ? `folder:${pack.name}:${node.path}` : parentId;
            if (node.path.length > 0) {
              items.push({
                type: "folder",
                id: folderId,
                title: node.name,
                expanded: expandedFolders.has(folderId),
                parent: parentId,
                depth,
              });
            }

            const isExpanded = node.path.length === 0 || expandedFolders.has(folderId);
            if (!isExpanded) return;

            const childFolders = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
            for (const child of childFolders) {
              pushFolder(child, depth + 1, folderId);
            }

            const sortedItems = [...node.items].sort((a, b) => a.name.localeCompare(b.name));
            for (const leaf of sortedItems) {
              items.push({
                type: "item",
                id: `item:${leaf.path}`,
                title: leaf.name,
                item: leaf,
                parent: folderId,
                depth: depth + 1,
                description: leaf.description,
              });
            }
          };

          pushFolder(root, 1, `pack:${pack.name}`);
        }
      }
    }
  }

  for (const cat of STANDALONE_CATEGORIES) {
    const filtered = registry.standalone.filter((s) => s.type === cat.filter);
    if (filtered.length === 0) continue;
    const isExpanded = expandedCategory === cat.id;
    items.push({
      type: "category",
      id: cat.id,
      title: cat.title,
      expanded: isExpanded,
      depth: 0,
      description: cat.desc,
    });
    if (isExpanded) {
      for (const item of filtered) {
        items.push({
          type: "item",
          id: `item:${item.path}`,
          title: item.name,
          item,
          parent: cat.id,
          depth: 1,
          description: item.description,
        });
      }
    }
  }

  return items;
}
