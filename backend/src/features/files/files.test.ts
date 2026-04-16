import { describe, it, expect, beforeEach } from "vitest";
import { createFilesystem, getFilesystem } from "../../lib/filesystem/index.js";
import { getFile, listDirectory } from "./service.js";

beforeEach(() => {
  createFilesystem(":memory:");
  const fs = getFilesystem();
  fs.upsert("/memories/mistakes/off-by-one.md", "watch your indices");
  fs.upsert("/memories/mistakes/null-handling.md", "check for null");
  fs.upsert("/memories/system-design/caching.md", "invalidation is hard");
  fs.upsert("/memories/todo.md", "buy milk");
});

describe("getFile", () => {
  it("returns the file row for an existing path", () => {
    const file = getFile("/memories/todo.md", "all");
    expect(file).not.toBeNull();
    expect(file!.content).toBe("buy milk");
    expect(file!.path).toBe("/memories/todo.md");
  });

  it("returns null for a nonexistent path", () => {
    expect(getFile("/memories/nonexistent.md", "all")).toBeNull();
  });

  it("returns null for a directory path", () => {
    expect(getFile("/memories/mistakes/", "all")).toBeNull();
  });

  it("returns null when file is outside the access scope", () => {
    expect(getFile("/memories/todo.md", "memory-agent")).not.toBeNull();
    const fs = getFilesystem();
    fs.upsert("/global/config.md", "config");
    expect(getFile("/global/config.md", "memory-agent")).toBeNull();
  });
});

describe("listDirectory", () => {
  it("lists direct children with correct types", () => {
    const children = listDirectory("/memories", "all");
    expect(children).toEqual([
      { name: "mistakes/", type: "dir" },
      { name: "system-design/", type: "dir" },
      { name: "todo.md", type: "file" },
    ]);
  });

  it("lists files inside a subdirectory", () => {
    const children = listDirectory("/memories/mistakes", "all");
    expect(children).toEqual([
      { name: "null-handling.md", type: "file" },
      { name: "off-by-one.md", type: "file" },
    ]);
  });

  it("works with trailing slash", () => {
    const children = listDirectory("/memories/", "all");
    expect(children).toEqual([
      { name: "mistakes/", type: "dir" },
      { name: "system-design/", type: "dir" },
      { name: "todo.md", type: "file" },
    ]);
  });

  it("returns null for a nonexistent path", () => {
    expect(listDirectory("/nonexistent", "all")).toBeNull();
  });

  it("returns children sorted alphabetically", () => {
    const fs = getFilesystem();
    fs.upsert("/memories/zebra.md", "z");
    fs.upsert("/memories/alpha.md", "a");
    const children = listDirectory("/memories", "all");
    const names = children!.map((c) => c.name);
    expect(names).toEqual([...names].sort());
  });

  it("filters children by access scope", () => {
    const fs = getFilesystem();
    fs.upsert("/global/config.md", "config");
    const rootAll = listDirectory("/", "all");
    expect(rootAll!.map((c) => c.name)).toContain("global/");

    const rootMemoryAgent = listDirectory("/", "memory-agent");
    expect(rootMemoryAgent!.map((c) => c.name)).not.toContain("global/");
    expect(rootMemoryAgent!.map((c) => c.name)).toContain("memories/");
  });
});
