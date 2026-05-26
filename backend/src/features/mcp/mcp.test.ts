import { describe, it, expect, beforeEach } from "vitest";
import { createFilesystem, getFilesystem } from "../../lib/filesystem/index.js";
import { getFullFileContents } from "./service.js";

describe("getFullFileContents", () => {
  beforeEach(() => {
    createFilesystem(":memory:");
  });

  it("returns path, content and updated for each requested path, preserving input order", () => {
    const filesystem = getFilesystem();
    filesystem.upsert("/memories/caching.md", "caching decision");
    filesystem.upsert("/jira/PROJ-1.md", "ticket body");

    const result = getFullFileContents(["/jira/PROJ-1.md", "/memories/caching.md"]);

    expect(result.map((file) => file.path)).toEqual([
      "/jira/PROJ-1.md",
      "/memories/caching.md",
    ]);
    expect(result[0]).toMatchObject({ path: "/jira/PROJ-1.md", content: "ticket body" });
    expect(result[1]).toMatchObject({
      path: "/memories/caching.md",
      content: "caching decision",
    });
    for (const file of result) {
      expect(typeof file.updated).toBe("string");
      expect(file.updated.length).toBeGreaterThan(0);
    }
  });

  it("returns files from any namespace (direct read ignores namespace scoping)", () => {
    const filesystem = getFilesystem();
    filesystem.upsert("/jira/PROJ-2.md", "jira content");
    filesystem.upsert("/news/article.md", "news content");
    filesystem.upsert("/slack/thread.md", "slack content");

    const result = getFullFileContents([
      "/jira/PROJ-2.md",
      "/news/article.md",
      "/slack/thread.md",
    ]);

    expect(result.map((file) => file.path)).toEqual([
      "/jira/PROJ-2.md",
      "/news/article.md",
      "/slack/thread.md",
    ]);
  });

  it("silently skips paths with no matching file", () => {
    const filesystem = getFilesystem();
    filesystem.upsert("/memories/known.md", "known content");

    const result = getFullFileContents(["/memories/known.md", "/memories/missing.md"]);

    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe("/memories/known.md");
  });
});
