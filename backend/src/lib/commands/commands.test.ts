import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Filesystem } from "../filesystem/filesystem.js";
import { Commands } from "./commands.js";

const AGENT = "main-agent";
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
let fs: Filesystem;
let commands: Commands;

beforeEach(() => {
  fs = new Filesystem(":memory:");
  commands = new Commands(fs);
  fs.upsert("/memories/mistakes/off-by-one.md", "Line 1\nLine 2 with error\nLine 3");
  fs.upsert("/memories/mistakes/null-handling.md", "Always check for null returns");
  fs.upsert("/memories/system-design/caching.md", "Use cache invalidation\nAvoid stale reads");
  fs.upsert("/memories/user-preferences/tabs.md", "Prefer tabs over spaces");
});

describe("echo / cat / cd / write", () => {
  it("echo joins args", () => {
    expect(commands.echo(["hello", "world"])).toBe("hello world");
  });

  it("cat returns file content", () => {
    expect(commands.cat("/memories/mistakes/off-by-one.md", AGENT)).toBe("Line 1\nLine 2 with error\nLine 3");
  });

  it("cat throws for missing file", () => {
    expect(() => commands.cat("/memories/nope.md", AGENT)).toThrow("cat: /memories/nope.md: No such file");
  });

  it("cd changes working directory", () => {
    commands.cd("/memories/mistakes/", AGENT);
    expect(commands.getCwd()).toBe("/memories/mistakes/");
  });

  it("cd throws for nonexistent directory", () => {
    expect(() => commands.cd("/memories/nonexistent/", AGENT)).toThrow("cd: /memories/nonexistent/: No such directory");
  });

  it("write creates a file and cat reads it back", () => {
    commands.write("/memories/mistakes/test.md", "test content", AGENT);
    expect(commands.cat("/memories/mistakes/test.md", AGENT)).toBe("test content");
  });

  it("write overwrites existing content", () => {
    commands.write("/memories/test.md", "original", AGENT);
    commands.write("/memories/test.md", "updated", AGENT);
    expect(commands.cat("/memories/test.md", AGENT)).toBe("updated");
  });
});

describe("ls", () => {
  it("lists top-level directories with timestamps", () => {
    const lines = commands.ls("/memories/", AGENT).split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      const [iso, name] = line.split("  ");
      expect(iso).toMatch(ISO_RE);
      expect(["mistakes/", "system-design/", "user-preferences/"]).toContain(name);
    }
  });

  it("lists files in a category with timestamps", () => {
    const lines = commands.ls("/memories/mistakes/", AGENT).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.split("  ")[1]).sort()).toEqual([
      "null-handling.md",
      "off-by-one.md",
    ]);
  });

  it("returns timestamped filename when called on a file", () => {
    const out = commands.ls("/memories/mistakes/off-by-one.md", AGENT);
    const [iso, name] = out.split("  ");
    expect(iso).toMatch(ISO_RE);
    expect(name).toBe("off-by-one.md");
  });

  it("throws for nonexistent directory", () => {
    expect(() => commands.ls("/memories/nonexistent/", AGENT)).toThrow(
      "ls: /memories/nonexistent/: No such file or directory",
    );
  });

  it("sorts entries by updated descending", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-04-29T10:00:00.000Z"));
      fs.upsert("/memories/older.md", "old");
      vi.setSystemTime(new Date("2026-04-30T10:00:00.000Z"));
      fs.upsert("/memories/newer.md", "new");

      const lines = commands.ls("/memories/", AGENT).split("\n");
      expect(lines[0]).toBe("2026-04-30T10:00:00.000Z  newer.md");
      const newerIdx = lines.findIndex((line) => line.endsWith("  newer.md"));
      const olderIdx = lines.findIndex((line) => line.endsWith("  older.md"));
      expect(newerIdx).toBeLessThan(olderIdx);
    } finally {
      vi.useRealTimers();
    }
  });

  it("directory entry uses max updated across subtree", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-04-25T00:00:00.000Z"));
      fs.upsert("/memories/topic-a/old.md", "old");
      vi.setSystemTime(new Date("2026-04-30T00:00:00.000Z"));
      fs.upsert("/memories/topic-a/fresh.md", "fresh");

      const out = commands.ls("/memories/", AGENT);
      const topicALine = out.split("\n").find((line) => line.endsWith("  topic-a/"));
      expect(topicALine).toBe("2026-04-30T00:00:00.000Z  topic-a/");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("grep", () => {
  it("finds matching lines as path:line:content", () => {
    const out = commands.grep({ pattern: "error", path: "/memories/mistakes/" }, AGENT);
    expect(out).toBe("/memories/mistakes/off-by-one.md:2:Line 2 with error");
  });

  it("-i is case-insensitive", () => {
    const out = commands.grep(
      { pattern: "ERROR", "-i": true, path: "/memories/mistakes/" },
      AGENT,
    );
    expect(out).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("output_mode files_with_matches returns one path per file", () => {
    const out = commands.grep(
      { pattern: "null", path: "/memories/", output_mode: "files_with_matches" },
      AGENT,
    );
    expect(out).toBe("/memories/mistakes/null-handling.md");
  });

  it("output_mode count returns path:count per file", () => {
    fs.upsert("/memories/multi.md", "foo\nfoo\nbar\nfoo");
    const out = commands.grep(
      { pattern: "foo", path: "/memories/multi.md", output_mode: "count" },
      AGENT,
    );
    expect(out).toBe("/memories/multi.md:3");
  });

  it("returns empty string when no match", () => {
    expect(commands.grep({ pattern: "zzzzz", path: "/memories/" }, AGENT)).toBe("");
  });

  it("-A emits N lines after match with dash separator", () => {
    const out = commands.grep(
      { pattern: "Line 2", "-A": 1, path: "/memories/mistakes/off-by-one.md" },
      AGENT,
    );
    expect(out).toBe(
      [
        "/memories/mistakes/off-by-one.md:2:Line 2 with error",
        "/memories/mistakes/off-by-one.md-3-Line 3",
      ].join("\n"),
    );
  });

  it("-B emits N lines before match", () => {
    const out = commands.grep(
      { pattern: "Line 2", "-B": 1, path: "/memories/mistakes/off-by-one.md" },
      AGENT,
    );
    expect(out).toBe(
      [
        "/memories/mistakes/off-by-one.md-1-Line 1",
        "/memories/mistakes/off-by-one.md:2:Line 2 with error",
      ].join("\n"),
    );
  });

  it("-C is shorthand for -A and -B", () => {
    const out = commands.grep(
      { pattern: "Line 2", "-C": 1, path: "/memories/mistakes/off-by-one.md" },
      AGENT,
    );
    expect(out).toBe(
      [
        "/memories/mistakes/off-by-one.md-1-Line 1",
        "/memories/mistakes/off-by-one.md:2:Line 2 with error",
        "/memories/mistakes/off-by-one.md-3-Line 3",
      ].join("\n"),
    );
  });

  it("merges overlapping context windows without duplicate lines", () => {
    fs.upsert("/memories/poem.md", "alpha\nbeta hit\ngamma\ndelta hit\nepsilon");
    const out = commands.grep(
      { pattern: "hit", "-A": 1, "-B": 1, path: "/memories/poem.md" },
      AGENT,
    );
    expect(out).toBe(
      [
        "/memories/poem.md-1-alpha",
        "/memories/poem.md:2:beta hit",
        "/memories/poem.md-3-gamma",
        "/memories/poem.md:4:delta hit",
        "/memories/poem.md-5-epsilon",
      ].join("\n"),
    );
  });

  it("head_limit slices result lines", () => {
    fs.upsert("/memories/many.md", "hit\nhit\nhit\nhit");
    const out = commands.grep(
      { pattern: "hit", path: "/memories/many.md", head_limit: 2 },
      AGENT,
    );
    expect(out.split("\n")).toHaveLength(2);
  });

  it("throws when -C combined with -A", () => {
    expect(() =>
      commands.grep(
        { pattern: "x", path: "/memories/", "-C": 1, "-A": 1 },
        AGENT,
      ),
    ).toThrow("grep: -C cannot be combined with -A or -B");
  });

  it("throws when context flag combined with non-content output_mode", () => {
    expect(() =>
      commands.grep(
        {
          pattern: "x",
          path: "/memories/",
          "-A": 1,
          output_mode: "files_with_matches",
        },
        AGENT,
      ),
    ).toThrow("grep: -A/-B/-C only valid with output_mode='content'");
  });
});

describe("find", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists files under a path with timestamp prefix", () => {
    const lines = commands.find({ path: "/memories/mistakes/" }, AGENT).split("\n");
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      const [iso, path] = line.split("  ");
      expect(iso).toMatch(ISO_RE);
      expect(path!.startsWith("/memories/mistakes/")).toBe(true);
    }
  });

  it("filters by glob namePattern", () => {
    const out = commands.find(
      { path: "/memories/", namePattern: "caching*" },
      AGENT,
    );
    const [, path] = out.split("  ");
    expect(path).toBe("/memories/system-design/caching.md");
  });

  it("filters by mtimeWithinDays", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T00:00:00.000Z"));
    fs.upsert("/memories/old-note.md", "old");
    vi.setSystemTime(new Date("2026-04-30T00:00:00.000Z"));
    fs.upsert("/memories/fresh-note.md", "fresh");

    const out = commands.find(
      { path: "/memories/", mtimeWithinDays: 1 },
      AGENT,
    );
    const paths = out.split("\n").map((line) => line.split("  ")[1]);
    expect(paths).toContain("/memories/fresh-note.md");
    expect(paths).not.toContain("/memories/old-note.md");
  });

  it("filters by mtimeOlderThanDays", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T00:00:00.000Z"));
    fs.upsert("/memories/topic/old.md", "old");
    vi.setSystemTime(new Date("2026-04-30T00:00:00.000Z"));
    fs.upsert("/memories/topic/new.md", "new");

    const out = commands.find(
      { path: "/memories/topic/", mtimeOlderThanDays: 5 },
      AGENT,
    );
    const paths = out.split("\n").map((line) => line.split("  ")[1]);
    expect(paths).toEqual(["/memories/topic/old.md"]);
  });

  it("composes namePattern and mtimeWithinDays", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T00:00:00.000Z"));
    fs.upsert("/memories/topic/recent.md", "x");
    fs.upsert("/memories/topic/recent.txt", "x");
    vi.setSystemTime(new Date("2026-04-20T00:00:00.000Z"));
    fs.upsert("/memories/topic/old.md", "x");
    vi.setSystemTime(new Date("2026-04-30T00:00:00.000Z"));

    const out = commands.find(
      { path: "/memories/topic/", namePattern: "*.md", mtimeWithinDays: 5 },
      AGENT,
    );
    const paths = out.split("\n").map((line) => line.split("  ")[1]);
    expect(paths).toEqual(["/memories/topic/recent.md"]);
  });

  it("throws when both mtime fields are set", () => {
    expect(() =>
      commands.find(
        {
          path: "/memories/",
          mtimeWithinDays: 1,
          mtimeOlderThanDays: 1,
        },
        AGENT,
      ),
    ).toThrow("find: mtimeWithinDays and mtimeOlderThanDays are mutually exclusive");
  });

  it("throws when no matches", () => {
    expect(() =>
      commands.find({ path: "/memories/", namePattern: "*.zzz" }, AGENT),
    ).toThrow("find: no matches");
  });

  it("sorts results by updated descending", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T00:00:00.000Z"));
    fs.upsert("/memories/topic/a.md", "a");
    vi.setSystemTime(new Date("2026-04-30T00:00:00.000Z"));
    fs.upsert("/memories/topic/b.md", "b");

    const out = commands.find({ path: "/memories/topic/" }, AGENT);
    const lines = out.split("\n");
    expect(lines[0]!.endsWith("  /memories/topic/b.md")).toBe(true);
    expect(lines[1]!.endsWith("  /memories/topic/a.md")).toBe(true);
  });
});
