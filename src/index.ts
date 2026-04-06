import { parse } from "./parser.js";
import { execute } from "./executor.js";

/**
 * Public API entry point. Takes a raw shell command string, parses it,
 * executes it against the virtual filesystem, and returns the output string.
 */
export function run(input: string): string {
  const parsed = parse(input);
  return execute(parsed);
}
