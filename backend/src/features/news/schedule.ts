import type { ScheduledTask } from "../../lib/scheduler.js";
import { runNewsAgentForDaily } from "../../agents/news-agent/index.js";

export const newsSchedule: ScheduledTask = {
  name: "news-daily",
  expression: "0 6,18 * * *",
  timezone: "UTC",
  run: runNewsAgentForDaily,
};
