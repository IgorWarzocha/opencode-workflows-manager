//Builds wizard items from scanned file system entries.
//Creates registry items with type detection and description extraction.

import fs from "fs-extra";
import path from "path";
import type { RegistryItem } from "../types";
import type { WizardItem } from "./types";
import { listMarkdownFiles, shouldSkipDir } from "./fs-utils";

export function buildItem(
  type: RegistryItem["type"],
  name: string,
  repoPath: string,
  target: string,
  packName?: string
): WizardItem {
  return {
    name,
    description: "",
    type,
    repoPath,
    target,
    packName,
  };
}

type Frontmatter = {
  name: string | null;
  description: string | null;
};

const stripQuotes = (value: string) => value.replace(/^['"]|['"]$/g, "").trim();

export const normalizeDescription = (value: string): string => {
  const trimmed = stripQuotes(value).replace(/\r/g, "").trim();
  const firstAlphaIndex = trimmed.search(/[A-Za-z]/);
  const normalized = (firstAlphaIndex >= 0 ? trimmed.slice(firstAlphaIndex) : trimmed).replace(/\s+/g, " ");
  if (normalized.length <= 30) return normalized;
  return normalized.slice(0, 30);
};

const parseBlockScalar = (lines: string[], startIndex: number, folded: boolean): { value: string; nextIndex: number } => {
  const collected: string[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0) {
      collected.push("");
      index += 1;
      continue;
    }
    if (!/^\s+/.test(line)) break;
    collected.push(line.replace(/^\s+/, ""));
    index += 1;
  }

  const value = folded
    ? collected.map((line) => (line.length === 0 ? "\n" : line)).join(" ").replace(/\s+\n\s+/g, "\n").trim()
    : collected.join("\n").trim();

  return { value, nextIndex: index };
};

const parseFrontmatter = (content: string): Frontmatter => {
  const lines = content.replace(/\r/g, "").split("\n");
  if (lines[0]?.trim() !== "---") return { name: null, description: null };
  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return { name: null, description: null };

  let name: string | null = null;
  let description: string | null = null;
  let index = 1;
  while (index < endIndex) {
    const line = lines[index] ?? "";
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }
    const key = match[1]?.toLowerCase();
    const rawValue = match[2] ?? "";

    if (key === "name") {
      name = stripQuotes(rawValue);
      index += 1;
      continue;
    }

    if (key === "description") {
      if (rawValue === "" || rawValue === "|" || rawValue === "|-" || rawValue === ">" || rawValue === ">-") {
        const folded = rawValue.startsWith(">");
        const block = parseBlockScalar(lines, index + 1, folded);
        description = block.value;
        index = block.nextIndex;
        continue;
      }
      description = rawValue;
      index += 1;
      continue;
    }

    index += 1;
  }

  return { name, description };
};

export async function readFrontmatter(filePath: string): Promise<Frontmatter> {
  const exists = await fs.pathExists(filePath);
  if (!exists) return { name: null, description: null };
  const content = await fs.readFile(filePath, "utf-8");
  return parseFrontmatter(content);
}

export async function readDescription(filePath: string): Promise<string> {
  const frontmatter = await readFrontmatter(filePath);
  if (!frontmatter.description) return "";
  return normalizeDescription(frontmatter.description);
}

export async function scanSkills(skillsDir: string): Promise<string[]> {
  const directories = await fs.readdir(skillsDir, { withFileTypes: true });
  const skills: string[] = [];
  for (const entry of directories) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipDir(entry.name)) continue;
    const skillMarker = path.join(skillsDir, entry.name, "SKILL.md");
    if (await fs.pathExists(skillMarker)) {
      skills.push(entry.name);
    }
  }
  return skills;
}

export async function buildItemFromFile(
  file: string,
  rootDir: string,
  allowedSet: Set<string>
): Promise<WizardItem | null> {
  const segments = file.split("/");
  const root = segments[0] ?? "";
  if (allowedSet.size > 0 && !allowedSet.has(root)) return null;

  const basename = path.basename(file);
  const fullPath = path.join(rootDir, file);
  const frontmatter = await readFrontmatter(fullPath);
  const description = frontmatter.description ? normalizeDescription(frontmatter.description) : "";
  const name = frontmatter.name?.trim() || basename.replace(/\.md$/i, "");

  let type: RegistryItem["type"] = "doc";
  let target = path.basename(file);
  let repoPath = file;
  let packName: string | undefined = undefined;

  const opencodeIndex = segments.indexOf(".opencode");
  if (opencodeIndex !== -1) {
    const opencodeType = segments[opencodeIndex + 1];
    if (opencodeType === "agent") {
      type = "agent";
      target = path.join("agent", basename);
    } else if (opencodeType === "command") {
      type = "command";
      target = path.join("command", basename);
    } else if (opencodeType === "skill") {
      const skillDir = segments[opencodeIndex + 2];
      if (basename.toLowerCase() === "skill.md" && skillDir) {
        type = "skill";
        repoPath = path.join(...segments.slice(0, opencodeIndex + 2), skillDir);
        target = path.join("skill", skillDir);
      } else {
        return null;
      }
    }
  }

  if (segments[0] === "agents" && segments.length > 1) {
    packName = segments[1];
  }

  const item = buildItem(type, name, repoPath, target, packName);
  item.description = description;
  return item;
}
