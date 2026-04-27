import Database from "better-sqlite3";
import { EventEmitter } from "node:events";

export interface FileRow {
  path: string;
  content: string;
  created: string;
  updated: string;
}

export type FsChangeEvent = {
  type: "upsert";
  path: string;
};

export class Filesystem {
  private db: Database.Database;
  private events = new EventEmitter();

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        path    TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )
    `);
  }

  on(event: "change", listener: (event: FsChangeEvent) => void): void {
    this.events.on(event, listener);
  }

  off(event: "change", listener: (event: FsChangeEvent) => void): void {
    this.events.off(event, listener);
  }

  /** Get a single file by exact path. */
  getRow(path: string): FileRow | undefined {
    return this.db
      .prepare("SELECT * FROM files WHERE path = ?")
      .get(path) as FileRow | undefined;
  }

  /** Get all files whose path starts with the given prefix. */
  queryByPrefix(prefix: string): FileRow[] {
    const escaped = prefix.replace(/[%_\\]/g, "\\$&");
    return this.db
      .prepare("SELECT * FROM files WHERE path LIKE ? ESCAPE '\\'")
      .all(escaped + "%") as FileRow[];
  }

  /** Insert or update a file and emit a change event. */
  upsert(path: string, content: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO files (path, content, created, updated)
         VALUES (@path, @content, @now, @now)
         ON CONFLICT(path) DO UPDATE SET
           content = excluded.content,
           updated = excluded.updated`,
      )
      .run({ path, content, now });
    this.events.emit("change", { type: "upsert", path } satisfies FsChangeEvent);
  }
}

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
