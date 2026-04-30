import { Filesystem, type FileRow } from "../filesystem/filesystem.js";
import {
  resolveAgentAccess,
  isInNamespaces,
  assertAccessible,
} from "../filesystem/namespaces.js";
import { ensureTrailingSlash, globToRegex } from "./utils.js";

export type GrepOpts = {
  pattern: string;
  path?: string | undefined;
  "-i"?: boolean | undefined;
  "-A"?: number | undefined;
  "-B"?: number | undefined;
  "-C"?: number | undefined;
  output_mode?: "content" | "files_with_matches" | "count" | undefined;
  head_limit?: number | undefined;
};

export type FindOpts = {
  path: string;
  namePattern?: string | undefined;
  mtimeWithinDays?: number | undefined;
  mtimeOlderThanDays?: number | undefined;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class Commands {
  private fs: Filesystem;
  private cwd = "/";

  constructor(filesystem: Filesystem) {
    this.fs = filesystem;
  }

  /**
   * Resolve a relative path against the current working directory.
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

  /**
   * List direct children of a directory, scoped to the agent's namespaces.
   * Each line is `{updated-iso}  {name}`, sorted by updated descending.
   * Directories show the max updated timestamp across their subtree.
   */
  ls(path: string, agent: string): string {
    const access = resolveAgentAccess(agent);
    const resolved = this.resolvePath(path);

    const fileRow = this.fs.getRow(resolved);
    if (fileRow !== undefined) {
      return lsSingleFile(resolved, fileRow, access);
    }
    return lsDirectory(resolved, this.fs, access);
  }

  /**
   * Search file contents. Returns matches as `path:line:content`, with
   * optional context lines as `path-line-content`. Empty result returns "".
   */
  grep(opts: GrepOpts, agent: string): string {
    validateGrepOpts(opts);
    const access = resolveAgentAccess(agent);
    const mode = opts.output_mode ?? "content";
    const { before, after } = resolveContextWindow(opts);

    const searchPath = this.resolvePath(opts.path ?? this.cwd);
    const regex = new RegExp(opts.pattern, opts["-i"] ? "i" : "");
    const rows = this.fs
      .queryByPrefix(searchPath)
      .filter((row) => isInNamespaces(row.path, access));

    let lines: string[] = [];
    for (const row of rows) {
      lines.push(...grepFileLines(row, regex, mode, before, after));
    }

    if (opts.head_limit !== undefined) {
      lines = lines.slice(0, opts.head_limit);
    }
    return lines.join("\n");
  }

  /**
   * Find files under a path, optionally filtered by name glob and mtime
   * window. Output is `{updated-iso}  {path}` per line, sorted by updated
   * descending. Throws when no matches.
   */
  find(opts: FindOpts, agent: string): string {
    validateFindOpts(opts);
    const searchPath = this.resolvePath(opts.path);
    assertAccessible(searchPath, agent);

    let rows = this.fs.queryByPrefix(searchPath);
    rows = filterByName(rows, opts.namePattern);
    rows = filterByMtime(rows, opts);

    if (rows.length === 0) {
      throw new Error("find: no matches");
    }
    return formatFindLines(rows);
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

/** Render a single timestamped entry line: `{updated}  {name}`. */
function formatEntry(updated: string, name: string): string {
  return `${updated}  ${name}`;
}

/** Compare two ISO timestamps for descending sort. */
function compareUpdatedDesc(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

/** Render `ls` output when the queried path resolves to a single file row. */
function lsSingleFile(
  resolved: string,
  fileRow: FileRow,
  access: readonly string[],
): string {
  if (!isInNamespaces(resolved, access)) {
    throw new Error(`ls: ${resolved}: No such file or directory`);
  }
  const name = resolved.split("/").pop()!;
  return formatEntry(fileRow.updated, name);
}

/**
 * Render `ls` output for a directory: one timestamped line per immediate
 * child, sorted by updated descending. Subdirectories show the max
 * updated timestamp across their entire subtree.
 */
function lsDirectory(
  resolved: string,
  fs: Filesystem,
  access: readonly string[],
): string {
  const dir = ensureTrailingSlash(resolved);
  const rows = fs
    .queryByPrefix(dir)
    .filter((row) => isInNamespaces(row.path, access));

  if (rows.length === 0) {
    throw new Error(`ls: ${resolved}: No such file or directory`);
  }

  const children = collectChildEntries(rows, dir);
  return [...children.entries()]
    .sort(([, a], [, b]) => compareUpdatedDesc(a, b))
    .map(([name, updated]) => formatEntry(updated, name))
    .join("\n");
}

/**
 * Group rows by their first path segment under `dir`. For each segment,
 * keep the max `updated` so that subdirectories surface their freshest
 * descendant.
 */
function collectChildEntries(
  rows: readonly FileRow[],
  dir: string,
): Map<string, string> {
  const childUpdated = new Map<string, string>();
  for (const row of rows) {
    const relative = row.path.slice(dir.length);
    const firstSegment = relative.split("/")[0];
    if (!firstSegment) continue;
    const isDir = relative.includes("/");
    const name = isDir ? firstSegment + "/" : firstSegment;
    const existing = childUpdated.get(name);
    if (existing === undefined || row.updated > existing) {
      childUpdated.set(name, row.updated);
    }
  }
  return childUpdated;
}

/** Reject mutually exclusive grep flag combinations. */
function validateGrepOpts(opts: GrepOpts): void {
  const hasA = opts["-A"] !== undefined;
  const hasB = opts["-B"] !== undefined;
  const hasC = opts["-C"] !== undefined;
  const mode = opts.output_mode ?? "content";

  if (hasC && (hasA || hasB)) {
    throw new Error("grep: -C cannot be combined with -A or -B");
  }
  if ((hasA || hasB || hasC) && mode !== "content") {
    throw new Error("grep: -A/-B/-C only valid with output_mode='content'");
  }
}

/** Resolve `-A` / `-B` / `-C` into concrete (before, after) line counts. */
function resolveContextWindow(opts: GrepOpts): { before: number; after: number } {
  if (opts["-C"] !== undefined) {
    return { before: opts["-C"], after: opts["-C"] };
  }
  return { before: opts["-B"] ?? 0, after: opts["-A"] ?? 0 };
}

/**
 * Run grep against one file row and return its output lines, in the
 * shape required by `output_mode`.
 */
function grepFileLines(
  row: FileRow,
  regex: RegExp,
  mode: "content" | "files_with_matches" | "count",
  before: number,
  after: number,
): string[] {
  const fileLines = row.content.split("\n");
  const matches = findMatchingLineNumbers(fileLines, regex);
  if (matches.size === 0) return [];

  if (mode === "files_with_matches") return [row.path];
  if (mode === "count") return [`${row.path}:${matches.size}`];
  return formatContentMatches(row.path, fileLines, matches, before, after);
}

/** Return a set of zero-based line indices in `lines` that match `regex`. */
function findMatchingLineNumbers(lines: string[], regex: RegExp): Set<number> {
  const matches = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i]!)) matches.add(i);
  }
  return matches;
}

/**
 * Format content-mode grep output for a single file: every matched line
 * uses `:` separators, every context line uses `-` separators. Overlapping
 * context windows merge naturally because lines are deduped via the set.
 */
function formatContentMatches(
  filePath: string,
  fileLines: string[],
  matches: Set<number>,
  before: number,
  after: number,
): string[] {
  const toEmit = expandWithContext(matches, fileLines.length, before, after);
  const sorted = [...toEmit].sort((a, b) => a - b);
  return sorted.map((i) => {
    const sep = matches.has(i) ? ":" : "-";
    return `${filePath}${sep}${i + 1}${sep}${fileLines[i]}`;
  });
}

/**
 * Expand a set of match line indices to also include `before` lines
 * before and `after` lines after each match, clamped to file bounds.
 */
function expandWithContext(
  matches: Set<number>,
  lineCount: number,
  before: number,
  after: number,
): Set<number> {
  const toEmit = new Set<number>();
  for (const matchIdx of matches) {
    const start = Math.max(0, matchIdx - before);
    const end = Math.min(lineCount - 1, matchIdx + after);
    for (let i = start; i <= end; i++) toEmit.add(i);
  }
  return toEmit;
}

/** Reject mutually exclusive find flag combinations. */
function validateFindOpts(opts: FindOpts): void {
  if (
    opts.mtimeWithinDays !== undefined &&
    opts.mtimeOlderThanDays !== undefined
  ) {
    throw new Error(
      "find: mtimeWithinDays and mtimeOlderThanDays are mutually exclusive",
    );
  }
}

/**
 * Filter rows whose basename matches the given glob pattern. Returns
 * the input unchanged if no pattern is supplied.
 */
function filterByName(rows: FileRow[], namePattern: string | undefined): FileRow[] {
  if (!namePattern) return rows;
  const regex = globToRegex(namePattern);
  return rows.filter((row) => regex.test(row.path.split("/").pop()!));
}

/**
 * Filter rows by mtime window. Returns the input unchanged if no
 * window is supplied. Caller must have already rejected the case where
 * both window fields are set.
 */
function filterByMtime(rows: FileRow[], opts: FindOpts): FileRow[] {
  if (opts.mtimeWithinDays !== undefined) {
    const cutoff = Date.now() - opts.mtimeWithinDays * MS_PER_DAY;
    return rows.filter((row) => Date.parse(row.updated) >= cutoff);
  }
  if (opts.mtimeOlderThanDays !== undefined) {
    const cutoff = Date.now() - opts.mtimeOlderThanDays * MS_PER_DAY;
    return rows.filter((row) => Date.parse(row.updated) < cutoff);
  }
  return rows;
}

/**
 * Render `find` rows as one timestamped path per line, sorted by
 * updated descending.
 */
function formatFindLines(rows: FileRow[]): string {
  return rows
    .sort((a, b) => compareUpdatedDesc(a.updated, b.updated))
    .map((row) => formatEntry(row.updated, row.path))
    .join("\n");
}
