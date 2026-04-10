import { describe, it, expect, beforeEach } from "vitest";
import * as db from "../../filesystem/db.js";
import { init } from "../../filesystem/index.js";
import { buildFiletree } from "./buildFiletree.js";
import { memoryTools } from "./tools.js";

beforeEach(() => {
  init(":memory:");
});

describe("buildFiletree", () => {
  it("returns empty marker for empty DB", () => {
    expect(buildFiletree()).toBe("/ (empty)");
  });

  it("renders a single file at root", () => {
    db.upsert("/notes.md", "hello");
    expect(buildFiletree()).toBe(
      ["/", "└── notes.md"].join("\n"),
    );
  });

  it("renders nested structure with correct indentation", () => {
    db.upsert("/a/b/c.md", "deep");
    db.upsert("/a/d.md", "shallow");
    expect(buildFiletree()).toBe(
      [
        "/",
        "└── a/",
        "    ├── b/",
        "    │   └── c.md",
        "    └── d.md",
      ].join("\n"),
    );
  });

  it("renders multiple top-level dirs sorted", () => {
    db.upsert("/people/bob.md", "Bob info");
    db.upsert("/companies/google.md", "Google info");
    db.upsert("/notes.md", "misc");
    expect(buildFiletree()).toBe(
      [
        "/",
        "├── companies/",
        "│   └── google.md",
        "├── notes.md",
        "└── people/",
        "    └── bob.md",
      ].join("\n"),
    );
  });

  it("handles sibling files and dirs correctly", () => {
    db.upsert("/readme.md", "top");
    db.upsert("/docs/guide.md", "guide");
    db.upsert("/docs/api.md", "api");
    expect(buildFiletree()).toBe(
      [
        "/",
        "├── docs/",
        "│   ├── api.md",
        "│   └── guide.md",
        "└── readme.md",
      ].join("\n"),
    );
  });
});

describe("memoryTools", () => {
  it("exposes exactly cat, grep, and write", () => {
    const keys = Object.keys(memoryTools).sort();
    expect(keys).toEqual(["cat", "grep", "write"]);
  });

  it("does not include cd, ls, or find", () => {
    const keys = Object.keys(memoryTools);
    expect(keys).not.toContain("cd");
    expect(keys).not.toContain("ls");
    expect(keys).not.toContain("find");
  });
});
