import { EventEmitter } from "node:events";
import {
  CATEGORY_LABELS,
  type AgentRun,
  type RunNode,
  type ToolCategory,
  type TerminalStatus,
} from "./types.js";

export class RunTracker {
  private runs = new Map<string, AgentRun>();
  private emitter = new EventEmitter();

  /**
   * Subscribe to snapshots of a single run. The listener fires with the full
   * current run on every change. Returns an unsubscribe function.
   */
  subscribe(runId: string, listener: (run: AgentRun) => void): () => void {
    const handler = (run: AgentRun) => {
      if (run.id === runId) listener(run);
    };
    this.emitter.on("change", handler);
    return () => this.emitter.off("change", handler);
  }

  /**
   * Open a run, discarding any prior state for the same id.
   */
  createRun(runId: string, agentName: string): void {
    const run: AgentRun = { id: runId, agentName, status: "running", nodes: [] };
    this.runs.set(runId, run);
    this.emit(run);
  }

  /**
   * Record that a tool of the given category ran. A contiguous run of
   * same-category calls coalesces into a single node.
   */
  recordTool(runId: string, category: ToolCategory): void {
    const run = this.runs.get(runId);
    if (!run) return;
    if (this.openNode(run)?.category === category) return;
    this.closeOpenNode(run);
    run.nodes.push({ category, label: CATEGORY_LABELS[category].present, status: "active" });
    this.emit(run);
  }

  /**
   * Annotate the open node with a tool error.
   */
  recordError(runId: string, error: string): void {
    const run = this.runs.get(runId);
    const openNode = run && this.openNode(run);
    if (!run || !openNode) return;
    openNode.status = "error";
    openNode.error = error;
    this.emit(run);
  }

  /**
   * Close the run. Idempotent once the run is no longer running.
   */
  finishRun(runId: string, status: TerminalStatus): void {
    const run = this.runs.get(runId);
    if (!run || run.status !== "running") return;
    this.closeOpenNode(run);
    run.status = status;
    this.emit(run);
  }

  getRun(runId: string): AgentRun | undefined {
    return this.runs.get(runId);
  }

  private openNode(run: AgentRun): RunNode | undefined {
    const last = run.nodes[run.nodes.length - 1];
    return last && last.status !== "done" ? last : undefined;
  }

  private closeOpenNode(run: AgentRun): void {
    const openNode = this.openNode(run);
    if (openNode?.status === "active") {
      openNode.status = "done";
      openNode.label = CATEGORY_LABELS[openNode.category].past;
    }
  }

  private emit(run: AgentRun): void {
    this.emitter.emit("change", run);
  }
}

let instance: RunTracker | null = null;

/**
 * Create the global run tracker. Call once at startup.
 */
export function createRunTracker(): RunTracker {
  instance = new RunTracker();
  return instance;
}

/**
 * Get the global run tracker. Throws if not yet created.
 */
export function getRunTracker(): RunTracker {
  if (!instance) throw new Error("RunTracker not initialized — call createRunTracker() first");
  return instance;
}
