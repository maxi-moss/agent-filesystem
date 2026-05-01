import { describe, it, expect } from "vitest";
import { newsTools } from "./tools.js";
import { buildSystemPrompt } from "./prompts.js";

describe("newsTools", () => {
  it("exposes the filesystem and news-fetching tools", () => {
    expect(Object.keys(newsTools).sort()).toEqual([
      "cat",
      "find",
      "getFullArticle",
      "grep",
      "ls",
      "searchNews",
      "topHeadlinesToday",
      "write",
    ]);
  });

  it("does not expose navigation tools the agent shouldn't need", () => {
    const keys = Object.keys(newsTools);
    expect(keys).not.toContain("cd");
  });
});

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt("/news/\n  sudan-civil-war/\n", "2026-04-30");

  it("injects today's date and the filetree", () => {
    expect(prompt).toContain("2026-04-30");
    expect(prompt).toContain("sudan-civil-war/");
  });

  it("describes the topic-first hierarchy with briefing and events files", () => {
    expect(prompt).toContain("briefing.md");
    expect(prompt).toContain("events/");
  });

  it("documents both frontmatter schemas", () => {
    expect(prompt).toContain("type: briefing");
    expect(prompt).toContain("type: event");
  });

  it("teaches the four-way persistence decision tree", () => {
    expect(prompt).toContain("SKIP");
    expect(prompt).toContain("UPDATE briefing");
    expect(prompt).toContain("CREATE event");
    expect(prompt).toContain("CREATE topic");
  });

  it("points the agent at find mtimeWithinDays for recency queries", () => {
    expect(prompt).toContain("mtimeWithinDays");
  });

  it("does not retain the old shallow stop instruction", () => {
    expect(prompt).not.toContain("stop once today's notable stories");
  });
});
