import { describe, it, expect, beforeEach } from "vitest";
import { init, getRow, queryByPrefix, upsert } from "../src/db.js";

describe("db", () => {
  beforeEach(() => {
    init(":memory:");
  });

  it("upserts and retrieves by path", () => {
    upsert("/memories/mistakes/off-by-one.md", "Original content");
    expect(getRow("/memories/mistakes/off-by-one.md")?.content).toBe("Original content");
  });

  it("overwrites content on upsert but preserves created timestamp", async () => {
    upsert("/memories/mistakes/off-by-one.md", "Original");
    const before = getRow("/memories/mistakes/off-by-one.md");

    await new Promise((r) => setTimeout(r, 10));

    upsert("/memories/mistakes/off-by-one.md", "Updated");
    const after = getRow("/memories/mistakes/off-by-one.md");

    expect(after?.content).toBe("Updated");
    expect(after?.created).toBe(before?.created);
    expect(after?.updated).not.toBe(before?.updated);
  });

  it("returns null for missing path", () => {
    expect(getRow("/memories/nonexistent.md")).toBeUndefined();
  });

  it("queries by prefix", () => {
    upsert("/memories/mistakes/a.md", "aaa");
    upsert("/memories/mistakes/b.md", "bbb");
    upsert("/memories/system-design/c.md", "ccc");

    const mistakes = queryByPrefix("/memories/mistakes/");
    expect(mistakes).toHaveLength(2);

    const all = queryByPrefix("/memories/");
    expect(all).toHaveLength(3);
  });

  it("returns empty array for prefix with no matches", () => {
    expect(queryByPrefix("/memories/nonexistent/")).toEqual([]);
  });
});
