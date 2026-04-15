# agent-filesystem

A persistent memory store for AI agents. Agents interact with a virtual Unix-like filesystem using familiar commands (`cat`, `ls`, `grep`, `find`, `cd`, `write`), backed by SQLite — no real files on disk. Includes an HTTP API and a web frontend.

## Why

LLM agents lose context between sessions. This gives them a simple, durable memory layer they already know how to use: a filesystem.

## Quick start

```bash
./setup.sh            # Install dependencies and build
cp .env.example .env  # Create env file (fill in your API keys manually)
pnpm dev:backend      # Start REPL
pnpm dev:api          # Start API server
pnpm dev:frontend     # Start frontend
```

## How it works

1. A user sends messages via the REPL or the web frontend.
2. The main agent has filesystem tools it can call to persist and retrieve information.
3. All file operations go through a virtual filesystem (SQLite — no real files on disk).
4. A memory agent runs in the background to deduplicate and organize stored memories.
5. On session end, the conversation is summarized and saved for future context.

## Supported commands

| Command | Example | Description |
|---------|---------|-------------|
| `cat`   | `cat /notes/todo.md` | Read a file |
| `ls`    | `ls /notes` | List directory contents |
| `cd`    | `cd /notes` | Change working directory |
| `grep`  | `grep -i "meeting" /notes` | Search file contents (`-i`, `-l` flags) |
| `find`  | `find / -name "*.md"` | Find files by name pattern |
| `write` | `write /notes/todo.md "buy milk"` | Create or overwrite a file |

## Scripts

```bash
pnpm dev:backend    # Run CLI in development mode
pnpm dev:api        # Start API server
pnpm dev:frontend   # Start frontend dev server
pnpm build          # Compile TypeScript
pnpm test           # Run all tests
pnpm test:backend   # Run backend tests only
```

## Architecture

```
backend/src/
├── features/
│   ├── chat/             # streaming agent chat + summarize
│   ├── memory-agent/     # fire-and-forget memory management
│   └── files/            # file browse + directory listing + SSE
├── lib/
│   ├── filesystem/       # Filesystem class (SQLite-backed virtual fs)
│   └── ...               # config, shared utilities
├── server.ts             # HTTP API (Hono)
└── cli.ts                # REPL

frontend/src/             # SvelteKit web app
```

## Roadmap

**Way more innovative stuff is coming soon...**