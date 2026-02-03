/**
 * registry-wizard/types.ts
 * Defines the data shapes used by the registry creation wizard.
 * Keeps the wizard UI and scanner in sync on shared types.
 */

import type { RegistryItem } from "../types";

export interface WizardInputs {
  name: string;
  description: string;
  repoUrl: string;
  aboutInline: boolean;
}

export type WizardNodeType = "group" | "item" | "folder";

export interface WizardItem {
  name: string;
  description: string;
  type: RegistryItem["type"] | "pack";
  repoPath: string;
  target: string;
  packName?: string;
}

export interface WizardNode {
  id: string;
  label: string;
  type: WizardNodeType;
  depth: number;
  children: WizardNode[];
  childrenLoaded?: boolean;
  item?: WizardItem;
}
