/**
 * github.ts
 * Handles fetching raw content from GitHub repository.
 * Uses native fetch API available in Bun.
 */

import { GITHUB_RAW_BASE } from "./config";

export class GitHubFetchError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "GitHubFetchError";
  }
}

/**
 * Fetches raw file content from the GitHub repository.
 * @param repoPath - Path relative to repository root (e.g., "registry.json")
 * @returns The file content as a string
 */
export async function fetchRawContent(repoPath: string): Promise<string> {
  const url = `${GITHUB_RAW_BASE}/${repoPath}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new GitHubFetchError(
      url,
      response.status,
      `Failed to fetch ${repoPath}: ${response.status} ${response.statusText}`
    );
  }
  
  return response.text();
}

/**
 * Fetches and parses JSON content from the GitHub repository.
 * @param repoPath - Path relative to repository root (e.g., "registry.json")
 * @returns Parsed JSON content
 */
export async function fetchJson<T>(repoPath: string): Promise<T> {
  const content = await fetchRawContent(repoPath);
  return JSON.parse(content) as T;
}
