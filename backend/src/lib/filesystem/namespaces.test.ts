import { describe, it, expect } from "vitest";
import { resolveAgentAccess, isInNamespaces, assertAccessible } from "./namespaces.js";

describe("resolveAgentAccess", () => {
  it("returns namespaces for a registered agent", () => {
    expect(resolveAgentAccess("main-agent")).toEqual([
      "/global/",
      "/memories/",
      "/news/",
      "/notes/",
      "/summaries/",
    ]);
  });

  it("throws for an unknown agent", () => {
    expect(() => resolveAgentAccess("rogue-agent")).toThrow(
      "rogue-agent: agent does not exist in access table",
    );
  });
});

describe("isInNamespaces", () => {
  const namespaces = ["/memories/", "/news/"];

  it("returns true for a file inside an allowed namespace", () => {
    expect(isInNamespaces("/memories/foo.md", namespaces)).toBe(true);
  });

  it("returns true for a deeply nested path", () => {
    expect(isInNamespaces("/memories/a/b/c.md", namespaces)).toBe(true);
  });

  it("returns true for the namespace root itself", () => {
    expect(isInNamespaces("/memories/", namespaces)).toBe(true);
  });

  it("returns false for a path outside all namespaces", () => {
    expect(isInNamespaces("/private/secrets.md", namespaces)).toBe(false);
  });

  it("does not match by prefix collision", () => {
    expect(isInNamespaces("/memoriesfoo/x.md", ["/memories/"])).toBe(false);
  });

  it("returns false for root path", () => {
    expect(isInNamespaces("/", namespaces)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isInNamespaces("", namespaces)).toBe(false);
  });

  it("handles paths without leading slash", () => {
    expect(isInNamespaces("memories/foo.md", namespaces)).toBe(true);
  });

  it("returns false for empty namespaces list", () => {
    expect(isInNamespaces("/memories/foo.md", [])).toBe(false);
  });
});

describe("assertAccessible", () => {
  it("does not throw for accessible paths", () => {
    expect(() => assertAccessible("/memories/foo.md", "main-agent")).not.toThrow();
  });

  it("throws for paths outside the agent's namespaces", () => {
    expect(() => assertAccessible("/private/secrets.md", "main-agent")).toThrow(
      "Permission denied: /private/secrets.md",
    );
  });

  it("throws for unknown agent", () => {
    expect(() => assertAccessible("/memories/foo.md", "unknown")).toThrow(
      "unknown: agent does not exist in access table",
    );
  });
});
