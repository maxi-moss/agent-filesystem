import { describe, it, expect, beforeEach } from "vitest";
import { init, run } from "../src/index.js";
import { resetCwd } from "../src/commands.js";

beforeEach(() => {
  init(":memory:");
  resetCwd();
});

describe("full integration", () => {
  it("supports a realistic agent workflow", () => {
    // Agent writes memories across categories
    run('echo "Always use strict TypeScript" > /memories/user-preferences/typescript.md');
    run('echo "Forgot to handle null return from db.get" > /memories/mistakes/null-handling.md');
    run('echo "Use WAL mode for SQLite" > /memories/system-design/sqlite-config.md');

    // Agent browses top-level categories
    expect(run("ls /memories/")).toBe(
      "mistakes/\nsystem-design/\nuser-preferences/"
    );

    // Agent lists files in a category
    expect(run("ls /memories/mistakes/")).toBe("null-handling.md");

    // Agent reads a specific memory
    expect(run("cat /memories/mistakes/null-handling.md")).toBe(
      "Forgot to handle null return from db.get"
    );

    // Agent searches across all memories
    const grepResult = run("grep TypeScript /memories/");
    expect(grepResult).toContain("user-preferences/typescript.md");

    // Agent finds all markdown files
    const findResult = run('find /memories/ -name "*.md"');
    expect(findResult.split("\n")).toHaveLength(3);

    // Agent navigates into a directory
    expect(run("cd /memories/mistakes/")).toBe("/memories/mistakes/");

    // Agent overwrites a memory
    run('echo "Updated: always check nulls AND undefined" > /memories/mistakes/null-handling.md');
    expect(run("cat /memories/mistakes/null-handling.md")).toBe(
      "Updated: always check nulls AND undefined"
    );
  });

  it("handles grep output redirected to a new file", () => {
    run('echo "auth tokens should expire after 24h" > /memories/system-design/auth.md');
    run('echo "cache invalidation is hard" > /memories/system-design/caching.md');

    run("grep auth /memories/system-design/ > /memories/summaries/auth-notes.md");

    const summary = run("cat /memories/summaries/auth-notes.md");
    expect(summary).toContain("auth tokens should expire");

    // New category was created implicitly
    expect(run("ls /memories/")).toContain("summaries/");
  });
});
