import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getRunTracker, type AgentRun } from "../../lib/agent-runs/index.js";

export const agentObservabilityRoutes = new Hono();

agentObservabilityRoutes.get("/runs/:id/events", (context) => {
  const runId = context.req.param("id");
  return streamSSE(context, async (stream) => {
    const tracker = getRunTracker();
    const send = (run: AgentRun) => stream.writeSSE({ event: "run", data: JSON.stringify(run) });

    const current = tracker.getRun(runId);
    if (current) await send(current);

    const unsubscribe = tracker.subscribe(runId, (run) => void send(run));
    stream.onAbort(unsubscribe);

    while (true) {
      await stream.sleep(30000);
    }
  });
});
