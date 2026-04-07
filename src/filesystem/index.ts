import { parseCommand } from "./parser.js";
import { execute } from "./executor.js";

export { init } from "./db.js";

/** Parse and execute a shell command against the virtual filesystem. */
export function run(input: string): string {
  const parsed = parseCommand(input);
  return execute(parsed);
}
