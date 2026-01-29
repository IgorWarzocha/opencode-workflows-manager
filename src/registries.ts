//Loads registry sources and fetches registry definitions from remote or local targets.
//Resolves configuration merging and base URL application for external assets.

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
const REGISTRY_LIST_REPO = "IgorWarzocha/opencode-workflows-manager";
const REGISTRY_LIST_BRANCHES = ["master", "main", "universal"] as const;
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
  for (const branch of REGISTRY_LIST_BRANCHES) {
    const url = `https://raw.githubusercontent.com/${REGISTRY_LIST_REPO}/${branch}/${REGISTRY_LIST_FILE}`;
    try {
      return await fetchJson<RegistrySource[]>(url);
    } catch {
      // try next branch
    }
  }

  const listPath = path.join(process.cwd(), REGISTRY_LIST_FILE);
  const exists = await fs.pathExists(listPath);
  if (!exists) return [];
  const raw = await fs.readFile(listPath, "utf-8");
  return JSON.parse(raw) as RegistrySource[];
}

export async function loadLocalRegistry(): Promise<{ registry: Registry; config: AppConfig } | null> {
  const registryPath = path.join(process.cwd(), REGISTRY_JSON);
  const exists = await fs.pathExists(registryPath);
  if (!exists) return null;

  const registry = JSON.parse(await fs.readFile(registryPath, "utf-8")) as Registry;
  let config = DEFAULT_CONFIG;

  const tomlPath = path.join(process.cwd(), REGISTRY_TOML);
  if (await fs.pathExists(tomlPath)) {
    const tomlText = await fs.readFile(tomlPath, "utf-8");
    const parsed = parseToml(tomlText) as unknown as PartialAppConfig;
    config = mergeConfig(config, parsed);
  }

  return { registry, config };
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
