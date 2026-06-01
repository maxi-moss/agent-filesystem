import {
  runEventsUrl,
  triggerAgentRun,
  type AgentRun,
  type RunNode,
} from "$lib/shared/api/agentRuns.js";

export interface DisplayNode extends RunNode {
  id: string;
}

class AgentRunStore {
  snapshot = $state<AgentRun | null>(null);
  status = $state<"idle" | "running" | "done" | "failed">("idle");
  prompt = $state("");
  private eventSource: EventSource | null = null;

  nodes = $derived.by<DisplayNode[]>(() => {
    const snapshot = this.snapshot;
    if (!snapshot) return [];
    const nodes: DisplayNode[] = snapshot.nodes.map((node, index) => ({
      ...node,
      id: String(index),
    }));
    if (snapshot.status === "done")
      nodes.push({ id: "terminal", category: "read", label: "Done", status: "done" });
    if (snapshot.status === "failed")
      nodes.push({ id: "terminal", category: "read", label: "Failed", status: "error" });
    return nodes;
  });

  async start() {
    const text = this.prompt.trim();
    if (!text || this.status === "running") return;
    const runId = crypto.randomUUID();
    this.reset();
    this.status = "running";
    this.connect(runId);
    try {
      await triggerAgentRun(runId, text);
    } catch {
      this.status = "failed";
    }
  }

  private reset() {
    this.eventSource?.close();
    this.eventSource = null;
    this.snapshot = null;
  }

  private connect(runId: string) {
    const source = new EventSource(runEventsUrl(runId));
    this.eventSource = source;
    source.addEventListener("run", (event) => {
      const snapshot = JSON.parse((event as MessageEvent).data) as AgentRun;
      this.snapshot = snapshot;
      this.status = snapshot.status;
      if (snapshot.status !== "running") {
        source.close();
        this.eventSource = null;
      }
    });
  }

  destroy() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}

export const agentRunStore = new AgentRunStore();
