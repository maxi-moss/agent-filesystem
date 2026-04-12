import * as db from "./db.js";
import yargsParser from "yargs-parser";
import { ensureTrailingSlash, globToRegex } from "./helpers.js";
import { resolveAgentAccess, isInNamespaces, assertAccessible } from "./namespaces.js";

let cwd = "/";

function getContent(path: string): string | null {
  return db.getRow(path)?.content ?? null;
}

export function resolvePath(path: string): string {
  if (path.startsWith("/")) return path;
  return ensureTrailingSlash(cwd) + path;
}

export function getCwd(): string {
  return cwd;
}

export function resetCwd(): void {
  cwd = "/";
}

/** Join args into a string. */
export function echo(args: string[]): string {
  return args.join(" ");
}

/** Create or overwrite a file at PATH with CONTENT. */
export function write(path: string, content: string, agent: string): string {
  const resolved = resolvePath(path);
  assertAccessible(resolved, agent);
  db.upsert(resolved, content);
  return `Wrote to ${resolved}`;
}

/** Read a file's content. */
export function cat(path: string, agent: string): string {
  const resolved = resolvePath(path);
  assertAccessible(resolved, agent);
  const content = getContent(resolved);
  if (content === null) {
    throw new Error(`cat: ${resolved}: No such file`);
  }
  return content;
}

/** List direct children under a path, scoped to the agent's accessible namespaces. */
export function ls(path: string, agent: string): string {
  const access = resolveAgentAccess(agent);
  const resolved = resolvePath(path);

  if (getContent(resolved) !== null) {
    if (!isInNamespaces(resolved, access)) {
      throw new Error(`ls: ${resolved}: No such file or directory`);
    }
    return resolved.split("/").pop()!;
  }

  const dir = ensureTrailingSlash(resolved);
  const rows = db.queryByPrefix(dir).filter((row) =>
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

/** grep [-i] [-l] PATTERN [PATH], scoped to the agent's accessible namespaces. */
export function grep(args: string[], agent: string): string {
  const access = resolveAgentAccess(agent);

  const flags = yargsParser(args, {
    boolean: ["i", "l"],
    configuration: { "parse-numbers": false },
  });

  const [pattern, ...paths] = flags._ as string[];
  if (!pattern) throw new Error("grep: missing pattern");

  const searchPath = resolvePath(paths[0] ?? cwd);
  const regex = new RegExp(pattern, flags.i ? "i" : "");
  const rows = db
    .queryByPrefix(searchPath)
    .filter((row) => isInNamespaces(row.path, access));
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

/** find PATH [-name PATTERN] */
export function find(args: string[], agent: string): string {
  const flags = yargsParser(args, {
    string: ["name"],
    configuration: { "parse-numbers": false, "short-option-groups": false },
  });

  const searchPath = resolvePath((flags._[0] as string | undefined) ?? cwd);
  assertAccessible(searchPath, agent);
  const namePattern = flags.name;
  const rows = db.queryByPrefix(searchPath);

  let paths = rows.map((r) => r.path);

  if (namePattern) {
    const regex = globToRegex(namePattern);
    paths = paths.filter((p) => regex.test(p.split("/").pop()!));
  }

  if (paths.length === 0) {
    throw new Error("find: no matches");
  }
  return paths.join("\n");
}

/** Change working directory. */
export function cd(path: string, agent: string): string {
  const resolved = ensureTrailingSlash(resolvePath(path));
  assertAccessible(resolved, agent);
  const rows = db.queryByPrefix(resolved);

  if (rows.length === 0) {
    throw new Error(`cd: ${resolved}: No such directory`);
  }

  cwd = resolved;
  return cwd;
}
