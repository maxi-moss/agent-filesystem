import { describe, it, expect } from "vitest";
import type { ModelMessage } from "ai";
import { formatConversationForSummary } from "./formatting.js";

describe("formatConversationForSummary", () => {
  it("formats string content messages", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "USER:\nhello\n\nASSISTANT:\nhi there",
    );
  });

  it("skips messages with empty string content", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "  " },
      { role: "user", content: "still here" },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "USER:\nhello\n\nUSER:\nstill here",
    );
  });

  it("formats text parts from array content", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [{ type: "text", text: "thinking out loud" }],
      },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "ASSISTANT:\nthinking out loud",
    );
  });

  it("formats tool-call parts", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "cat",
            input: { path: "/notes.md" },
          },
        ],
      },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      'ASSISTANT:\n[tool-call cat] {"path":"/notes.md"}',
    );
  });

  it("formats tool-result parts with string value", () => {
    const messages: ModelMessage[] = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "1",
            toolName: "cat",
            output: { type: "text", value: "file contents" },
          },
        ],
      },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "TOOL:\n[tool-result cat] file contents",
    );
  });

  it("formats tool-result parts with object value as JSON", () => {
    const messages: ModelMessage[] = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "1",
            toolName: "ls",
            output: { type: "json", value: { ok: true, output: "a/\nb/" } },
          },
        ],
      },
    ];
    const result = formatConversationForSummary(messages);
    expect(result).toContain("[tool-result ls]");
    expect(result).toContain('"ok":true');
  });

  it("formats execution-denied tool results", () => {
    const messages: ModelMessage[] = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "1",
            toolName: "write",
            output: { type: "execution-denied", reason: "user rejected" },
          },
        ],
      },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "TOOL:\n[tool-result write] execution denied: user rejected",
    );
  });

  it("formats execution-denied without reason", () => {
    const messages: ModelMessage[] = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "1",
            toolName: "write",
            output: { type: "execution-denied" },
          },
        ],
      },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "TOOL:\n[tool-result write] execution denied",
    );
  });

  it("filters out irrelevant part types", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "internal thought" } as never,
          { type: "text", text: "visible answer" },
        ],
      },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "ASSISTANT:\nvisible answer",
    );
  });

  it("skips array-content messages where all parts are irrelevant", () => {
    const messages: ModelMessage[] = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: [{ type: "reasoning", text: "hmm" } as never],
      },
      { role: "user", content: "world" },
    ];
    expect(formatConversationForSummary(messages)).toBe(
      "USER:\nhello\n\nUSER:\nworld",
    );
  });

  it("returns empty string for empty messages array", () => {
    expect(formatConversationForSummary([])).toBe("");
  });

  it("combines multiple parts in a single message", () => {
    const messages: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me check" },
          {
            type: "tool-call",
            toolCallId: "1",
            toolName: "ls",
            input: { path: "/" },
          },
        ],
      },
    ];
    const result = formatConversationForSummary(messages);
    expect(result).toBe(
      'ASSISTANT:\nLet me check\n[tool-call ls] {"path":"/"}',
    );
  });
});
