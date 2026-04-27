import { describe, it, expect, beforeEach } from "vitest";
import { Filesystem } from "./filesystem.js";

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
