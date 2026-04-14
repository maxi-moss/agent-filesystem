import { describe, it, expect, beforeEach } from "vitest";
import { Filesystem } from "./filesystem.js";

const AGENT = "main-agent";
let fs: Filesystem;

beforeEach(() => {
  fs = new Filesystem(":memory:");
});

describe("data access", () => {
  it("upserts and retrieves by path", () => {
    fs.upsert("/memories/mistakes/off-by-one.md", "Original content");
    expect(fs.getRow("/memories/mistakes/off-by-one.md")?.content).toBe("Original content");
  });

  it("overwrites content but preserves created timestamp", async () => {
    fs.upsert("/memories/mistakes/off-by-one.md", "Original");
    const before = fs.getRow("/memories/mistakes/off-by-one.md");

    await new Promise((resolve) => setTimeout(resolve, 10));

    fs.upsert("/memories/mistakes/off-by-one.md", "Updated");
    const after = fs.getRow("/memories/mistakes/off-by-one.md");

    expect(after?.content).toBe("Updated");
    expect(after?.created).toBe(before?.created);
    expect(after?.updated).not.toBe(before?.updated);
  });

  it("returns undefined for missing path", () => {
    expect(fs.getRow("/memories/nonexistent.md")).toBeUndefined();
  });

  it("queries by prefix", () => {
    fs.upsert("/memories/mistakes/a.md", "aaa");
    fs.upsert("/memories/mistakes/b.md", "bbb");
    fs.upsert("/memories/system-design/c.md", "ccc");

    expect(fs.queryByPrefix("/memories/mistakes/")).toHaveLength(2);
    expect(fs.queryByPrefix("/memories/")).toHaveLength(3);
  });

  it("returns empty array for prefix with no matches", () => {
    expect(fs.queryByPrefix("/memories/nonexistent/")).toEqual([]);
  });
});

describe("operations", () => {
  beforeEach(() => {
    fs.upsert("/memories/mistakes/off-by-one.md", "Line 1\nLine 2 with error\nLine 3");
    fs.upsert("/memories/mistakes/null-handling.md", "Always check for null returns");
    fs.upsert("/memories/system-design/caching.md", "Use cache invalidation\nAvoid stale reads");
    fs.upsert("/memories/user-preferences/tabs.md", "Prefer tabs over spaces");
  });

  it("echo joins args", () => {
    expect(fs.echo(["hello", "world"])).toBe("hello world");
  });

  it("cat returns file content", () => {
    expect(fs.cat("/memories/mistakes/off-by-one.md", AGENT)).toBe("Line 1\nLine 2 with error\nLine 3");
  });

  it("cat throws for missing file", () => {
    expect(() => fs.cat("/memories/nope.md", AGENT)).toThrow("cat: /memories/nope.md: No such file");
  });

  it("ls lists top-level directories", () => {
    expect(fs.ls("/memories/", AGENT)).toBe("mistakes/\nsystem-design/\nuser-preferences/");
  });

  it("ls lists files in a category", () => {
    expect(fs.ls("/memories/mistakes/", AGENT)).toBe("null-handling.md\noff-by-one.md");
  });

  it("ls returns filename when called on a file", () => {
    expect(fs.ls("/memories/mistakes/off-by-one.md", AGENT)).toBe("off-by-one.md");
  });

  it("ls throws for empty directory", () => {
    expect(() => fs.ls("memories/nonexistent/", AGENT)).toThrow("ls: /memories/nonexistent/: No such file or directory");
  });

  it("grep finds matching lines", () => {
    expect(fs.grep(["error", "/memories/mistakes/"], AGENT)).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("grep -i is case-insensitive", () => {
    expect(fs.grep(["-i", "ERROR", "/memories/mistakes/"], AGENT)).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("grep -l returns files only", () => {
    expect(fs.grep(["-l", "null", "/memories/"], AGENT)).toBe("/memories/mistakes/null-handling.md");
  });

  it("grep returns empty when no match", () => {
    expect(fs.grep(["zzzzz", "/memories/"], AGENT)).toBe("");
  });

  it("find lists files under a path", () => {
    expect(fs.find(["/memories/mistakes/"], AGENT).split("\n")).toHaveLength(2);
  });

  it("find filters by glob pattern", () => {
    expect(fs.find(["/memories/", "-name", "*.md"], AGENT).split("\n")).toHaveLength(4);
  });

  it("find filters by specific name", () => {
    expect(fs.find(["/memories/", "-name", "caching*"], AGENT)).toBe("/memories/system-design/caching.md");
  });

  it("cd changes working directory", () => {
    fs.cd("/memories/mistakes/", AGENT);
    expect(fs.getCwd()).toBe("/memories/mistakes/");
  });

  it("cd throws for nonexistent directory", () => {
    expect(() => fs.cd("/memories/nonexistent/", AGENT)).toThrow("cd: /memories/nonexistent/: No such directory");
  });

  it("write creates a file and cat reads it back", () => {
    fs.write("/memories/mistakes/test.md", "test content", AGENT);
    expect(fs.cat("/memories/mistakes/test.md", AGENT)).toBe("test content");
  });

  it("write overwrites existing content", () => {
    fs.write("/memories/test.md", "original", AGENT);
    fs.write("/memories/test.md", "updated", AGENT);
    expect(fs.cat("/memories/test.md", AGENT)).toBe("updated");
  });
});
