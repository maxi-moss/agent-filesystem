export type ToolCategory = "read" | "search" | "write" | "memorize";
export type NodeStatus = "active" | "done" | "error";
export type RunStatus = "running" | "done" | "failed";

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

export function runEventsUrl(runId: string): string {
  return `/api/agent-observability/runs/${runId}/events`;
}

/**
 * Trigger a main-agent run. The agent only makes progress while its response
 * stream is consumed, so we drain and discard the body — the flowchart is
 * driven entirely by the SSE snapshot stream, not this response.
 */
export async function triggerAgentRun(runId: string, prompt: string): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runId,
      messages: [{ id: runId, role: "user", parts: [{ type: "text", text: prompt }] }],
    }),
  });
  if (!response.ok || !response.body) throw new Error("Failed to start agent run");
  const reader = response.body.getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) break;
  }
}
