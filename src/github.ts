/**
 * github.ts
 * Handles fetching raw content from GitHub repository.
 * Uses native fetch API available in Bun.
 */

export class GitHubFetchError extends Error {
  public readonly url: string;
  public readonly status: number;

  constructor(url: string, status: number, message: string) {
    super(message);
    this.name = "GitHubFetchError";
    this.url = url;
    this.status = status;
  }
}

/**
 * Fetches raw file content from a URL.
 * @param url - Full URL to fetch
 * @returns The file content as a string
 */
export async function fetchRawContent(url: string): Promise<string> {
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 8000;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          continue;
        }
        throw new GitHubFetchError(
          url,
          response.status,
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`
        );
      }

      return response.text();
    } catch (error: unknown) {
      lastError = error;
      if (attempt < MAX_RETRIES) continue;
      if (error instanceof GitHubFetchError) throw error;
      throw new Error(`Failed to fetch ${url}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`Failed to fetch ${url}`);
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
