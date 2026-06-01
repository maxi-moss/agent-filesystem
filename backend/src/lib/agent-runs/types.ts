export type ToolCategory = "read" | "search" | "write" | "memorize";

export type RunStatus = "running" | "done" | "failed";

export type TerminalStatus = Exclude<RunStatus, "running">;

export type NodeStatus = "active" | "done" | "error";

export interface RunNode {
  category: ToolCategory;
  label: string;
  status: NodeStatus;
  error?: string;
}

export interface AgentRun {
  id: string;
  agentName: string;
  status: RunStatus;
  nodes: RunNode[];
}

export const CATEGORY_LABELS: Record<ToolCategory, { present: string; past: string }> = {
  search: { present: "Searching for files…", past: "Searched for files" },
  read: { present: "Reading files…", past: "Read files" },
  write: { present: "Writing files…", past: "Wrote files" },
  memorize: { present: "Memorizing…", past: "Memorized" },
};
