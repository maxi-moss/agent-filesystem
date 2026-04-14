import { getFilesystem, ensureTrailingSlash } from "../../lib/filesystem/index.js";

export function getFile(path: string) {
  return getFilesystem().getRow(path) ?? null;
}

/** List the direct children of a directory path. Returns null if no files exist under that prefix. */
export function listDirectory(path: string) {
  const dirPath = ensureTrailingSlash(path);
  const rows = getFilesystem().queryByPrefix(dirPath);
  if (rows.length === 0) return null;

  const entries = new Map<string, "file" | "dir">();
  for (const row of rows) {
    const relative = row.path.slice(dirPath.length);
    const firstSegment = relative.split("/")[0];
    if (!firstSegment || entries.has(firstSegment)) continue;
    entries.set(firstSegment, relative.includes("/") ? "dir" : "file");
  }

  const formattedEntries = formatEntries(entries);
  return formattedEntries;
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
