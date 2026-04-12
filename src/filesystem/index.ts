import { parseCommand } from "./parser.js";
import { execute } from "./executor.js";

export { init } from "./db.js";

/** Parse and execute a shell command against the virtual filesystem, as the given agent. */
export function run(input: string, agent: string): string {
  const parsed = parseCommand(input);
  return execute(parsed, agent);
}
