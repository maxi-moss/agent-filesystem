import Database from "better-sqlite3";
import { dbConfig } from "../config.js";

export interface FileRow {
  path: string;
  content: string;
  created: string;
  updated: string;
}

const DEFAULT_DB_PATH = dbConfig.path;

let db: Database.Database | null = null;

function setup(dbPath: string): Database.Database {
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.exec(`
    CREATE TABLE IF NOT EXISTS files (
      path    TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created TEXT NOT NULL,
      updated TEXT NOT NULL
    )
  `);
  return instance;
}

function getDb(): Database.Database {
  if (!db) {
    db = setup(DEFAULT_DB_PATH);
  }
  return db;
}

/** Re-initialize with a different database path. */
export function init(dbPath: string): void {
  if (db) db.close();
  db = setup(dbPath);
}

/** Get a single row by exact path. */
export function getRow(path: string): FileRow | undefined {
  return getDb().prepare("SELECT * FROM files WHERE path = ?").get(path) as FileRow | undefined;
}

/** Get all rows matching a path prefix. */
export function queryByPrefix(prefix: string): FileRow[] {
  const escaped = prefix.replace(/[%_\\]/g, "\\$&");
  return getDb()
    .prepare("SELECT * FROM files WHERE path LIKE ? ESCAPE '\\'")
    .all(escaped + "%") as FileRow[];
}

/** Insert or update a file. */
export function upsert(path: string, content: string): void {
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO files (path, content, created, updated)
     VALUES (@path, @content, @now, @now)
     ON CONFLICT(path) DO UPDATE SET
       content = excluded.content,
       updated = excluded.updated`
  ).run({ path, content, now });
}
