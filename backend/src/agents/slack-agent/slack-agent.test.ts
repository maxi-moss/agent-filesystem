import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postSlackMessage: vi.fn<(channel: string, threadTs: string, text: string) => Promise<void>>(),
}));

vi.mock("../../features/slack/api.js", () => ({
  postSlackMessage: mocks.postSlackMessage,
}));

vi.mock("../../lib/tools/filesystem-tools.js", () => ({
  filesystemTools: {
    cat: () => ({ kind: "fs-tool", name: "cat" }),
    ls: () => ({ kind: "fs-tool", name: "ls" }),
    find: () => ({ kind: "fs-tool", name: "find" }),
    grep: () => ({ kind: "fs-tool", name: "grep" }),
    write: () => ({ kind: "fs-tool", name: "write" }),
  },
}));

import { createSlackTools } from "./tools.js";

type ExecutableTool = {
  execute: (input: { text: string }) => Promise<unknown>;
};

beforeEach(() => {
  mocks.postSlackMessage.mockReset();
  mocks.postSlackMessage.mockResolvedValue(undefined);
});

describe("createSlackTools", () => {
  it("exposes the filesystem tool set plus replyToSlack", () => {
    const tools = createSlackTools({ channel: "C1", threadTs: "1.0" });
    expect(Object.keys(tools).sort()).toEqual(
      ["cat", "find", "grep", "ls", "replyToSlack", "write"].sort(),
    );
  });

  it("replyToSlack posts to the channel and threadTs captured in the closure", async () => {
    const tools = createSlackTools({ channel: "C-alpha", threadTs: "111.222" });
    const reply = tools.replyToSlack as unknown as ExecutableTool;

    const result = (await reply.execute({ text: "all done" })) as {
      ok: boolean;
      output: string;
    };

    expect(result).toEqual({ ok: true, output: "Reply posted." });
    expect(mocks.postSlackMessage).toHaveBeenCalledExactlyOnceWith(
      "C-alpha",
      "111.222",
      "all done",
    );
  });

  it("isolates parallel invocations: each closure posts to its own thread", async () => {
    const toolsA = createSlackTools({ channel: "C-A", threadTs: "1.0" });
    const toolsB = createSlackTools({ channel: "C-B", threadTs: "2.0" });
    const replyA = toolsA.replyToSlack as unknown as ExecutableTool;
    const replyB = toolsB.replyToSlack as unknown as ExecutableTool;

    await Promise.all([
      replyA.execute({ text: "from A" }),
      replyB.execute({ text: "from B" }),
    ]);

    expect(mocks.postSlackMessage).toHaveBeenCalledTimes(2);
    expect(mocks.postSlackMessage).toHaveBeenCalledWith("C-A", "1.0", "from A");
    expect(mocks.postSlackMessage).toHaveBeenCalledWith("C-B", "2.0", "from B");
  });

  it("returns an error result when postSlackMessage rejects", async () => {
    mocks.postSlackMessage.mockRejectedValueOnce(new Error("not_in_channel"));
    const tools = createSlackTools({ channel: "C1", threadTs: "1.0" });
    const reply = tools.replyToSlack as unknown as ExecutableTool;

    const result = (await reply.execute({ text: "boom" })) as {
      ok: boolean;
      error: string;
    };

    expect(result).toEqual({ ok: false, error: "not_in_channel" });
  });
});
