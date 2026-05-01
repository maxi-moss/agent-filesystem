import cron from "node-cron";

export type ScheduledTask = {
  name: string;
  expression: string;
  timezone?: string;
  run: () => void;
};

export function startSchedules(
  tasks: readonly ScheduledTask[],
  enabled: Record<string, boolean>,
): void {
  for (const task of tasks) {
    if (!enabled[task.name]) continue;
    const options = task.timezone ? { timezone: task.timezone } : {};
    cron.schedule(task.expression, task.run, options);
  }
}
