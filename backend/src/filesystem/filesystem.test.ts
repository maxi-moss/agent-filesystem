import { describe, it, expect, beforeEach } from "vitest";
import * as db from "./db.js";
import * as commands from "./commands.js";
import { parseCommand } from "./parser.js";
import { execute } from "./executor.js";
import { run, init } from "./index.js";

const AGENT = "main-agent";

beforeEach(() => {
  init(":memory:");
  commands.resetCwd();
});

describe("parseCommand", () => {
  it("parses a simple command with one arg", () => {
    expect(parseCommand("ls /memories/")).toEqual({
      command: "ls",
      args: ["/memories/"],
      redirect: undefined,
    });
  });

  it("parses cat with a file path", () => {
    expect(parseCommand("cat /memories/mistakes/foo.md")).toEqual({
      command: "cat",
      args: ["/memories/mistakes/foo.md"],
      redirect: undefined,
    });
  });

  it("parses echo with quoted string and redirect", () => {
    expect(parseCommand('echo "hello world" > /memories/test.md')).toEqual({
      command: "echo",
      args: ["hello world"],
      redirect: "/memories/test.md",
    });
  });

  it("parses single-quoted strings", () => {
    expect(parseCommand("echo 'single quotes' > /memories/test.md")).toEqual({
      command: "echo",
      args: ["single quotes"],
      redirect: "/memories/test.md",
    });
  });

  it("parses grep with flags", () => {
    expect(parseCommand('grep -i "pattern" /memories/')).toEqual({
      command: "grep",
      args: ["-i", "pattern", "/memories/"],
      redirect: undefined,
    });
  });

  it("parses find with -name flag", () => {
    expect(parseCommand('find /memories/ -name "*.md"')).toEqual({
      command: "find",
      args: ["/memories/", "-name", "*.md"],
      redirect: undefined,
    });
  });

  it("throws on empty input", () => {
    expect(() => parseCommand("")).toThrow();
  });

  it("throws on unsupported shell syntax", () => {
    expect(() => parseCommand("echo $HOME")).toThrow("Unsupported shell syntax");
  });
});

describe("db", () => {
  it("upserts and retrieves by path", () => {
    db.upsert("/memories/mistakes/off-by-one.md", "Original content");
    expect(db.getRow("/memories/mistakes/off-by-one.md")?.content).toBe("Original content");
  });

  it("overwrites content but preserves created timestamp", async () => {
    db.upsert("/memories/mistakes/off-by-one.md", "Original");
    const before = db.getRow("/memories/mistakes/off-by-one.md");

    await new Promise((r) => setTimeout(r, 10));

    db.upsert("/memories/mistakes/off-by-one.md", "Updated");
    const after = db.getRow("/memories/mistakes/off-by-one.md");

    expect(after?.content).toBe("Updated");
    expect(after?.created).toBe(before?.created);
    expect(after?.updated).not.toBe(before?.updated);
  });

  it("returns undefined for missing path", () => {
    expect(db.getRow("/memories/nonexistent.md")).toBeUndefined();
  });

  it("queries by prefix", () => {
    db.upsert("/memories/mistakes/a.md", "aaa");
    db.upsert("/memories/mistakes/b.md", "bbb");
    db.upsert("/memories/system-design/c.md", "ccc");

    expect(db.queryByPrefix("/memories/mistakes/")).toHaveLength(2);
    expect(db.queryByPrefix("/memories/")).toHaveLength(3);
  });

  it("returns empty array for prefix with no matches", () => {
    expect(db.queryByPrefix("/memories/nonexistent/")).toEqual([]);
  });
});

describe("commands", () => {
  beforeEach(() => {
    db.upsert("/memories/mistakes/off-by-one.md", "Line 1\nLine 2 with error\nLine 3");
    db.upsert("/memories/mistakes/null-handling.md", "Always check for null returns");
    db.upsert("/memories/system-design/caching.md", "Use cache invalidation\nAvoid stale reads");
    db.upsert("/memories/user-preferences/tabs.md", "Prefer tabs over spaces");
  });

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
    expect(() => commands.ls("memories/nonexistent/", AGENT)).toThrow("ls: /memories/nonexistent/: No such file or directory")
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
});

describe("executor", () => {
  const exec = (input: string) => execute(parseCommand(input), AGENT);

  it("writes via redirect and returns confirmation", () => {
    expect(exec('echo "test content" > /memories/mistakes/test.md')).toBe("Wrote to /memories/mistakes/test.md");
  });

  it("reads back written content", () => {
    exec('echo "test content" > /memories/mistakes/test.md');
    expect(exec("cat /memories/mistakes/test.md")).toBe("test content");
  });

  it("overwrites on second write", () => {
    exec('echo "original" > /memories/test.md');
    exec('echo "updated" > /memories/test.md');
    expect(exec("cat /memories/test.md")).toBe("updated");
  });

  it("returns error for unknown commands", () => {
    expect(exec("whoami")).toBe("whoami: command not found");
  });

  it("does not redirect error output to file", () => {
    const result = exec("cat /memories/nonexistent.md > /memories/output.md");
    expect(result).toContain("No such file");
    expect(db.getRow("/memories/output.md")).toBeUndefined();
  });
});

describe("integration", () => {
  it("supports a realistic agent workflow", () => {
    run('echo "Always use strict TypeScript" > /memories/user-preferences/typescript.md', AGENT);
    run('echo "Forgot to handle null return from db.get" > /memories/mistakes/null-handling.md', AGENT);
    run('echo "Use WAL mode for SQLite" > /memories/system-design/sqlite-config.md', AGENT);

    expect(run("ls /memories/", AGENT)).toBe("mistakes/\nsystem-design/\nuser-preferences/");
    expect(run("ls /memories/mistakes/", AGENT)).toBe("null-handling.md");
    expect(run("cat /memories/mistakes/null-handling.md", AGENT)).toBe("Forgot to handle null return from db.get");
    expect(run("grep TypeScript /memories/", AGENT)).toContain("user-preferences/typescript.md");
    expect(run('find /memories/ -name "*.md"', AGENT).split("\n")).toHaveLength(3);
    expect(run("cd /memories/mistakes/", AGENT)).toBe("/memories/mistakes/");

    run('echo "Updated: always check nulls AND undefined" > /memories/mistakes/null-handling.md', AGENT);
    expect(run("cat /memories/mistakes/null-handling.md", AGENT)).toBe("Updated: always check nulls AND undefined");
  });

  it("handles grep output redirected to a new file", () => {
    run('echo "auth tokens should expire after 24h" > /memories/system-design/auth.md', AGENT);
    run('echo "cache invalidation is hard" > /memories/system-design/caching.md', AGENT);
    run("grep auth /memories/system-design/ > /memories/summaries/auth-notes.md", AGENT);

    expect(run("cat /memories/summaries/auth-notes.md", AGENT)).toContain("auth tokens should expire");
    expect(run("ls /memories/", AGENT)).toContain("summaries/");
  });
});
