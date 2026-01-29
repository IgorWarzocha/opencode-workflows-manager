/**
 * github.ts
 * Handles fetching raw content from GitHub repository.
 * Uses native fetch API available in Bun.
 */

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
 * Fetches raw file content from a URL.
 * @param url - Full URL to fetch
 * @returns The file content as a string
 */
export async function fetchRawContent(url: string): Promise<string> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new GitHubFetchError(
      url,
      response.status,
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  }
  
  return response.text();
}

/**
 * Fetches and parses JSON content from a URL.
 * @param url - Full URL to fetch
 * @returns Parsed JSON content
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const content = await fetchRawContent(url);
  return JSON.parse(content) as T;
}
