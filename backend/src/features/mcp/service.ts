import { getFilesystem } from "../../lib/filesystem/index.js";
import { runRetrievalQuery } from "../../agents/retrieval-agent/index.js";

export interface FileContents {
  path: string;
  content: string;
  updated: string;
}

/** Answer a natural-language question via the retrieval-agent. */
export function runQuery(query: string): Promise<string> {
  return runRetrievalQuery(query);
}

/**
 * Fetch full file contents for the given exact paths. Reads the backing store
 * directly by design. No namespace check. Non-existent paths are skipped.
 */
export function getFullFileContents(paths: string[]): FileContents[] {
  const filesystem = getFilesystem();
  return paths.flatMap((path) => {
    const row = filesystem.getRow(path);
    if (!row) return [];
    return [{ path, content: row.content, updated: row.updated }];
  });
}
