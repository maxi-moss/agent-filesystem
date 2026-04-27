import yargsParser from "yargs-parser";
import { Filesystem } from "../filesystem/filesystem.js";
import {
  resolveAgentAccess,
  isInNamespaces,
  assertAccessible,
} from "../filesystem/namespaces.js";
import { ensureTrailingSlash, globToRegex } from "./utils.js";

export class Commands {
  private fs: Filesystem;
  private cwd = "/";

  constructor(filesystem: Filesystem) {
    this.fs = filesystem;
  }

  /** Resolve a relative path against the current working directory.
    * Absolute paths pass through unchanged.
   */
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
    this.fs.upsert(resolved, content);
    return `Wrote to ${resolved}`;
  }

  /** Read a file's content. Throws if the file does not exist. */
  cat(path: string, agent: string): string {
    const resolved = this.resolvePath(path);
    assertAccessible(resolved, agent);
    const content = this.fs.getRow(resolved)?.content ?? null;
    if (content === null) {
      throw new Error(`cat: ${resolved}: No such file`);
    }
    return content;
  }

  /** List direct children of a directory, scoped to the agent's namespaces.
    * Returns the filename if path is a file.
    */
  ls(path: string, agent: string): string {
    const access = resolveAgentAccess(agent);
    const resolved = this.resolvePath(path);

    if (this.fs.getRow(resolved)?.content !== undefined) {
      if (!isInNamespaces(resolved, access)) {
        throw new Error(`ls: ${resolved}: No such file or directory`);
      }
      return resolved.split("/").pop()!;
    }

    const dir = ensureTrailingSlash(resolved);
    const rows = this.fs.queryByPrefix(dir).filter((row) =>
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
    const rows = this.fs.queryByPrefix(searchPath).filter((row) =>
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
    const rows = this.fs.queryByPrefix(searchPath);

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

  /** Change the current working directory. Throws if directory does not exist. */
  cd(path: string, agent: string): string {
    const resolved = ensureTrailingSlash(this.resolvePath(path));
    assertAccessible(resolved, agent);
    const rows = this.fs.queryByPrefix(resolved);

    if (rows.length === 0) {
      throw new Error(`cd: ${resolved}: No such directory`);
    }

    this.cwd = resolved;
    return this.cwd;
  }
}

let instance: Commands | null = null;

/** Create the global commands instance bound to a filesystem. Call once at startup. */
export function createCommands(filesystem: Filesystem): Commands {
  instance = new Commands(filesystem);
  return instance;
}

/** Get the global commands instance. Throws if not yet created. */
export function getCommands(): Commands {
  if (!instance) throw new Error("Commands not initialized — call createCommands() first");
  return instance;
}
