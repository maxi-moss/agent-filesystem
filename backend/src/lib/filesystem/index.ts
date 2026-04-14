export { Filesystem, ensureTrailingSlash } from "./filesystem.js";
export type { FileRow, FsChangeEvent } from "./filesystem.js";
export { resolveAgentAccess, isInNamespaces, assertAccessible } from "./namespaces.js";

import { Filesystem } from "./filesystem.js";

let instance: Filesystem | null = null;

/** Create the global filesystem instance. Call once at startup. */
export function createFilesystem(dbPath: string): Filesystem {
  instance = new Filesystem(dbPath);
  return instance;
}

/** Get the global filesystem instance. Throws if not yet created. */
export function getFilesystem(): Filesystem {
  if (!instance) throw new Error("Filesystem not initialized — call createFilesystem() first");
  return instance;
}
