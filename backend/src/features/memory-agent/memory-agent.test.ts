import { describe, it, expect, beforeEach } from "vitest";
import { createFilesystem, getFilesystem } from "../../lib/filesystem/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js"
import { memoryTools } from "./tools.js";

const AGENT = "memory-agent";

beforeEach(() => {
  createFilesystem(":memory:");
});

describe("buildFiletree", () => {
  it("returns empty marker for empty DB", () => {
    expect(buildFiletree(AGENT)).toBe("/ (empty)");
  });

  it("renders a single file under a namespace", () => {
    getFilesystem().upsert("/memories/notes.md", "hello");
    expect(buildFiletree(AGENT)).toBe(
      ["/", "└── memories/", "    └── notes.md"].join("\n"),
    );
  });

  it("renders nested structure with correct indentation", () => {
    const fs = getFilesystem();
    fs.upsert("/memories/a/b/c.md", "deep");
    fs.upsert("/memories/a/d.md", "shallow");
    expect(buildFiletree(AGENT)).toBe(
      [
        "/",
        "└── memories/",
        "    └── a/",
        "        ├── b/",
        "        │   └── c.md",
        "        └── d.md",
      ].join("\n"),
    );
  });

  it("renders multiple accessible namespaces sorted", () => {
    const fs = getFilesystem();
    fs.upsert("/memories/bob.md", "Bob info");
    fs.upsert("/news/headline.md", "Breaking");
    expect(buildFiletree(AGENT)).toBe(
      [
        "/",
        "├── memories/",
        "│   └── bob.md",
        "└── news/",
        "    └── headline.md",
      ].join("\n"),
    );
  });

  it("filters out files in namespaces outside the agent's access", () => {
    const fs = getFilesystem();
    fs.upsert("/memories/mine.md", "in scope");
    fs.upsert("/summaries/theirs.md", "out of scope");
    expect(buildFiletree(AGENT)).toBe(
      ["/", "└── memories/", "    └── mine.md"].join("\n"),
    );
  });

  it("throws when the agent is not registered in the access table", () => {
    expect(() => buildFiletree("unknown-agent")).toThrow(
      "unknown-agent: agent does not exist in access table",
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
