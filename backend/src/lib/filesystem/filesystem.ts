import Database from "better-sqlite3";
import { EventEmitter } from "node:events";
import yargsParser from "yargs-parser";
import { resolveAgentAccess, isInNamespaces, assertAccessible } from "./namespaces.js";

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
  private cwd = "/";
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

  /** Resolve a relative path against the current working directory. Absolute paths pass through unchanged. */
  resolvePath(path: string): string {
    if (path.startsWith("/")) return path;
    return ensureTrailingSlash(this.cwd) + path;
  }

  getCwd(): string {
    return this.cwd;
  }

  resetCwd(): void {
    this.cwd = "/";
  }

  echo(args: string[]): string {
    return args.join(" ");
  }

  /** Create or overwrite a file. Returns a confirmation message. */
  write(path: string, content: string, agent: string): string {
    const resolved = this.resolvePath(path);
    assertAccessible(resolved, agent);
    this.upsert(resolved, content);
    return `Wrote to ${resolved}`;
  }

  /** Read a file's content. Throws if the file does not exist. */
  cat(path: string, agent: string): string {
    const resolved = this.resolvePath(path);
    assertAccessible(resolved, agent);
    const content = this.getRow(resolved)?.content ?? null;
    if (content === null) {
      throw new Error(`cat: ${resolved}: No such file`);
    }
    return content;
  }

  /** List direct children of a directory, scoped to the agent's namespaces. Returns the filename if path is a file. */
  ls(path: string, agent: string): string {
    const access = resolveAgentAccess(agent);
    const resolved = this.resolvePath(path);

    if (this.getRow(resolved)?.content !== undefined) {
      if (!isInNamespaces(resolved, access)) {
        throw new Error(`ls: ${resolved}: No such file or directory`);
      }
      return resolved.split("/").pop()!;
    }

    const dir = ensureTrailingSlash(resolved);
    const rows = this.queryByPrefix(dir).filter((row) =>
      isInNamespaces(row.path, access),
    );

    if (rows.length === 0) {
      throw new Error(`ls: ${resolved}: No such file or directory`);
    }

    const children = new Set<string>();
    for (const row of rows) {
      const relative = row.path.slice(dir.length);
      const firstSegment = relative.split("/")[0];
      if (!firstSegment) continue;
      const isDir = relative.includes("/");
      children.add(isDir ? firstSegment + "/" : firstSegment);
    }

    return [...children].sort().join("\n");
  }

  /** Search file contents. Args mirror `grep [-i] [-l] PATTERN [PATH]`. */
  grep(args: string[], agent: string): string {
    const access = resolveAgentAccess(agent);

    const flags = yargsParser(args, {
      boolean: ["i", "l"],
      configuration: { "parse-numbers": false },
    });

    const [pattern, ...paths] = flags._ as string[];
    if (!pattern) throw new Error("grep: missing pattern");

    const searchPath = this.resolvePath(paths[0] ?? this.cwd);
    const regex = new RegExp(pattern, flags.i ? "i" : "");
    const rows = this.queryByPrefix(searchPath).filter((row) =>
      isInNamespaces(row.path, access),
    );
    const matches: string[] = [];

    for (const row of rows) {
      const lines = row.content.split("\n");
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        if (regex.test(lines[lineNum]!)) {
          if (flags.l) {
            matches.push(row.path);
            break;
          }
          matches.push(`${row.path}:${lineNum + 1}:${lines[lineNum]}`);
        }
      }
    }

    return matches.join("\n");
  }

  /** Find files by name. Args mirror `find PATH [-name PATTERN]`. */
  find(args: string[], agent: string): string {
    const flags = yargsParser(args, {
      string: ["name"],
      configuration: { "parse-numbers": false, "short-option-groups": false },
    });

    const searchPath = this.resolvePath(
      (flags._[0] as string | undefined) ?? this.cwd,
    );
    assertAccessible(searchPath, agent);
    const namePattern = flags.name;
    const rows = this.queryByPrefix(searchPath);

    let paths = rows.map((row) => row.path);

    if (namePattern) {
      const regex = globToRegex(namePattern);
      paths = paths.filter((filePath) => regex.test(filePath.split("/").pop()!));
    }

    if (paths.length === 0) {
      throw new Error("find: no matches");
    }
    return paths.join("\n");
  }

  /** Change the current working directory. Throws if the directory does not exist. */
  cd(path: string, agent: string): string {
    const resolved = ensureTrailingSlash(this.resolvePath(path));
    assertAccessible(resolved, agent);
    const rows = this.queryByPrefix(resolved);

    if (rows.length === 0) {
      throw new Error(`cd: ${resolved}: No such directory`);
    }

    this.cwd = resolved;
    return this.cwd;
  }
}

export function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
