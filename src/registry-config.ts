/**
 * registry-config.ts
 * Shared configuration structures and defaults for registries.
 */

import path from "path";
import { homedir } from "os";
import { xdgConfig } from "xdg-basedir";

export interface AboutConfig {
  lines: string[];
  emphasis: string;
  link: string;
  linkNote: string;
  footer: string;
}

export interface UiConfig {
  brand: string;
  product: string;
  about: AboutConfig;
}

export interface InstallConfig {
  globalDir: string;
  localDir: string;
  prefixTypes: string[];
}

export interface AppConfig {
  ui: UiConfig;
  install: InstallConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  ui: {
    brand: "Opencode",
    product: "Workflows",
    about: {
      lines: ["Configure this registry to show your own about text."],
      emphasis: "",
      link: "",
      linkNote: "",
      footer: "Press any key to return...",
    },
  },
  install: {
    globalDir: getOpencodeConfigDir(),
    localDir: path.join(process.cwd(), ".opencode"),
    prefixTypes: ["agent", "skill", "command"],
  },
};

export type PartialAppConfig = {
  ui?: Partial<UiConfig> & { about?: Partial<AboutConfig> };
  install?: Partial<InstallConfig>;
};

function normalizePath(input: string): string {
  if (input.startsWith("~")) {
    const remainder = input.slice(1);
    return path.join(homedir(), remainder);
  }
  if (path.isAbsolute(input)) return input;
  return path.resolve(process.cwd(), input);
}

function getOpencodeConfigDir(): string {
  const override = process.env["OPENCODE_CONFIG_DIR"];
  if (override) return override;
  const baseConfigDir =
    process.env["XDG_CONFIG_HOME"] ??
    xdgConfig ??
    path.join(homedir(), ".config");
  return path.join(baseConfigDir, "opencode");
}

export function mergeConfig(base: AppConfig, override: PartialAppConfig | null): AppConfig {
  if (!override) return base;
  const merged = {
    ui: {
      ...base.ui,
      ...override.ui,
      about: { ...base.ui.about, ...override.ui?.about },
    },
    install: { ...base.install, ...override.install },
  };
  return {
    ...merged,
    install: {
      ...merged.install,
      globalDir: normalizePath(merged.install.globalDir),
      localDir: normalizePath(merged.install.localDir),
    },
  };
}
