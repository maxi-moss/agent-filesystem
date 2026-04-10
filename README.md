# agent-filesystem

A persistent memory store for AI agents. Agents interact with a virtual Unix-like filesystem using familiar bash commands (`cat`, `ls`, `grep`, `find`, `cd`, `echo > path`), backed by SQLite — no real files on disk.

## Why

LLM agents lose context between sessions. This gives them a simple, durable memory layer they already know how to use: a filesystem.

## Quick start

```bash
./setup.sh            # Install dependencies and build
cp .env.example .env  # Create env file (fill in your API keys manually)
pnpm dev              # Start REPL
```

## How it works

1. A REPL accepts user input and forwards it to an LLM agent.
2. The agent has filesystem tools it can call to persist and retrieve information.
3. All file operations go through a virtual filesystem stored in SQLite.
4. On exit, the conversation is summarized and saved for future context.

## Supported commands

| Command | Example | Description |
|---------|---------|-------------|
| `cat`   | `cat /notes/todo.md` | Read a file |
| `ls`    | `ls /notes` | List directory contents |
| `cd`    | `cd /notes` | Change working directory |
| `grep`  | `grep -i "meeting" /notes` | Search file contents (`-i`, `-l` flags) |
| `find`  | `find / -name "*.md"` | Find files by name pattern |
| `echo`  | `echo hello > /greet.txt` | Output text (supports `>` redirect) |
| `write` | *(agent tool)* | Create or overwrite a file |

## Scripts

```bash
pnpm dev      # Run in development mode
pnpm build    # Compile TypeScript
pnpm test     # Run tests
```

## Architecture

```
User input → Parser (bash syntax) → Executor → Command handlers → SQLite
```

- **Parser** — tokenizes bash input into structured commands using `just-bash`
- **Executor** — dispatches commands and handles output redirection
- **Commands** — implements each filesystem operation against the virtual DB
- **Agent** — orchestrates LLM tool use via the `ai` SDK

## Roadmap

**Way more innovative stuff is coming soon...**