import type { ParsedCommand } from "./parser.js";
import * as commands from "./commands.js";
import * as db from "./db.js";

/** Route a parsed command to its handler, applying redirects. */
export function execute(parsed: ParsedCommand): string {
  try {
    const output = dispatch(parsed);

    if (parsed.redirects.length > 0) {
      const target = parsed.redirects[0]!.target;
      db.upsert(target, output);
      return `Wrote to ${target}`;
    }

    return output;
  } catch (e) {
    return (e as Error).message;
  }
}

function dispatch(parsed: ParsedCommand): string {
  switch (parsed.command) {
    case "echo":
      return commands.echo(parsed.args);
    case "cat":
      return commands.cat(parsed.args[0] ?? "");
    case "ls":
      return commands.ls(parsed.args[0] ?? commands.getCwd());
    case "grep":
      return commands.grep(parsed.args);
    case "find":
      return commands.find(parsed.args);
    case "cd":
      return commands.cd(parsed.args[0] ?? "/");
    default:
      throw new Error(`${parsed.command}: command not found`);
  }
}
