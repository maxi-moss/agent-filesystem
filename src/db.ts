import Database from "better-sqlite3";

let db: Database.Database;

/**
 * Initialize the SQLite database connection and create the entries table
 * if it doesn't exist. Must be called before any other db function.
 */
export function init(dbPath: string): void {
  throw new Error("Not implemented");
}

/**
 * Retrieve a single entry by its exact path.
 * Returns the content string, or null if the path doesn't exist.
 */
export function getByPath(path: string): string | null {
  throw new Error("Not implemented");
}

/**
 * Query all entries whose path starts with the given prefix.
 * Returns an array of { path, content } objects.
 */
export function queryByPrefix(prefix: string): Array<{ path: string; content: string }> {
  throw new Error("Not implemented");
}

/**
 * Insert or update an entry at the given path.
 * Sets `created` on first insert, updates `updated` on every write.
 */
export function upsert(path: string, content: string): void {
  throw new Error("Not implemented");
}
