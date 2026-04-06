import { describe, it, expect, beforeEach } from "vitest";
import * as db from "../src/db.js";
import * as commands from "../src/commands.js";
import { parseCommand } from "../src/parser.js";
import { execute } from "../src/executor.js";

function run(input: string): string {
  return execute(parseCommand(input));
}

beforeEach(() => {
  db.init(":memory:");
  commands.resetCwd();
});

describe("execute", () => {
  it("writes via redirect and returns confirmation", () => {
    const result = run('echo "test content" > /memories/mistakes/test.md');
    expect(result).toBe("Wrote to /memories/mistakes/test.md");
  });

  it("reads back written content", () => {
    run('echo "test content" > /memories/mistakes/test.md');
    expect(run("cat /memories/mistakes/test.md")).toBe("test content");
  });

  it("lists directories after writing", () => {
    run('echo "a" > /memories/mistakes/a.md');
    run('echo "b" > /memories/system-design/b.md');
    expect(run("ls /memories/")).toBe("mistakes/\nsystem-design/");
  });

  it("overwrites on second write to same path", () => {
    run('echo "original" > /memories/test.md');
    run('echo "updated" > /memories/test.md');
    expect(run("cat /memories/test.md")).toBe("updated");
  });

  it("greps across files", () => {
    run('echo "hello world" > /memories/a.md');
    run('echo "goodbye world" > /memories/b.md');
    const result = run("grep world /memories/");
    expect(result).toContain("/memories/a.md:1:hello world");
    expect(result).toContain("/memories/b.md:1:goodbye world");
  });

  it("redirects grep output to a file", () => {
    run('echo "important note" > /memories/source.md');
    run("grep important /memories/ > /memories/summary.md");
    expect(run("cat /memories/summary.md")).toContain("important note");
  });

  it("returns error for unknown commands", () => {
    expect(run("whoami")).toBe("whoami: command not found");
  });

  it("does not redirect error output to file", () => {
    const result = run("cat /nonexistent.md > /memories/output.md");
    expect(result).toContain("No such file");
    expect(db.getRow("/memories/output.md")).toBeUndefined();
  });
});
