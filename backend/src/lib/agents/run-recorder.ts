import type { StepResult, ToolSet } from "ai";
import type { Agent } from "./types.js";
import { getRunTracker, type ToolCategory, type TerminalStatus } from "../agent-runs/index.js";

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  cat: "read",
  ls: "search",
  cd: "search",
  find: "search",
  grep: "search",
  write: "write",
  memorize: "memorize",
};

export interface RunRecorder {
  step(step: StepResult<ToolSet>): void;
  finish(status: TerminalStatus): void;
}

const noopRecorder: RunRecorder = { step: () => {}, finish: () => {} };

/**
 * Build the observability recorder for a run. With no `runId` the run is
 * unobserved and the recorder is a no-op, so the runner can record steps and
 * completion unconditionally. Otherwise it opens the run and translates each
 * agent step's tool calls and errors into run-tracker events.
 */
export function createRecorder(agent: Agent, runId: string | undefined): RunRecorder {
  if (!runId) return noopRecorder;
  const tracker = getRunTracker();
  tracker.createRun(runId, agent.name);
  return {
    step: (step) => recordStep(tracker, runId, step),
    finish: (status) => tracker.finishRun(runId, status),
  };
}

function recordStep(
  tracker: ReturnType<typeof getRunTracker>,
  runId: string,
  step: StepResult<ToolSet>,
): void {
  for (const part of step.content) {
    if (part.type === "tool-call") {
      const category = TOOL_CATEGORIES[part.toolName];
      if (category) tracker.recordTool(runId, category);
    } else if (part.type === "tool-error") {
      const message = part.error instanceof Error ? part.error.message : String(part.error);
      tracker.recordError(runId, message);
    }
  }
}
