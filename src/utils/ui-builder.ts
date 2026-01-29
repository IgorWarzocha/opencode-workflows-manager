//Builds the visible UI tree from registry data.
//Handles category and pack expansion state for the selection view.

import type { Registry, UIItem, Pack, InstallMode } from "../types";

const STANDALONE_CATEGORIES = [
  { id: "agents", title: "Agents", filter: "agent" as const, desc: "Global orchestration and speed agents" },
  { id: "commands", title: "Commands", filter: "command" as const, desc: "Repository maintenance utility commands" },
] as const;

export function buildVisibleItems(
  registry: Registry,
  expandedCategory: string | null,
  expandedPack: string | null,
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
          pack,
          description: pack.description,
        });
        if (packExpanded) {
          for (const item of pack.items) {
            if (mode === "global" && item.type === "doc") continue;
            items.push({
              type: "item",
              id: `item:${pack.name}:${item.name}`,
              title: item.name,
              item,
              parent: `pack:${pack.name}`,
              description: item.description,
            });
          }
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
      description: cat.desc,
    });
    if (isExpanded) {
      for (const item of filtered) {
        items.push({
          type: "item",
          id: `${cat.id}:${item.name}`,
          title: item.name,
          item,
          parent: cat.id,
          description: item.description,
        });
      }
    }
  }

  return items;
}
