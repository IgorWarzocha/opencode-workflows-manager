/**
 * registries.ts
 * Loads registry sources and fetches registry definitions.
 */

import fs from "fs-extra";
import path from "path";
import { parse as parseToml } from "@iarna/toml";
import type { Registry } from "./types";
import type { AppConfig, PartialAppConfig } from "./registry-config";
import { DEFAULT_CONFIG, mergeConfig } from "./registry-config";
import { fetchJson, fetchRawContent } from "./github";

export interface RegistrySource {
  name: string;
  description: string;
  url: string;
}

const REGISTRY_LIST_FILE = "registries.json";
const REGISTRY_TOML = "registry.toml";
const REGISTRY_JSON = "registry.json";

const DEFAULT_BRANCHES = ["main", "master"] as const;

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(repoUrl);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.replace(/^\//, "").split("/");
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function toRawBase(owner: string, repo: string, branch: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
}

async function tryFetchRegistry(
  baseUrl: string
): Promise<{ registry: Registry; config: PartialAppConfig | null } | null> {
  let config: PartialAppConfig | null = null;

  try {
    const tomlUrl = new URL(REGISTRY_TOML, baseUrl).toString();
    const tomlText = await fetchRawContent(tomlUrl);
    config = parseToml(tomlText) as unknown as PartialAppConfig;
  } catch {
    config = null;
  }

  try {
    const jsonUrl = new URL(REGISTRY_JSON, baseUrl).toString();
    const registry = await fetchJson<Registry>(jsonUrl);
    return { registry, config };
  } catch {
    return null;
  }
}

function withBaseUrls(registry: Registry, baseUrl: string): Registry {
  const applyBase = (item: Registry["standalone"][number]) => ({
    ...item,
    path: item.path.startsWith("http") ? item.path : new URL(item.path, baseUrl).toString(),
  });

  return {
    ...registry,
    packs: registry.packs.map((pack) => ({
      ...pack,
      items: pack.items.map(applyBase),
    })),
    standalone: registry.standalone.map(applyBase),
  };
}

export async function loadRegistrySources(): Promise<RegistrySource[]> {
  const listPath = path.join(process.cwd(), REGISTRY_LIST_FILE);
  const exists = await fs.pathExists(listPath);
  if (!exists) return [];
  const raw = await fs.readFile(listPath, "utf-8");
  const parsed = JSON.parse(raw) as RegistrySource[];
  return parsed;
}

export async function loadRegistryFromSource(
  source: RegistrySource
): Promise<{ registry: Registry; config: AppConfig } | null> {
  const parsed = parseRepoUrl(source.url);
  if (!parsed) return null;

  let result: { registry: Registry; config: PartialAppConfig | null } | null = null;
  for (const branch of DEFAULT_BRANCHES) {
    const baseUrl = toRawBase(parsed.owner, parsed.repo, branch);
    result = await tryFetchRegistry(baseUrl);
    if (result) {
      result.registry = withBaseUrls(result.registry, baseUrl);
      break;
    }
  }

  if (!result) return null;

  const config = mergeConfig(DEFAULT_CONFIG, result.config);
  return { registry: result.registry, config };
}
