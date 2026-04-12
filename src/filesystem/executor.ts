import type { ParsedCommand } from "./parser.js";
import * as commands from "./commands.js";

/** Route a parsed command to its handler, applying redirects. */
export function execute(parsed: ParsedCommand, agent: string): string {
  try {
    const output = dispatch(parsed, agent);

    if (parsed.redirect !== undefined) {
      return commands.write(parsed.redirect, output, agent);
    }

    return output;
  } catch (e) {
    return (e as Error).message;
  }
}

function dispatch(parsed: ParsedCommand, agent: string): string {
  switch (parsed.command) {
    case "echo":
      return commands.echo(parsed.args);
    case "cat":
      return commands.cat(parsed.args[0] ?? "", agent);
    case "ls":
      return commands.ls(parsed.args[0] ?? commands.getCwd(), agent);
    case "grep":
      return commands.grep(parsed.args, agent);
    case "find":
      return commands.find(parsed.args, agent);
    case "cd":
      return commands.cd(parsed.args[0] ?? "/", agent);
    default:
      throw new Error(`${parsed.command}: command not found`);
  }
}
