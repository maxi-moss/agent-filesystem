import { describe, it, expect } from "vitest";
import { newsTools } from "./tools.js";

describe("newsTools", () => {
  it("exposes the filesystem and news-fetching tools", () => {
    expect(Object.keys(newsTools).sort()).toEqual([
      "cat",
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
    expect(keys).not.toContain("find");
  });
});
