import { describe, it, expect, beforeEach } from "vitest";
import { Filesystem } from "../filesystem/filesystem.js";
import { Commands } from "./commands.js";

const AGENT = "main-agent";
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

describe("operations", () => {
  it("echo joins args", () => {
    expect(commands.echo(["hello", "world"])).toBe("hello world");
  });

  it("cat returns file content", () => {
    expect(commands.cat("/memories/mistakes/off-by-one.md", AGENT)).toBe("Line 1\nLine 2 with error\nLine 3");
  });

  it("cat throws for missing file", () => {
    expect(() => commands.cat("/memories/nope.md", AGENT)).toThrow("cat: /memories/nope.md: No such file");
  });

  it("ls lists top-level directories", () => {
    expect(commands.ls("/memories/", AGENT)).toBe("mistakes/\nsystem-design/\nuser-preferences/");
  });

  it("ls lists files in a category", () => {
    expect(commands.ls("/memories/mistakes/", AGENT)).toBe("null-handling.md\noff-by-one.md");
  });

  it("ls returns filename when called on a file", () => {
    expect(commands.ls("/memories/mistakes/off-by-one.md", AGENT)).toBe("off-by-one.md");
  });

  it("ls throws for empty directory", () => {
    expect(() => commands.ls("memories/nonexistent/", AGENT)).toThrow("ls: /memories/nonexistent/: No such file or directory");
  });

  it("grep finds matching lines", () => {
    expect(commands.grep(["error", "/memories/mistakes/"], AGENT)).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("grep -i is case-insensitive", () => {
    expect(commands.grep(["-i", "ERROR", "/memories/mistakes/"], AGENT)).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("grep -l returns files only", () => {
    expect(commands.grep(["-l", "null", "/memories/"], AGENT)).toBe("/memories/mistakes/null-handling.md");
  });

  it("grep returns empty when no match", () => {
    expect(commands.grep(["zzzzz", "/memories/"], AGENT)).toBe("");
  });

  it("find lists files under a path", () => {
    expect(commands.find(["/memories/mistakes/"], AGENT).split("\n")).toHaveLength(2);
  });

  it("find filters by glob pattern", () => {
    expect(commands.find(["/memories/", "-name", "*.md"], AGENT).split("\n")).toHaveLength(4);
  });

  it("find filters by specific name", () => {
    expect(commands.find(["/memories/", "-name", "caching*"], AGENT)).toBe("/memories/system-design/caching.md");
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
