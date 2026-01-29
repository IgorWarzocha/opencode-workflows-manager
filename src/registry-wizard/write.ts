/**
 * registry-wizard/write.ts
 * Writes registry.json and registry.toml based on wizard inputs.
 * Keeps defaults concise so users can refine descriptions later.
 */

import fs from "fs-extra";
import path from "path";
import type { Registry } from "../types";
import type { AppConfig } from "../registry-config";
import type { WizardInputs } from "./types";

const defaultConfig = (inputs: WizardInputs): AppConfig => ({
  ui: {
    brand: inputs.name,
    product: "Workflows",
    about: {
      lines: inputs.aboutInline ? [inputs.description] : [""],
      emphasis: "",
      link: inputs.repoUrl,
      linkNote: "",
      footer: "Press any key to return...",
    },
  },
  install: {
    globalDir: "~/.config/opencode",
    localDir: ".opencode",
    prefixTypes: ["agent", "skill", "command"],
  },
});

export async function writeRegistryFiles(
  rootDir: string,
  inputs: WizardInputs,
  registry: Registry
): Promise<void> {
  const registryPath = path.join(rootDir, "registry.json");
  const tomlPath = path.join(rootDir, "registry.toml");
  const tomlConfig = defaultConfig(inputs);

  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
  const tomlLines = [
    "[ui]",
    `brand = "${tomlConfig.ui.brand}"`,
    `product = "${tomlConfig.ui.product}"`,
    "",
    "[ui.about]",
    "lines = [",
    `  \"${tomlConfig.ui.about.lines[0] ?? ""}\"`,
    "]",
    `emphasis = "${tomlConfig.ui.about.emphasis}"`,
    `link = "${tomlConfig.ui.about.link}"`,
    `linkNote = "${tomlConfig.ui.about.linkNote}"`,
    `footer = "${tomlConfig.ui.about.footer}"`,
    "",
    "[install]",
    `globalDir = "${tomlConfig.install.globalDir}"`,
    `localDir = "${tomlConfig.install.localDir}"`,
    `prefixTypes = [${tomlConfig.install.prefixTypes.map((p) => `\"${p}\"`).join(", ")}]`,
    "",
  ];
  await fs.writeFile(tomlPath, tomlLines.join("\n"));
}
