import { describe, it, expect, beforeEach } from "vitest";
import * as db from "../src/db.js";
import * as commands from "../src/commands.js";

beforeEach(() => {
  db.init(":memory:");
  commands.resetCwd();
  db.upsert("/memories/mistakes/off-by-one.md", "Line 1\nLine 2 with error\nLine 3");
  db.upsert("/memories/mistakes/null-handling.md", "Always check for null returns");
  db.upsert("/memories/system-design/caching.md", "Use cache invalidation\nAvoid stale reads");
  db.upsert("/memories/user-preferences/tabs.md", "Prefer tabs over spaces");
});

describe("echo", () => {
  it("joins args into a string", () => {
    expect(commands.echo(["hello", "world"])).toBe("hello world");
  });
});

describe("cat", () => {
  it("returns file content", () => {
    expect(commands.cat("/memories/mistakes/off-by-one.md")).toBe("Line 1\nLine 2 with error\nLine 3");
  });

  it("throws for missing file", () => {
    expect(() => commands.cat("/memories/nope.md")).toThrow("cat: /memories/nope.md: No such file");
  });
});

describe("ls", () => {
  it("lists top-level directories", () => {
    const result = commands.ls("/memories/");
    expect(result).toBe("mistakes/\nsystem-design/\nuser-preferences/");
  });

  it("lists files in a category", () => {
    const result = commands.ls("/memories/mistakes/");
    expect(result).toBe("null-handling.md\noff-by-one.md");
  });

  it("returns filename when called on a file", () => {
    expect(commands.ls("/memories/mistakes/off-by-one.md")).toBe("off-by-one.md");
  });

  it("throws for empty directory", () => {
    expect(() => commands.ls("/nonexistent/")).toThrow("ls: /nonexistent/: No such file or directory");
  });
});

describe("grep", () => {
  it("finds matching lines across files", () => {
    const result = commands.grep(["error", "/memories/mistakes/"]);
    expect(result).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("supports case-insensitive flag", () => {
    const result = commands.grep(["-i", "ERROR", "/memories/mistakes/"]);
    expect(result).toContain("off-by-one.md:2:Line 2 with error");
  });

  it("supports files-only flag", () => {
    const result = commands.grep(["-l", "null", "/memories/"]);
    expect(result).toBe("/memories/mistakes/null-handling.md");
  });

  it("returns empty string when nothing found", () => {
    const result = commands.grep(["zzzzz", "/memories/"]);
    expect(result).toBe("");
  });
});

describe("find", () => {
  it("finds all files under a path", () => {
    const result = commands.find(["/memories/mistakes/"]);
    expect(result.split("\n")).toHaveLength(2);
  });

  it("filters by glob pattern", () => {
    const result = commands.find(["/memories/", "-name", "*.md"]);
    expect(result.split("\n")).toHaveLength(4);
  });

  it("filters by specific name", () => {
    const result = commands.find(["/memories/", "-name", "caching*"]);
    expect(result).toBe("/memories/system-design/caching.md");
  });
});

describe("cd", () => {
  it("changes working directory", () => {
    commands.cd("/memories/mistakes/");
    expect(commands.getCwd()).toBe("/memories/mistakes/");
  });

  it("throws for nonexistent directory", () => {
    expect(() => commands.cd("/nonexistent/")).toThrow("cd: /nonexistent/: No such directory");
  });
});
