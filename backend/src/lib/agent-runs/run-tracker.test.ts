import { describe, it, expect, beforeEach } from "vitest";
import { RunTracker } from "./run-tracker.js";
import type { AgentRun } from "./types.js";

let tracker: RunTracker;

beforeEach(() => {
  tracker = new RunTracker();
});

describe("run lifecycle", () => {
  it("opens a run with running status and no nodes", () => {
    tracker.createRun("r1", "main-agent");
    const run = tracker.getRun("r1");
    expect(run?.status).toBe("running");
    expect(run?.nodes).toEqual([]);
  });

  it("coalesces consecutive same-category tool calls into one node", () => {
    tracker.createRun("r1", "main-agent");
    tracker.recordTool("r1", "read");
    tracker.recordTool("r1", "read");
    tracker.recordTool("r1", "read");
    expect(tracker.getRun("r1")?.nodes).toHaveLength(1);
  });

  it("closes the open node in past tense and opens a new one on category change", () => {
    tracker.createRun("r1", "main-agent");
    tracker.recordTool("r1", "read");
    tracker.recordTool("r1", "write");
    const nodes = tracker.getRun("r1")!.nodes;
    expect(nodes.map((node) => node.status)).toEqual(["done", "active"]);
    expect(nodes[0]!.label).toBe("Read files");
    expect(nodes[1]!.label).toBe("Writing files…");
  });

  it("annotates the open node with a tool error", () => {
    tracker.createRun("r1", "main-agent");
    tracker.recordTool("r1", "read");
    tracker.recordError("r1", "boom");
    const node = tracker.getRun("r1")!.nodes[0]!;
    expect(node.status).toBe("error");
    expect(node.error).toBe("boom");
  });

  it("finishes a run: closes the open node and sets terminal status", () => {
    tracker.createRun("r1", "main-agent");
    tracker.recordTool("r1", "write");
    tracker.finishRun("r1", "done");
    const run = tracker.getRun("r1")!;
    expect(run.status).toBe("done");
    expect(run.nodes[0]!.status).toBe("done");
    expect(run.nodes[0]!.label).toBe("Wrote files");
  });

  it("is idempotent on a second finishRun", () => {
    tracker.createRun("r1", "main-agent");
    tracker.finishRun("r1", "done");
    tracker.finishRun("r1", "failed");
    expect(tracker.getRun("r1")?.status).toBe("done");
  });

  it("resets prior state when a runId is reused", () => {
    tracker.createRun("r1", "main-agent");
    tracker.recordTool("r1", "read");
    tracker.createRun("r1", "main-agent");
    expect(tracker.getRun("r1")?.nodes).toEqual([]);
  });

  it("notifies subscribers with the current snapshot on each change", () => {
    const snapshots: AgentRun[] = [];
    tracker.subscribe("r1", (run) => snapshots.push(structuredClone(run)));
    tracker.createRun("r1", "main-agent");
    tracker.recordTool("r1", "read");
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]!.nodes).toHaveLength(0);
    expect(snapshots[1]!.nodes).toHaveLength(1);
  });

  it("only notifies subscribers for the matching run", () => {
    const snapshots: AgentRun[] = [];
    tracker.subscribe("r1", (run) => snapshots.push(run));
    tracker.createRun("r2", "main-agent");
    expect(snapshots).toHaveLength(0);
  });
});
