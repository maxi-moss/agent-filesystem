import type { ParsedCommand } from "./parser.js";

/**
 * Execute a parsed command by routing it to the appropriate handler.
 * If the command has a `>` redirect, captures the handler's output string
 * and writes it to the redirect target path via db.upsert.
 * Returns the command output, or a confirmation message if redirected to a file.
 */
export function execute(parsed: ParsedCommand): string {
  throw new Error("Not implemented");
}
