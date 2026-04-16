import {
  getFilesystem,
  ensureTrailingSlash,
  resolveAgentAccess,
  isInNamespaces,
} from "../../lib/filesystem/index.js";
import type { FileRow } from "../../lib/filesystem/index.js";

export function getFile(path: string, accessScope: string): FileRow | null {
  const row = getFilesystem().getRow(path);
  if (!row) return null;
  if (!isInNamespaces(row.path, resolveAgentAccess(accessScope))) return null;
  return row;
}

/** List direct children of a directory path, filtered to the access scope's namespaces. Returns null if no entries are visible. */
export function listDirectory(path: string, accessScope: string) {
  const dirPath = ensureTrailingSlash(path);
  const namespaces = resolveAgentAccess(accessScope);
  const rows = getFilesystem()
    .queryByPrefix(dirPath)
    .filter((row) => isInNamespaces(row.path, namespaces));

  if (rows.length === 0) return null;

  const entries = new Map<string, "file" | "dir">();
  for (const row of rows) {
    const relative = row.path.slice(dirPath.length);
    const firstSegment = relative.split("/")[0];
    if (!firstSegment || entries.has(firstSegment)) continue;
    entries.set(firstSegment, relative.includes("/") ? "dir" : "file");
  }

  return formatEntries(entries);
}

/** Format directory entries as `{ name, type }` objects sorted alphabetically. Directories get a trailing slash. */
function formatEntries(entries: Map<string, "file" | "dir">) {
  return [...entries.entries()]
    .map(([name, type]) => ({
      name: type === "dir" ? name + "/" : name,
      type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
