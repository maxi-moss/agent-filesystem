import { describe, it, expect } from "vitest";
import { parseCommand } from "../src/parser.js";

describe("parseCommand", () => {
  it("parses a simple command with one arg", () => {
    const result = parseCommand("ls /memories/");
    expect(result).toEqual({
      command: "ls",
      args: ["/memories/"],
      redirects: [],
    });
  });

  it("parses cat with a file path", () => {
    const result = parseCommand("cat /memories/mistakes/foo.md");
    expect(result).toEqual({
      command: "cat",
      args: ["/memories/mistakes/foo.md"],
      redirects: [],
    });
  });

  it("parses echo with quoted string and redirect", () => {
    const result = parseCommand('echo "hello world" > /memories/test.md');
    expect(result).toEqual({
      command: "echo",
      args: ["hello world"],
      redirects: [{ type: ">", target: "/memories/test.md" }],
    });
  });

  it("parses single-quoted strings", () => {
    const result = parseCommand("echo 'single quotes' > /memories/test.md");
    expect(result).toEqual({
      command: "echo",
      args: ["single quotes"],
      redirects: [{ type: ">", target: "/memories/test.md" }],
    });
  });

  it("parses grep with flags", () => {
    const result = parseCommand('grep -i "pattern" /memories/');
    expect(result).toEqual({
      command: "grep",
      args: ["-i", "pattern", "/memories/"],
      redirects: [],
    });
  });

  it("parses find with -name flag", () => {
    const result = parseCommand('find /memories/ -name "*.md"');
    expect(result).toEqual({
      command: "find",
      args: ["/memories/", "-name", "*.md"],
      redirects: [],
    });
  });

  it("throws on empty input", () => {
    expect(() => parseCommand("")).toThrow();
  });

  it("throws on unsupported shell syntax", () => {
    expect(() => parseCommand("echo $HOME")).toThrow("Unsupported shell syntax");
  });
});
