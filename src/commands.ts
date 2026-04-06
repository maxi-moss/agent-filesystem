/**
 * List direct children (files and implicit directories) under the given path.
 * Queries entries by prefix and filters to immediate children in application code.
 */
export function ls(path: string): string {
  throw new Error("Not implemented");
}

/**
 * Return the full content of the file at the given path.
 * Returns an error message if the path doesn't exist.
 */
export function cat(path: string): string {
  throw new Error("Not implemented");
}

/**
 * Search for a regex/keyword pattern across all files under the given path.
 * Queries entries by prefix, then applies regex matching in application code.
 * Returns matching lines prefixed with their file path.
 */
export function grep(pattern: string, path: string, flags: Record<string, string | boolean>): string {
  throw new Error("Not implemented");
}

/**
 * Traverse all entries under the given path and filter by glob pattern.
 * Queries entries by prefix, then applies glob matching in application code.
 */
export function find(path: string, name: string): string {
  throw new Error("Not implemented");
}

/**
 * Update the agent's current working directory.
 * Returns the new working directory path.
 */
export function cd(path: string): string {
  throw new Error("Not implemented");
}

/**
 * Return the given content as a string.
 * Primary use: producing content for `>` redirection to write memories.
 */
export function echo(args: string[]): string {
  throw new Error("Not implemented");
}
