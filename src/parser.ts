export interface Redirect {
  type: ">";
  target: string;
}

export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  redirects: Redirect[];
}

/**
 * Parse a raw bash input string into a structured command object.
 * Uses just-bash for shell parsing and yargs-parser for flag extraction.
 * Extracts the command name, positional args, flags, and any `>` redirects.
 */
export function parse(input: string): ParsedCommand {
  throw new Error("Not implemented");
}
