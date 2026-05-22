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
4. Background agents keep their own slices of the filesystem curated — a memory agent dedupes and organizes memories, a Jira agent maintains per-ticket comment context, a Slack agent captures thread context on `@`-mention.
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

## Integrations

External systems can push context into the filesystem via webhooks:

| Integration | Endpoint | Trigger | What it does |
|---|---|---|---|
| Jira | `POST /webhooks/jira/webhook` | Issue create/update + comment events | Writes `/jira/{KEY}/description.md`; a `jira-agent` curates `/jira/{KEY}/comments.md` from the full comment thread. |
| Slack | `POST /webhooks/slack/events` | `@`-mention in any channel the bot is in | A `slack-agent` reads the thread, persists relevant context across `/slack/`, `/jira/`, `/memories/`, and posts a short prose summary back in-thread. See [`docs/slack-integration.md`](docs/slack-integration.md). |

Both integrations are optional — the project boots without their env vars configured.

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
├── features/             # HTTP surfaces (routes + service + errors)
│   ├── chat/             # streaming agent chat + summarize
│   ├── files/            # file browse + directory listing + SSE
│   ├── jira/             # Jira webhook handler
│   ├── news/             # news endpoints
│   └── slack/            # Slack events webhook
├── agents/               # background workers (agent + tools + prompts)
│   ├── jira-agent/       # curates /jira/{KEY}/comments.md
│   ├── memory-agent/     # dedupes and organizes /memories/
│   ├── news-agent/       # maintains /news/
│   └── slack-agent/      # curates Slack threads across /slack/, /jira/, /memories/
├── lib/
│   ├── agents/           # shared Agent interface and runner
│   ├── commands/         # agent-facing filesystem command layer
│   ├── filesystem/       # SQLite-backed virtual fs + per-agent namespaces
│   ├── tools/            # shared filesystem tool factories
│   └── utils/            # formatting helpers
├── server.ts             # HTTP API (Hono)
└── cli.ts                # REPL

frontend/src/             # SvelteKit web app
```

## Roadmap

**Way more innovative stuff is coming soon...**