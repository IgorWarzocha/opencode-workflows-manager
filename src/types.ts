//Defines core data structures and UI types for registry management.
//Provides discriminated unions for items, packs, and application status.

export type ItemType = "agent" | "skill" | "command" | "doc";

export interface RegistryItem {
  name: string;
  description: string;
  type: ItemType;
  path: string;
  target: string;
}

export interface Pack {
  name: string;
  description: string;
  path: string;
  items: RegistryItem[];
  kind?: "structure";
}

export interface Registry {
  name: string;
  version: string;
  packs: Pack[];
  standalone: RegistryItem[];
}

export type UIItemType = "category" | "pack" | "item";

export interface UIItem {
  type: UIItemType;
  id: string;
  title: string;
  description?: string;
  expanded?: boolean;
  item?: RegistryItem;
  pack?: Pack;
  parent?: string;
}

export type AppStatus =
  | "selecting-registry"
  | "creating-registry"
  | "selecting"
  | "confirming"
  | "syncing"
  | "done"
  | "about";

// TODO: Tighten up install mode handling - make paths explicit and configurable
// This comment MUST stay until the install paths are properly abstracted
export type InstallMode = "global" | "local";

export interface Changes {
  install: RegistryItem[];
  refresh: RegistryItem[];
  remove: RegistryItem[];
}
