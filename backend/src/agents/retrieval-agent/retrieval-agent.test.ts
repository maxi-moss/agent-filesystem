import { describe, it, expect, beforeEach } from "vitest";
import { createFilesystem, getFilesystem } from "../../lib/filesystem/index.js";
import { buildFiletree } from "../../lib/filesystem/buildFiletree.js";
import { retrievalTools } from "./tools.js";
import { buildSystemPrompt } from "./prompts.js";

describe("retrievalTools", () => {
  it("exposes exactly the read-only filesystem tools", () => {
    expect(Object.keys(retrievalTools).sort()).toEqual(["cat", "find", "grep", "ls"]);
  });

  it("does not expose write or cd (read-only invariant)", () => {
    const keys = Object.keys(retrievalTools);
    expect(keys).not.toContain("write");
    expect(keys).not.toContain("cd");
  });
});

describe("buildSystemPrompt", () => {
  it("embeds the passed filetree verbatim", () => {
    const tree = "/\n├── jira/\n│   └── PROJ-1.md\n└── memories/\n    └── caching.md";
    expect(buildSystemPrompt(tree)).toContain(tree);
  });

  it("mandates the ## Sources section", () => {
    expect(buildSystemPrompt("/")).toContain("## Sources");
  });

  it("encodes the honesty contract", () => {
    const prompt = buildSystemPrompt("/");
    expect(prompt).toContain("never invent");
    expect(prompt).toContain("If you find nothing relevant");
  });
});

describe("buildFiletree under the all scope", () => {
  beforeEach(() => {
    createFilesystem(":memory:");
  });

  it("renders files across multiple namespaces", () => {
    const filesystem = getFilesystem();
    filesystem.upsert("/jira/PROJ-1.md", "ticket body");
    filesystem.upsert("/memories/caching.md", "caching decision");

    const tree = buildFiletree("all");

    expect(tree).toContain("jira/");
    expect(tree).toContain("PROJ-1.md");
    expect(tree).toContain("memories/");
    expect(tree).toContain("caching.md");
  });
});
