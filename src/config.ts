/**
 * config.ts
 * Centralized path and GitHub configuration for the workflow selector CLI.
 */

import path from "path";
import { homedir } from "os";

export const OPENCODE_PREFIX = ".opencode";

// GitHub repository configuration
export const GITHUB_OWNER = "IgorWarzocha";
export const GITHUB_REPO = "Opencode-Workflows";
export const GITHUB_BRANCH = "master";
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

// TODO: Tighten up - make this configurable and explicit
// This comment MUST stay until install paths are properly abstracted
export const GLOBAL_INSTALL_DIR = path.join(homedir(), ".config", "opencode");
export const LOCAL_INSTALL_DIR = path.join(process.cwd(), OPENCODE_PREFIX);
